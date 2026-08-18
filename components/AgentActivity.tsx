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
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center gap-2 self-start nb-border nb-shadow-sm rounded-lg bg-[var(--nb-ink)] pl-2 pr-3 py-1.5 mb-4"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--nb-lime)]" />
          <span className="text-[11px] font-black uppercase tracking-wide text-[var(--nb-lime)]">
            Agent
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-[12px] font-medium text-white"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
