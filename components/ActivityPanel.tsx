"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Chrome, Film, Activity } from "lucide-react";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { ReplayScrubber } from "@/components/ReplayScrubber";
import { useEventStore } from "@/lib/events/store";
import { cn } from "@/lib/utils";

/**
 * Right-hand panel: the live action feed (evidence timeline) + a live "heist"
 * meter while the agent works, and a Replay button that opens the filmstrip.
 */
export function ActivityPanel({
  isConnected,
  isStreaming,
}: {
  isConnected: boolean;
  isStreaming?: boolean;
}) {
  const { events } = useEventStore();
  const [showReplay, setShowReplay] = useState(false);

  // Live elapsed timer while the agent is working.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isStreaming) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(t);
  }, [isStreaming]);

  return (
    <div className="relative flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <Chrome className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wide text-white">
            Live Activity
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isStreaming ? (
            // Live "heist meter": steps + elapsed ticking up.
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tabular-nums text-[var(--nb-lime)]">
                <Activity className="h-3 w-3" />
                {events.length} steps
              </span>
              <span className="text-[11px] font-black tabular-nums text-amber-400">
                {elapsed.toFixed(1)}s
              </span>
            </div>
          ) : (
            isConnected && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Chrome ready
              </span>
            )
          )}
          {events.length > 0 && (
            <button
              onClick={() => setShowReplay(true)}
              className="flex h-7 items-center gap-1.5 rounded-lg nb-border nb-shadow-sm bg-[var(--nb-lime)] px-2.5 text-[10px] font-black uppercase tracking-wide text-[var(--nb-ink)]"
              title="Replay the run"
            >
              <Film className="h-3.5 w-3.5" />
              Replay
            </button>
          )}
        </div>
      </div>

      {/* The live action feed. */}
      <div className={cn("flex-1 min-h-0 nb-paper")}>
        <EvidenceTimeline />
      </div>

      {/* Replay overlay */}
      <AnimatePresence>
        {showReplay && <ReplayScrubber onClose={() => setShowReplay(false)} />}
      </AnimatePresence>
    </div>
  );
}
