> [!WARNING]
> This example is archived and no longer maintained. For current examples, see [agent-starter-react](https://github.com/livekit-examples/agent-starter-react).

# LiveKit Voice AI Agent — Electron Starter

A minimal desktop starter for building voice AI apps with [LiveKit](https://livekit.io) and [Electron](https://www.electronjs.org). It connects to a LiveKit room, talks to your voice agent, and ships with a ready-made agent UI — audio visualizers, a live transcript, and a mic/screen-share control bar.

The LiveKit API secret stays in the Electron **main process**: tokens are minted there and passed to the renderer over IPC, so credentials never reach the browser context.

## Features

- 🎙️ Real-time voice conversation with a LiveKit agent
- 🔒 Secure token minting in the main process (API secret never exposed to the renderer)
- 📊 Multiple agent audio visualizers (bar, wave, grid, radial, aura)
- 💬 Live chat transcript and agent state indicator
- 🖥️ Microphone capture and screen sharing wired up for Electron (native macOS screen picker on macOS 15+)
- ⚡ Built with Electron Forge + Vite, React 19, Tailwind CSS 4, and Radix UI

## Prerequisites

- [Node.js](https://nodejs.org) 18+ and [pnpm](https://pnpm.io)
- A [LiveKit Cloud](https://cloud.livekit.io) project (or a self-hosted server)
- A running LiveKit voice agent to connect to — see the [Agents docs](https://docs.livekit.io/agents/)

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure credentials**

   Copy the example env file and fill in your LiveKit project values (found in the LiveKit Cloud dashboard under **Settings › Keys**):

   ```bash
   cp .env.example .env
   ```

   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

3. **Run the app**

   ```bash
   pnpm start
   ```

   Click **Start conversation** to connect and begin talking to your agent.

## Agent dispatch

By default the app uses **automatic dispatch** — your agent joins every room automatically. To use **explicit dispatch** instead, set your agent's name in [src/App.tsx](src/App.tsx):

```ts
const AGENT_NAME = "my-agent";
```

The name is embedded in the access token so LiveKit dispatches that agent when the participant joins.

## How it works

- **Main process** ([src/main.ts](src/main.ts)) — creates the window, grants media permissions, enables screen sharing, and handles the token IPC request.
- **Token minting** ([src/lib/livekit-setup/helpers.ts](src/lib/livekit-setup/helpers.ts)) — uses `livekit-server-sdk` to create access tokens. Reads credentials from `.env`; the API secret stays here.
- **Preload** ([src/preload.ts](src/preload.ts)) — exposes `window.livekit.getToken()` to the renderer over a context bridge.
- **Renderer** ([src/App.tsx](src/App.tsx)) — a `TokenSource.custom` calls the preload API, and `@livekit/components-react` drives the session and UI.

The `src/lib/livekit-setup/` folder is self-contained — drop it into any Electron app to wire up LiveKit token minting, media permissions, and screen sharing.

## Reusable LiveKit setup helpers

The [src/lib/livekit-setup/](src/lib/livekit-setup/) folder is a dependency-light, drop-in module for adding LiveKit capabilities to any Electron app. Copy the folder into your project — the heavy `livekit-server-sdk` imports stay in the main-process module, while the IPC channel name lives in a separate dependency-free `constants.ts` so your preload can import it without pulling them in.

Requires `livekit-server-sdk` and `livekit-client` as dependencies, plus `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in the main process environment (this starter loads them via `dotenv/config`).

### `createLiveKitToken(request, options?)`

Mints a LiveKit access token. Run it in the **main process** so the API secret never reaches the renderer. `request` is livekit-client's `TokenSourceFetchOptions`; if `request.agentName` is set, the token embeds an explicit agent dispatch. `options.ttl` sets the token lifetime (defaults to `'15m'`).

### `grantMediaPermissions(session)`

Grants the renderer microphone/camera access so LiveKit can capture them. Call once per Electron `session` (e.g. `mainWindow.webContents.session`).

### `enableScreenShare(session, options?)`

Wires up `navigator.mediaDevices.getDisplayMedia()` for screen-share tracks, which does nothing in Electron without a display-media request handler. Uses the native macOS system picker on macOS 15+ (`options.useSystemPicker`, default `true`) and falls back to `desktopCapturer` elsewhere. System-audio loopback is captured on Windows.

### `requestMicrophoneAccess()`

On macOS, prompts for microphone access up front so capture works on first use. No-op on other platforms.

### `GET_TOKEN_CHANNEL`

The IPC channel name shared between main and preload for token requests. Exported from `constants.ts` so it can be imported without the server SDK.

### Wiring it up

```ts
// main process
import { ipcMain } from "electron";
import {
  createLiveKitToken,
  enableScreenShare,
  grantMediaPermissions,
  requestMicrophoneAccess,
} from "./lib/livekit-setup/helpers";
import { GET_TOKEN_CHANNEL } from "./lib/livekit-setup/constants";

app.on("ready", async () => {
  ipcMain.handle(GET_TOKEN_CHANNEL, (_e, request) => createLiveKitToken(request));
  await requestMicrophoneAccess();

  const win = new BrowserWindow({ webPreferences: { preload } });
  grantMediaPermissions(win.webContents.session);
  enableScreenShare(win.webContents.session);
});
```

```ts
// preload — expose token minting to the renderer
import { contextBridge, ipcRenderer } from "electron";
import { GET_TOKEN_CHANNEL } from "./lib/livekit-setup/constants";

contextBridge.exposeInMainWorld("livekit", {
  getToken: (request) => ipcRenderer.invoke(GET_TOKEN_CHANNEL, request),
});
```

```ts
// renderer — feed it into a LiveKit TokenSource
import { TokenSource } from "livekit-client";

const tokenSource = TokenSource.custom((options) => window.livekit.getToken(options));
```

## Customizing the UI

Swap the audio visualizer by changing the `audioVisualizerType` prop in [src/App.tsx](src/App.tsx):

```tsx
<AgentSessionView_01 audioVisualizerType="bar" />
```

Available types: `bar`, `wave`, `grid`, `radial`, `aura`. Agent UI components live in [src/components/agents-ui/](src/components/agents-ui/).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start` | Run the app in development with hot reload |
| `pnpm package` | Package the app for the current platform |
| `pnpm make` | Build distributable installers (deb, rpm, squirrel, zip) |
| `pnpm lint` | Lint the source with ESLint |

## License

Apache-2.0
