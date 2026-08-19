"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Check, ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const CHANGES = [
  "Model switcher",
  "Evidence timeline",
  "Approval gates",
  "Cost telemetry",
  "AI SDK v5",
  "Local Chrome agent",
  "Sentry UI rebuild",
];

const DISMISS_KEY = "sentry-v2-announcement-20260818-dismissed";

export function V2Announcement() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
    setReady(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  if (!ready) return null;

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.section
          initial={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="nb-paper px-3 pb-2 sm:px-4"
        >
          <div className="overflow-hidden rounded-lg border-2 border-[var(--nb-ink)] bg-white">
            <div className="flex flex-col gap-2 px-2.5 py-2 sm:flex-row sm:items-center sm:px-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[var(--nb-lime)] text-[var(--nb-ink)]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1 text-xs leading-snug">
                  <span className="font-black uppercase tracking-wide text-[var(--nb-ink)]">
                    Sentry V2
                  </span>
                  <span className="mx-1.5 font-bold text-zinc-400">/</span>
                  <span className="font-semibold text-zinc-700">
                    Local Chrome agent, AI SDK v5, evidence, telemetry.
                  </span>
                </div>
              </div>

              <div className="ml-8 flex flex-shrink-0 items-center gap-1 sm:ml-0">
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="flex h-7 items-center gap-1 rounded-md border-2 border-[var(--nb-ink)] bg-white px-2 text-[10px] font-black uppercase text-[var(--nb-ink)] transition-colors hover:bg-zinc-100 active:bg-zinc-200"
                  aria-expanded={expanded}
                >
                  Details
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-[var(--nb-ink)] bg-white text-[var(--nb-ink)] transition-colors hover:bg-zinc-100 active:bg-zinc-200"
                  aria-label="Dismiss Sentry V2 announcement"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden border-t-2 border-[var(--nb-ink)] bg-zinc-50"
                >
                  <div className="flex flex-wrap gap-1.5 px-2.5 py-2 sm:px-3">
                    {CHANGES.map((change) => (
                      <div
                        key={change}
                        className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-zinc-800"
                      >
                        <Check className="h-3 w-3 flex-shrink-0 text-green-600" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
