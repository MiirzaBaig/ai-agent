"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { describeEvent, screenshotOf, domainOf } from "@/lib/events/describe";
import type { AgentEvent } from "@/lib/events/types";

type Frame = { id: string; shot: string; label: string; event: AgentEvent };

/**
 * The real-time visual: a big "current view" of what the agent just saw, plus a
 * thumbnail strip that auto-advances as new screenshots land. Driven entirely by
 * the evidence we already capture, so it renders identically in dev and prod —
 * no live browser stream required.
 */
export function LiveFilmstrip({ isStreaming }: { isStreaming?: boolean }) {
  const { getEventsSortedByTime } = useEventStore();
  const events = getEventsSortedByTime();

  const frames = useMemo<Frame[]>(() => {
    const out: Frame[] = [];
    for (const e of events) {
      const shot = screenshotOf(e);
      if (shot) out.push({ id: e.id, shot, label: describeEvent(e), event: e });
    }
    return out;
  }, [events]);

  // Which frame is shown in the big panel. While the agent is working we pin to
  // the newest frame (live). Hovering a thumbnail overrides until mouse leaves.
  const [pinned, setPinned] = useState<string | null>(null);
  const lastCount = useRef(frames.length);

  useEffect(() => {
    // A new frame arrived — jump the big view to it (the "live" behavior).
    if (frames.length !== lastCount.current) {
      lastCount.current = frames.length;
      setPinned(null);
    }
  }, [frames.length]);

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Keep the newest thumbnail in view as they stream in.
    if (!pinned && stripRef.current) {
      stripRef.current.scrollLeft = stripRef.current.scrollWidth;
    }
  }, [frames.length, pinned]);

  if (frames.length === 0) return null;

  const current =
    frames.find((f) => f.id === pinned) ?? frames[frames.length - 1];
  const domain = domainOf(
    current.event.type === "browser" ? current.event.payload.summary : "",
  );

  return (
    <div className="border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-950 p-3">
      <div className="nb-border nb-shadow-sm overflow-hidden rounded-xl bg-white">
        {/* Browser chrome bar */}
        <div className="flex h-8 items-center gap-2 border-b-2 border-[var(--nb-ink)] bg-zinc-100 px-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-zinc-500">
            {domain ?? current.label}
          </span>
          {isStreaming && !pinned && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-red-500">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Big current frame */}
        <div className="relative aspect-[16/10] bg-zinc-100">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={current.id}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={`data:image/png;base64,${current.shot}`}
              alt={current.label}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <p className="truncate text-[11px] font-bold text-white">
              {current.label}
            </p>
          </div>
        </div>

        {/* Thumbnail strip */}
        {frames.length > 1 && (
          <div
            ref={stripRef}
            className="flex gap-1.5 overflow-x-auto border-t-2 border-[var(--nb-ink)] bg-zinc-50 p-1.5"
            onMouseLeave={() => setPinned(null)}
          >
            {frames.map((f, i) => {
              const active = f.id === current.id;
              return (
                <button
                  key={f.id}
                  onMouseEnter={() => setPinned(f.id)}
                  onClick={() => setPinned(f.id)}
                  title={f.label}
                  className={`relative h-10 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                    active
                      ? "border-[var(--nb-ink)] ring-2 ring-[var(--nb-lime)]"
                      : "border-zinc-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${f.shot}`}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                  <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[8px] font-black text-white">
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
