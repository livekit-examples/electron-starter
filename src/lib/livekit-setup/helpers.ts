/**
 * Standalone LiveKit helpers for the Electron **main process**.
 *
 * Drop this `livekit-setup` folder into any Electron app to get LiveKit token
 * minting, media permissions, and `getDisplayMedia`-based screen sharing wired
 * up. The heavy imports (`livekit-server-sdk`) stay in this
 * main-process module; the IPC channel name lives in the dependency-free
 * `constants.ts` so the preload can import it without pulling them in.
 *
 * @see https://www.electronjs.org/docs/latest/api/desktop-capturer
 */
import { desktopCapturer, systemPreferences, type Session } from "electron";
import { randomUUID } from "node:crypto";
import {
  AccessToken,
  type VideoGrant,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";
import type {
  TokenSourceFetchOptions,
  TokenSourceResponseObject,
} from "livekit-client";

export interface CreateTokenOptions {
  /** Token lifetime, e.g. `'15m'` or a number of seconds. Defaults to `'15m'`. */
  ttl?: string | number;
}

// Read from the environment (the main process loads these via `dotenv/config`).
// The API secret never leaves the main process.
const credentials = {
  url: process.env.LIVEKIT_URL ?? "",
  apiKey: process.env.LIVEKIT_API_KEY ?? "",
  apiSecret: process.env.LIVEKIT_API_SECRET ?? "",
};

/**
 * Mints a LiveKit access token. Run this in the main process so the API secret
 * never reaches the renderer — wire it to the renderer's `TokenSource.custom`
 * over IPC (see `GET_TOKEN_CHANNEL`).
 */
export async function createLiveKitToken(
  request: TokenSourceFetchOptions,
  options: CreateTokenOptions = {},
): Promise<TokenSourceResponseObject> {
  const { url, apiKey, apiSecret } = credentials;
  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit credentials. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your .env file.",
    );
  }

  const identity = request.participantIdentity ?? `user-${randomUUID()}`;
  const roomName = request.roomName ?? `room-${randomUUID()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: request.participantName,
    metadata: request.participantMetadata,
    attributes: request.participantAttributes,
    ttl: options.ttl ?? "15m",
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  // For explicit agent dispatch, embed the agent name so LiveKit dispatches it
  // when the participant joins. Omit for agents that use automatic dispatch.
  if (request.agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: request.agentName,
          metadata: request.agentMetadata,
        }),
      ],
    });
  }

  return { serverUrl: url, participantToken: await at.toJwt() };
}

/**
 * Grants the renderer access to microphone/camera so LiveKit can capture them.
 * Call once per `session` (e.g. `mainWindow.webContents.session`).
 */
export function grantMediaPermissions(session: Session): void {
  session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media");
  });
  session.setPermissionCheckHandler(
    (_wc, permission) => permission === "media",
  );
}

export interface ScreenShareOptions {
  /**
   * Use the native macOS screen picker (macOS 15+). When available the request
   * handler below is not invoked and the OS handles source selection. Defaults
   * to `true`. Has no effect on other platforms.
   */
  useSystemPicker?: boolean;
}

/**
 * Wires up screen sharing for a `session`. LiveKit's screen-share track calls
 * `navigator.mediaDevices.getDisplayMedia()` in the renderer, which does
 * nothing in Electron until a display-media request handler is provided.
 *
 * On macOS 15+ the native system picker is used; on other platforms this falls
 * back to `desktopCapturer` and grants the primary screen.
 */
export function enableScreenShare(
  session: Session,
  options: ScreenShareOptions = {},
): void {
  session.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen", "window"] })
        .then((sources) => {
          const source = sources[0];
          if (!source) {
            // No shareable source available; deny the request.
            callback({});
            return;
          }
          callback({
            video: source,
            // System-audio loopback is only supported on Windows.
            audio:
              request.audioRequested && process.platform === "win32"
                ? "loopback"
                : undefined,
          });
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: options.useSystemPicker ?? true },
  );
}

/**
 * On macOS, prompts for microphone access up front so capture works on first
 * use. No-op on other platforms. Resolves regardless of the user's choice.
 */
export async function requestMicrophoneAccess(): Promise<void> {
  if (process.platform === "darwin") {
    await systemPreferences
      .askForMediaAccess("microphone")
      .catch(() => undefined);
  }
}
