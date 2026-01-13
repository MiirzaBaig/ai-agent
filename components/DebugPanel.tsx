"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Activity, Zap, Clock, Bug } from "lucide-react";
import { useEventStore } from "@/lib/events/store";
import { cn } from "@/lib/utils";

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { events, getEventCounts, getAgentStatus } = useEventStore();
  const eventCounts = getEventCounts();
  const agentStatus = getAgentStatus();

  // Handle escape key and keyboard shortcut (Cmd+Shift+D or Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with Cmd+Shift+D (Mac) or Ctrl+Shift+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const statusColors = {
    idle: "bg-zinc-400",
    thinking: "bg-amber-400",
    executing: "bg-green-400",
  };

  const statusLabels = {
    idle: "Idle",
    thinking: "Thinking",
    executing: "Executing",
  };

  return (
    <>
      {/* Toggle Button - Fixed position on the right edge, visible on desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden xl:flex",
          "items-center gap-1.5 px-3 py-4",
          "bg-zinc-900 text-white rounded-l-lg shadow-xl",
          "hover:bg-zinc-800 transition-all duration-200",
          "border border-r-0 border-zinc-700",
          "backdrop-blur-sm",
          isOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Toggle debug panel (⌘⇧D)"
        title="Debug Panel (⌘⇧D)"
      >
        <Bug className="h-4 w-4" />
        <ChevronRight
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
        {/* Status indicator dot */}
        <span
          className={cn(
            "absolute -top-1 -left-1 h-3 w-3 rounded-full border-2 border-zinc-900",
            statusColors[agentStatus],
            agentStatus === "executing" && "animate-pulse"
          )}
        />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-80 z-[70]",
          "bg-zinc-900 text-white shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          "border-l border-zinc-700",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold text-lg">Debug Panel</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Agent Status */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "h-3 w-3 rounded-full",
                  statusColors[agentStatus],
                  agentStatus === "executing" && "animate-pulse"
                )}
              />
              <span className="font-medium">{statusLabels[agentStatus]}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Activity className="h-4 w-4" />
              <span>{events.length} total events</span>
            </div>
          </div>

          {/* Event Counts */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Event Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(eventCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-xs font-mono text-zinc-300 truncate">
                    {type}
                  </span>
                  <span className="text-sm font-semibold text-white ml-2">
                    {count}
                  </span>
                </div>
              ))}
              {Object.keys(eventCounts).length === 0 && (
                <div className="col-span-2 text-center text-zinc-500 text-sm py-4">
                  No events yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-4">
                  No activity yet
                </div>
              ) : (
                events
                  .slice(-10)
                  .reverse()
                  .map((event) => (
                    <div
                      key={event.id}
                      className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0",
                            event.status === "pending" && "bg-amber-400",
                            event.status === "complete" && "bg-green-400",
                            event.status === "error" && "bg-red-400"
                          )}
                        />
                        <span className="text-xs font-mono text-zinc-300 truncate">
                          {event.type}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {event.duration ? `${event.duration}ms` : "..."}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 text-xs text-zinc-500 text-center">
          Press ESC or click outside to close
        </div>
      </div>
    </>
  );
}
