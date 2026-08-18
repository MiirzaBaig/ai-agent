"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { describeEvent } from "@/lib/events/describe";

/**
 * Live "what the agent is doing right now" pill. Reads the newest event from
 * the pipeline and renders it in plain language with a loading spinner —
 * shown only while the agent is actively working.
 */
export function AgentActivity({ active }: { active: boolean }) {
  const { getEventsSortedByTime } = useEventStore();
  const events = getEventsSortedByTime();
  const latest = events[events.length - 1];

  const label = latest ? describeEvent(latest) : "Thinking…";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 5, scale: 0.98, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 4, scale: 0.98, filter: "blur(3px)" }}
          transition={{
            layout: { type: "spring", stiffness: 460, damping: 36 },
            opacity: { duration: 0.16 },
            filter: { duration: 0.2, ease: "easeOut" },
            scale: { duration: 0.2, ease: "easeOut" },
            y: { duration: 0.2, ease: "easeOut" },
          }}
          className="inline-flex w-fit max-w-[min(24rem,calc(100%-1rem))] min-w-0 items-center gap-2 self-start overflow-hidden nb-border nb-shadow-sm rounded-full bg-[var(--nb-ink)] pl-2.5 pr-3.5 py-1.5 mb-4"
        >
          <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[var(--nb-lime)]" />
          <span className="text-[10px] font-black uppercase tracking-wide text-[var(--nb-lime)] flex-shrink-0">
            Agent
          </span>
          <AnimatePresence mode="popLayout">
            <motion.span
              layout
              key={label}
              initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-w-0 truncate text-[12px] font-medium text-white"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
