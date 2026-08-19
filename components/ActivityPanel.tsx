"use client";

import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { Chrome } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-hand panel for the local-Chrome build. The real browser is on the
 * user's screen, so this is the live action feed (evidence timeline) with a
 * status header — not a page mirror.
 */
export function ActivityPanel({
  isConnected,
  isStreaming,
}: {
  isConnected: boolean;
  isStreaming?: boolean;
}) {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
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
          {isConnected && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Chrome ready
            </span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-400">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse",
                )}
              />
              Working
            </span>
          )}
        </div>
      </div>

      {/* The live action feed (evidence timeline is already streaming). */}
      <div className="flex-1 min-h-0 nb-paper">
        <EvidenceTimeline />
      </div>
    </div>
  );
}
