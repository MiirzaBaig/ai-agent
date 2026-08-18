"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  MousePointerClick,
  Keyboard,
  Terminal,
  Clock,
  ChevronDown,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import type { AgentEvent } from "@/lib/events/types";
import {
  describeEvent,
  detailOf,
  screenshotOf,
  categoryOf,
  type EventCategory,
} from "@/lib/events/describe";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<EventCategory, typeof Camera> = {
  vision: Camera,
  input: Keyboard,
  navigation: MousePointerClick,
  command: Terminal,
  wait: Clock,
};

function StatusDot({ status }: { status: AgentEvent["status"] }) {
  if (status === "pending") {
    return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />;
  }
  if (status === "error") {
    return <AlertCircle className="h-3 w-3 text-red-500" />;
  }
  return <ShieldCheck className="h-3 w-3 text-emerald-500" />;
}

function TimelineRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICON[categoryOf(event)];
  const shot = screenshotOf(event);
  const detail = detailOf(event);
  const hasEvidence = Boolean(shot || detail);

  return (
    <div className="relative pl-8">
      {/* Spine node */}
      <span className="nb-border absolute left-[6px] top-1 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--nb-paper)]">
        <Icon className="h-3 w-3 text-[var(--nb-ink)]" />
      </span>

      <div
        className={cn(
          "rounded-lg nb-border bg-white",
          hasEvidence ? "nb-shadow-sm" : "",
        )}
      >
        <button
          type="button"
          disabled={!hasEvidence}
          onClick={() => hasEvidence && setExpanded((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left",
            hasEvidence && "cursor-pointer",
          )}
        >
          <StatusDot status={event.status} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-700">
            {describeEvent(event)}
          </span>
          {event.duration != null && (
            <span className="flex-shrink-0 text-[10px] tabular-nums text-zinc-400">
              {formatDuration(event.duration)}
            </span>
          )}
          {hasEvidence && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform",
                expanded && "rotate-180",
              )}
            />
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && hasEvidence && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-100 p-2">
                {shot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${shot}`}
                    alt="Screen capture evidence"
                    className="w-full rounded-md border border-zinc-200"
                  />
                )}
                {detail && (
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-zinc-950 p-2.5 text-[11px] leading-relaxed text-zinc-100">
                    {detail}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function EvidenceTimeline() {
  const { getEventsSortedByTime } = useEventStore();
  const events = getEventsSortedByTime();

  const verified = events.filter((e) => e.status === "complete").length;

  if (events.length === 0) {
    return (
      <div className="nb-paper nb-grid flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="nb-border nb-shadow mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--nb-lime)]">
          <ShieldCheck className="h-6 w-6 text-[var(--nb-ink)]" />
        </div>
        <p className="text-sm font-black uppercase tracking-wide text-[var(--nb-ink)]">
          No evidence yet
        </p>
        <p className="mt-1.5 max-w-[240px] text-xs font-medium text-zinc-600">
          Every move the agent makes lands here — clicks, keystrokes, commands,
          and screenshots — as receipts you can actually check.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header / evidence tally */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[var(--nb-ink)] nb-paper px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="nb-border flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nb-lime)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wide text-[var(--nb-ink)]">
            Evidence Timeline
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tabular-nums text-zinc-500">
          {verified} verified · {events.length} step
          {events.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* The trail */}
      <div className="relative flex-1 overflow-y-auto nb-paper px-4 py-4">
        {/* Vertical spine */}
        <span className="absolute bottom-4 left-[17px] top-4 w-[2px] bg-[var(--nb-ink)]" />
        <div className="space-y-2">
          {events.map((event) => (
            <TimelineRow key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
