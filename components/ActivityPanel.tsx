"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Activity, Film, ShieldCheck } from "lucide-react";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { LiveFilmstrip } from "@/components/LiveFilmstrip";
import { ReplayScrubber } from "@/components/ReplayScrubber";
import { useEventStore } from "@/lib/events/store";

/**
 * Right-hand panel: the live evidence feed (per-step screenshots + text the
 * agent actually saw) and replay controls. Each action is captured as it
 * happens, so this doubles as the real-time view of what the browser is doing.
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
      <div className="flex items-center justify-between border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wide text-white">
            Evidence
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isStreaming ? (
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
                Ready
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

      {/* Real-time visual: the agent's latest view + an auto-advancing strip. */}
      <LiveFilmstrip isStreaming={isStreaming} />

      {/* The live evidence feed — screenshots + text captured per action. */}
      <div className="min-h-0 flex-1 nb-paper">
        <EvidenceTimeline />
      </div>

      {/* Replay overlay */}
      <AnimatePresence>
        {showReplay && <ReplayScrubber onClose={() => setShowReplay(false)} />}
      </AnimatePresence>
    </div>
  );
}
