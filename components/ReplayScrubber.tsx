"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, X, Film, SkipBack } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { describeEvent, screenshotOf } from "@/lib/events/describe";
import { cn } from "@/lib/utils";

type Frame = { id: string; label: string; shot: string };

/**
 * Flight-recorder replay: scrub through the run's screenshots like a video.
 * Nobody does this for browser agents — it turns the evidence trail into a
 * playable filmstrip of exactly what the agent saw, step by step.
 */
export function ReplayScrubber({ onClose }: { onClose: () => void }) {
  const { getEventsSortedByTime } = useEventStore();

  const frames: Frame[] = useMemo(() => {
    return getEventsSortedByTime()
      .map((e) => {
        const shot = screenshotOf(e);
        return shot ? { id: e.id, label: describeEvent(e), shot } : null;
      })
      .filter((f): f is Frame => f !== null);
  }, [getEventsSortedByTime]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clamp when frames change.
  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, frames.length - 1)));
  }, [frames.length]);

  // Playback loop (~1.1s/frame).
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    timer.current = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  const current = frames[idx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <Film className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wide text-white">
            Replay
          </span>
          <span className="text-[11px] font-bold uppercase text-zinc-500">
            {frames.length ? `${idx + 1} / ${frames.length}` : "—"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {frames.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500">
          No frames to replay yet — run a task first.
        </div>
      ) : (
        <>
          {/* Big stage */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-4">
            <AnimatePresence mode="popLayout">
              {current && (
                <motion.img
                  key={current.id}
                  // eslint-disable-next-line @next/next/no-img-element
                  src={`data:image/png;base64,${current.shot}`}
                  alt=""
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-full max-w-full rounded-lg border-2 border-[var(--nb-ink)] object-contain shadow-2xl"
                />
              )}
            </AnimatePresence>
            {/* Caption */}
            {current && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full nb-border bg-[var(--nb-lime)] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[var(--nb-ink)]">
                {current.label}
              </div>
            )}
          </div>

          {/* Controls + filmstrip */}
          <div className="border-t-[2.5px] border-[var(--nb-ink)] bg-zinc-900 p-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setIdx(0);
                  setPlaying(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg nb-border bg-white text-[var(--nb-ink)]"
                title="Restart"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  if (idx >= frames.length - 1) setIdx(0);
                  setPlaying((p) => !p);
                }}
                className="flex h-8 items-center gap-1.5 rounded-lg nb-border nb-shadow-sm bg-[var(--nb-lime)] px-3 text-[11px] font-black uppercase tracking-wide text-[var(--nb-ink)]"
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {playing ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={idx}
                onChange={(e) => {
                  setPlaying(false);
                  setIdx(Number(e.target.value));
                }}
                className="nb-range flex-1"
              />
            </div>

            {/* Filmstrip thumbnails */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {frames.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setPlaying(false);
                    setIdx(i);
                  }}
                  className={cn(
                    "h-10 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all",
                    i === idx
                      ? "border-[var(--nb-lime)] ring-2 ring-[var(--nb-lime)]"
                      : "border-zinc-700 opacity-60 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${f.shot}`}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
