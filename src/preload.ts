// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import {
  TokenSourceFetchOptions,
  TokenSourceResponseObject,
  setLogLevel,
} from "livekit-client";
import { GET_TOKEN_CHANNEL } from "./lib/livekit-setup/constants";

/**
 * The API exposed to the renderer on `window.livekit`. Token generation runs in
 * the main process so the LiveKit API secret is never exposed to the renderer.
 */
const livekitApi = {
  getToken: (
    request: TokenSourceFetchOptions,
  ): Promise<TokenSourceResponseObject> =>
    ipcRenderer.invoke(GET_TOKEN_CHANNEL, request),
};

export type LiveKitApi = typeof livekitApi;

setLogLevel("debug");

contextBridge.exposeInMainWorld("livekit", livekitApi);
