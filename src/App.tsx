import { useCallback, useState } from "react";
import { TokenSource } from "livekit-client";
import { useSession, useSessionContext } from "@livekit/components-react";
import { AgentSessionProvider } from "@/components/agents-ui/agent-session-provider";
import { AgentSessionView_01 } from "@/components/agents-ui/blocks/agent-session-view-01";
import { StartAudioButton } from "@/components/agents-ui/start-audio-button";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import { Button } from "@/components/ui/button";

/**
 * Set this to your agent's name to use explicit dispatch. Leave empty if your
 * agent uses automatic dispatch (joins every room automatically).
 */
const AGENT_NAME = "";
1;
/**
 * A custom TokenSource that fetches credentials from the Electron main process
 * over IPC, so the LiveKit API secret stays out of the renderer.
 */
const tokenSource = TokenSource.custom((options) =>
  window.livekit.getToken(options),
);

export default function App() {
  const session = useSession(
    tokenSource,
    AGENT_NAME ? { agentName: AGENT_NAME } : undefined,
  );

  return (
    <TooltipProvider>
      <AgentSessionProvider session={session}>
        <SessionUI />
      </AgentSessionProvider>
    </TooltipProvider>
  );
}

function SessionUI() {
  const session = useSessionContext();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      await session.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, [session]);

  if (!session.isConnected) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">LiveKit Agent</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            Start a session to talk to your voice agent. Tokens are generated in
            the Electron main process.
          </p>
        </div>
        <Button size="lg" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Start conversation"}
        </Button>
        {error && (
          <p className="text-destructive max-w-md text-sm break-words">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      <AgentSessionView_01 audioVisualizerType="bar" />
      <div className="absolute top-4 right-4 z-50">
        <StartAudioButton label="Allow audio" variant="outline" size="sm" />
      </div>
    </div>
  );
}
