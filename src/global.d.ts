import type { LiveKitApi } from './preload';

declare global {
  interface Window {
    /** LiveKit token bridge exposed by the preload script. */
    livekit: LiveKitApi;
  }
}

export {};
