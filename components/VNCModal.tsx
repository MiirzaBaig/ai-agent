"use client";

import { useEffect } from "react";
import { X, Monitor } from "lucide-react";
import { VNCViewer } from "@/components/VNCViewer";
import { Button } from "@/components/ui/button";
import { ToolCallDetails } from "@/components/ToolCallDetails";
import { useEventStore } from "@/lib/events/store";
import { motion, AnimatePresence } from "motion/react";

interface VNCModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string | null;
  isInitializing: boolean;
  onRefreshDesktop: () => void;
  selectedToolCallId: string | null;
  isStreaming?: boolean;
}

export function VNCModal({
  isOpen,
  onClose,
  streamUrl,
  isInitializing,
  onRefreshDesktop,
  selectedToolCallId,
  isStreaming = false,
}: VNCModalProps) {
  const { events } = useEventStore();
  const selectedEvent = selectedToolCallId
    ? events.find((e) => e.id === selectedToolCallId)
    : null;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col bg-black"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-white" />
                <h2 className="text-lg font-semibold text-white">VNC Viewer</h2>
                {isStreaming && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Agent Working
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={onRefreshDesktop}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 h-10 min-h-[44px]"
                  disabled={isInitializing}
                  size="sm"
                >
                  {isInitializing ? "Creating..." : "Refresh"}
                </Button>
                <Button
                  onClick={onClose}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 h-10 w-10 min-h-[44px] min-w-[44px]"
                  size="icon"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* VNC Viewer */}
            <div className="flex-1 relative overflow-hidden">
              <VNCViewer streamUrl={streamUrl} />
            </div>

            {/* Tool Call Details */}
            {selectedEvent && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="border-t border-zinc-700 bg-zinc-900 text-white overflow-hidden"
              >
                <div className="p-4 max-h-64 overflow-y-auto">
                  <ToolCallDetails event={selectedEvent} />
                </div>
              </motion.div>
            )}

            {/* Swipe indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-700 rounded-full" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

