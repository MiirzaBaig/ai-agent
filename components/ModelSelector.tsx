"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { MODELS, getModel, type ModelId } from "@/lib/models";
import { cn } from "@/lib/utils";

type ModelSelectorProps = {
  modelId: ModelId;
  onChange: (id: ModelId) => void;
  /** Disable switching while the agent is mid-run. */
  disabled?: boolean;
};

export function ModelSelector({
  modelId,
  onChange,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getModel(modelId);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "nb-border nb-shadow-sm nb-press flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-lg bg-white text-xs font-black uppercase tracking-wide text-[var(--nb-ink)]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Model routing"
      >
        <Cpu className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
        <span className="whitespace-nowrap">{active.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl nb-border nb-shadow-lg bg-white p-1.5"
            role="listbox"
          >
            {MODELS.map((m) => {
              const selected = m.id === modelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 mb-1 last:mb-0",
                    selected
                      ? "nb-border bg-[var(--nb-lime)]"
                      : "border-2 border-transparent hover:bg-zinc-100",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--nb-ink)]",
                      selected ? "bg-[var(--nb-ink)]" : "bg-white",
                    )}
                  >
                    {selected && (
                      <Check className="h-2.5 w-2.5 text-[var(--nb-lime)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-900">
                        {m.label}
                      </span>
                      <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                        ${m.inputPricePerM}/${m.outputPricePerM}
                        <span className="text-zinc-300"> per M</span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                      {m.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
