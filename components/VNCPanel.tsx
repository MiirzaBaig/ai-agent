"use client";

import { useState } from "react";
import { VNCViewer } from "@/components/VNCViewer";
import { EvidenceTimeline } from "@/components/EvidenceTimeline";
import { Button } from "@/components/ui/button";
import { ToolCallDetails } from "@/components/ToolCallDetails";
import { useEventStore } from "@/lib/events/store";
import { RefreshCw, Monitor, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface VNCPanelProps {
  streamUrl: string | null;
  isInitializing: boolean;
  onRefreshDesktop: () => void;
  selectedToolCallId: string | null;
  onClearSelection?: () => void;
  isStreaming?: boolean;
}

type PanelTab = "desktop" | "evidence";

export function VNCPanel({
  streamUrl,
  isInitializing,
  onRefreshDesktop,
  selectedToolCallId,
  onClearSelection,
  isStreaming = false,
}: VNCPanelProps) {
  const { events } = useEventStore();
  const [tab, setTab] = useState<PanelTab>("desktop");
  const selectedEvent = selectedToolCallId
    ? events.find((e) => e.id === selectedToolCallId)
    : null;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[var(--nb-ink)] bg-zinc-900">
        <div className="flex items-center gap-1">
          <PanelTabButton
            active={tab === "desktop"}
            onClick={() => setTab("desktop")}
            icon={<Monitor className="h-3.5 w-3.5" />}
            label="Live Desktop"
          />
          <PanelTabButton
            active={tab === "evidence"}
            onClick={() => setTab("evidence")}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="Evidence"
            badge={events.length || undefined}
          />
          {tab === "desktop" && streamUrl && (
            <span className="ml-2 flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          )}
          {tab === "desktop" && isStreaming && (
            <span className="ml-2 flex items-center gap-1.5 text-xs text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Agent Working
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {tab === "desktop" && (
            <Button
              onClick={onRefreshDesktop}
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 px-3 rounded-lg nb-border bg-white text-[var(--nb-ink)] font-black uppercase text-[10px] tracking-wide hover:bg-[var(--nb-lime)] hover:text-[var(--nb-ink)]",
                isInitializing && "opacity-50"
              )}
              disabled={isInitializing}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isInitializing && "animate-spin")} />
              {isInitializing ? "Starting..." : "New Desktop"}
            </Button>
          )}
        </div>
      </div>

      {/* Body: Live Desktop or Evidence Timeline */}
      {tab === "evidence" ? (
        <div className="flex-1 min-h-0 bg-zinc-50">
          <EvidenceTimeline />
        </div>
      ) : (
        <div className="relative flex-1 bg-black">
          <VNCViewer streamUrl={streamUrl} />
        </div>
      )}

      {/* Tool Call Details - Animated slide up (desktop tab only) */}
      <AnimatePresence>
        {tab === "desktop" && selectedEvent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-zinc-800 bg-zinc-900 overflow-hidden"
          >
            <div className="p-4 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Tool Call Details</h3>
                {onClearSelection && (
                  <button
                    onClick={onClearSelection}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <ToolCallDetails event={selectedEvent} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelTabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black uppercase tracking-wide transition-colors border-2",
        active
          ? "bg-[var(--nb-lime)] text-[var(--nb-ink)] border-[var(--nb-lime)]"
          : "text-zinc-400 border-transparent hover:bg-zinc-800/50 hover:text-zinc-200",
      )}
    >
      {icon}
      <span>{label}</span>
      {badge != null && (
        <span
          className={cn(
            "ml-0.5 rounded-md px-1.5 py-px text-[10px] font-bold tabular-nums",
            active
              ? "bg-[var(--nb-ink)] text-[var(--nb-lime)]"
              : "bg-zinc-800 text-zinc-400",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
