/**
 * IPC channel shared between the Electron main process (token generation) and
 * the renderer (LiveKit `TokenSource.custom`). The request/response payloads are
 * livekit-client's own `TokenSourceFetchOptions` / `TokenSourceResponseObject`,
 * so there are no app-specific types to maintain here.
 */
export const GET_TOKEN_CHANNEL = "livekit:get-token";
