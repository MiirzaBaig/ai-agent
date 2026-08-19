"use client";

import { useState } from "react";
import { Check, Copy, Link2, RefreshCw, Share2 } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { domainOf } from "@/lib/events/describe";
import { downloadReceipt } from "@/lib/receipt";
import { cn } from "@/lib/utils";

/**
 * Per-message actions under an assistant reply: copy the answer, copy it with
 * the sources the agent actually visited, share the whole run as a proof
 * receipt, and (on the latest reply) regenerate. Reinforces the evidence angle
 * — you can copy not just the answer, but where it came from.
 */
export function MessageActions({
  text,
  isLatest,
  onRegenerate,
}: {
  text: string;
  isLatest?: boolean;
  onRegenerate?: () => void;
}) {
  const { getEventsSortedByTime } = useEventStore();
  const [copied, setCopied] = useState<null | "text" | "sources">(null);

  // Distinct source URLs the agent navigated to, in order.
  const sources = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of getEventsSortedByTime()) {
      if (e.type === "browser" && e.payload.action === "navigate") {
        const url = e.payload.summary;
        const key = domainOf(url) ?? url;
        if (url && !seen.has(key)) {
          seen.add(key);
          out.push(url);
        }
      }
    }
    return out;
  })();

  const flash = (which: "text" | "sources") => {
    setCopied(which);
    setTimeout(() => setCopied(null), 1400);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    flash("text");
  };

  const copyWithSources = async () => {
    const block = sources.length
      ? `${text}\n\nSources:\n${sources.map((s) => `• ${s}`).join("\n")}`
      : text;
    await navigator.clipboard.writeText(block);
    flash("sources");
  };

  const shareRun = () => {
    downloadReceipt({
      task: "Agent run",
      answer: text,
      events: getEventsSortedByTime(),
    });
  };

  const btn =
    "flex h-7 items-center gap-1 rounded-md nb-border bg-white px-2 text-[10px] font-black uppercase tracking-wide text-[var(--nb-ink)] transition-colors hover:bg-[var(--nb-lime)]";

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-3 pl-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 data-[always=true]:opacity-100">
      <button onClick={copyText} className={btn} title="Copy answer">
        {copied === "text" ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        Copy
      </button>

      {sources.length > 0 && (
        <button
          onClick={copyWithSources}
          className={btn}
          title="Copy answer with the sources the agent used"
        >
          {copied === "sources" ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Link2 className="h-3 w-3" />
          )}
          Copy + sources
        </button>
      )}

      <button
        onClick={shareRun}
        className={btn}
        title="Download a shareable proof receipt of this run"
      >
        <Share2 className="h-3 w-3" />
        Share run
      </button>

      {isLatest && onRegenerate && (
        <button
          onClick={onRegenerate}
          className={cn(btn, "hover:bg-[var(--nb-violet)] hover:text-white")}
          title="Run this task again"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
