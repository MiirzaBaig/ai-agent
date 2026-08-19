"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Chrome, ExternalLink, Film, Radio } from "lucide-react";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { ReplayScrubber } from "@/components/ReplayScrubber";
import { useEventStore } from "@/lib/events/store";

/**
 * Right-hand panel: live browser view when Browserbase provides one, plus the
 * evidence timeline and replay controls.
 */
export function ActivityPanel({
  isConnected,
  isStreaming,
  liveViewUrl,
  provider,
}: {
  isConnected: boolean;
  isStreaming?: boolean;
  liveViewUrl?: string | null;
  provider?: string | null;
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

  const isBrowserbase = provider === "browserbase";
  const showLiveBrowser = Boolean(liveViewUrl);

  return (
    <div className="relative flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <Chrome className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wide text-white">
            Live Browser
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

      {/* Live browser surface. */}
      <div className="border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-950 p-3">
        <motion.div
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1] }}
          className="nb-border nb-shadow-sm overflow-hidden rounded-xl bg-white"
        >
          <div className="flex h-9 items-center gap-2 border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-100 px-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="min-w-0 flex-1 rounded-md border-2 border-zinc-300 bg-white px-2 py-0.5 font-mono text-[10px] text-zinc-500">
              <span className="block truncate">
                {showLiveBrowser
                  ? "browserbase://live-session"
                  : isBrowserbase
                    ? "browserbase://starting"
                    : "local-chrome://external-window"}
              </span>
            </div>
            {showLiveBrowser && (
              <a
                href={liveViewUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="nb-border nb-press flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)] text-[var(--nb-ink)]"
                title="Open live browser"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="relative aspect-[16/10] bg-zinc-100">
            {showLiveBrowser ? (
              <iframe
                src={liveViewUrl || undefined}
                title="Live Browserbase session"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                allow="clipboard-read; clipboard-write; fullscreen"
                className="h-full w-full bg-white"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--nb-paper)] px-6 text-center">
                <span className="nb-border flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nb-lime)]">
                  <Radio className="h-5 w-5 text-[var(--nb-ink)]" />
                </span>
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-[var(--nb-ink)]">
                    {isBrowserbase ? "Connecting live view" : "Local Chrome mode"}
                  </p>
                  <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-zinc-600">
                    {isBrowserbase
                      ? "The browser stream appears here as soon as Browserbase publishes it."
                      : "Chrome opens as a real window on this machine. Production shows the cloud browser here."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* The live action feed. */}
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
