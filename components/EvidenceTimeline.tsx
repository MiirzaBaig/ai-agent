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
  Download,
  ExternalLink,
} from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { downloadReceipt } from "@/lib/receipt";
import type { AgentEvent } from "@/lib/events/types";
import {
  describeEvent,
  detailOf,
  screenshotOf,
  categoryOf,
  faviconOf,
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

// Turn a raw URL into a short, human label: "google.com › weather in dubai today".
function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    const q = u.searchParams.get("q");
    if (q) return `${host} › ${q}`;
    const path = u.pathname.replace(/\/$/, "");
    return path && path !== "" ? `${host}${path}` : host;
  } catch {
    return raw;
  }
}

// Common site chrome (nav bars, cookie/accessibility boilerplate) that gets
// scraped before the real content. We trim it so the card shows what matters.
const TEXT_NOISE =
  /^(skip to main content|accessibility|sign in|all news images videos|shopping more tools|search results|choose area|ai overview|ai mode)\b/i;

function cleanText(text: string): string {
  return text
    .split(/\s{2,}|\n+/)
    .map((s) => s.trim())
    .filter((s) => s && !TEXT_NOISE.test(s))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

// Render the pageContext detail ("URL: … / Title: … / Visible text: …") as a
// clean, readable block instead of a raw page dump.
function DetailView({ detail }: { detail: string }) {
  const urlMatch = detail.match(/URL:\s*(.+)/);
  const titleMatch = detail.match(/Title:\s*(.+)/);
  const textMatch = detail.match(/Visible text[^:]*:\s*([\s\S]*)/i);
  const url = urlMatch?.[1]?.trim();
  const title = titleMatch?.[1]?.trim();
  const text = textMatch?.[1] ? cleanText(textMatch[1]) : "";

  // Not a pageContext string — just show it wrapped.
  if (!url && !title && !text) {
    return (
      <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-100 p-2 text-[11px] leading-relaxed text-zinc-700">
        {detail}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 truncate text-[11px] font-bold text-[var(--nb-ink)] hover:underline"
          title={url}
        >
          <ExternalLink className="h-3 w-3 flex-shrink-0 text-zinc-400" />
          <span className="truncate">{prettyUrl(url)}</span>
        </a>
      )}
      {title && !url?.includes(title) && (
        <div className="text-xs font-bold text-[var(--nb-ink)]">{title}</div>
      )}
      {text && (
        <p className="max-h-32 overflow-auto break-words text-[11px] leading-relaxed text-zinc-500">
          {text}
        </p>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false);
  const [faviconOk, setFaviconOk] = useState(true);
  const Icon = CATEGORY_ICON[categoryOf(event)];
  const shot = screenshotOf(event);
  const detail = detailOf(event);
  const hasEvidence = Boolean(shot || detail);
  const favicon = faviconOf(event);

  return (
    <div className="relative pl-8">
      {/* Spine node — favicon for navigations, category icon otherwise */}
      <span className="nb-border absolute left-[6px] top-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-[var(--nb-paper)]">
        {favicon && faviconOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={favicon}
            alt=""
            className="h-3.5 w-3.5"
            onError={() => setFaviconOk(false)}
          />
        ) : (
          <Icon className="h-3 w-3 text-[var(--nb-ink)]" />
        )}
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
          {/* Live thumbnail — the agent's actual view at this step */}
          {shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${shot}`}
              alt=""
              className="h-8 w-12 flex-shrink-0 rounded border-2 border-[var(--nb-ink)] object-cover object-top"
            />
          )}
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
              <div className="space-y-2 border-t-2 border-zinc-200 p-2.5">
                {shot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${shot}`}
                    alt="Screen capture evidence"
                    className="w-full rounded-lg border-2 border-[var(--nb-ink)]"
                  />
                )}
                {detail && <DetailView detail={detail} />}
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
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tabular-nums text-zinc-500">
            {verified} verified · {events.length} step
            {events.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() =>
              downloadReceipt({ task: "Agent run", answer: "", events })
            }
            className="flex h-6 items-center gap-1 rounded-md nb-border bg-white px-2 text-[9px] font-black uppercase tracking-wide text-[var(--nb-ink)] hover:bg-[var(--nb-lime)]"
            title="Export a shareable proof receipt"
          >
            <Download className="h-3 w-3" />
            Receipt
          </button>
        </div>
      </div>

      {/* The trail */}
      <div className="flex-1 overflow-y-auto nb-paper px-4 py-4">
        <div className="relative space-y-2">
          {/* Vertical spine — inside the content so it spans all rows */}
          <span className="pointer-events-none absolute bottom-2 left-[15px] top-2 w-[2px] bg-[var(--nb-ink)]" />
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
