"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Cpu, Chrome, Info, Check } from "lucide-react";
import { MODELS } from "@/lib/models";
import { useModel } from "@/lib/use-model";
import { cn } from "@/lib/utils";

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { modelId, setModelId } = useModel();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl nb-border nb-shadow-lg bg-[var(--nb-paper)] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight text-[var(--nb-ink)]">
                Settings
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg nb-border bg-white hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Default model */}
            <Section icon={<Cpu className="h-4 w-4" />} title="Default model">
              <div className="space-y-1.5">
                {MODELS.map((m) => {
                  const selected = m.id === modelId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setModelId(m.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left",
                        selected
                          ? "nb-border bg-white"
                          : "border-2 border-transparent hover:bg-white/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--nb-ink)]",
                          selected ? "bg-[var(--nb-ink)]" : "bg-white",
                        )}
                      >
                        {selected && (
                          <Check className="h-2.5 w-2.5 text-[var(--nb-lime)]" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="text-xs font-bold text-[var(--nb-ink)]">
                          {m.label}
                        </span>
                        <span className="ml-2 text-[11px] text-zinc-500">
                          {m.tagline}
                        </span>
                      </span>
                      <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                        ${m.inputPricePerM}/${m.outputPricePerM}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Chrome */}
            <Section icon={<Chrome className="h-4 w-4" />} title="Browser">
              <p className="text-xs leading-relaxed text-zinc-600">
                In production, Sentry runs on a Browserbase cloud browser. Local
                development uses a dedicated Chrome on this machine; if Chrome
                isn&apos;t found, set{" "}
                <code className="rounded bg-zinc-200 px-1 font-mono text-[11px]">
                  CHROME_PATH
                </code>{" "}
                to its executable and restart the app.
              </p>
            </Section>

            {/* About */}
            <Section icon={<Info className="h-4 w-4" />} title="About">
              <p className="text-xs leading-relaxed text-zinc-600">
                Sentry v2 — a real-time browser agent. Watch it drive Chrome,
                keep the receipts, hold the kill switch.
              </p>
            </Section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-xl nb-border bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
