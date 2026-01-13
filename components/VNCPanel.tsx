"use client";

import { VNCViewer } from "@/components/VNCViewer";
import { Button } from "@/components/ui/button";
import { ToolCallDetails } from "@/components/ToolCallDetails";
import { useEventStore } from "@/lib/events/store";
import { RefreshCw, Monitor, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface VNCPanelProps {
  streamUrl: string | null;
  isInitializing: boolean;
  onRefreshDesktop: () => void;
  selectedToolCallId: string | null;
  onClearSelection?: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function VNCPanel({
  streamUrl,
  isInitializing,
  onRefreshDesktop,
  selectedToolCallId,
  onClearSelection,
  isStreaming = false,
  onStop,
}: VNCPanelProps) {
  const { events } = useEventStore();
  const selectedEvent = selectedToolCallId
    ? events.find((e) => e.id === selectedToolCallId)
    : null;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">Virtual Desktop</span>
          {streamUrl && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Agent Working
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onRefreshDesktop}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800",
              isInitializing && "opacity-50"
            )}
            disabled={isInitializing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isInitializing && "animate-spin")} />
            {isInitializing ? "Starting..." : "New Desktop"}
          </Button>
        </div>
      </div>

      {/* VNC Viewer */}
      <div className="relative flex-1 bg-black">
        <VNCViewer streamUrl={streamUrl} />
      </div>

      {/* Tool Call Details - Animated slide up */}
      <AnimatePresence>
        {selectedEvent && (
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
