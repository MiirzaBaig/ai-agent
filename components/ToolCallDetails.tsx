"use client";

import { motion } from "motion/react";
import { Clock, CheckCircle, XCircle, Loader2, Camera } from "lucide-react";
import Image from "next/image";
import type { AgentEvent } from "@/lib/events/types";
import { cn } from "@/lib/utils";

interface ToolCallDetailsProps {
  event: AgentEvent;
}

const statusConfig = {
  pending: { icon: Loader2, color: "text-amber-400", bg: "bg-amber-400/10", label: "Pending" },
  complete: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Complete" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Error" },
};

export function ToolCallDetails({ event }: ToolCallDetailsProps) {
  const status = statusConfig[event.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="p-4 sm:p-5 space-y-4 sm:space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-3">
        <h3 className="font-semibold text-lg sm:text-xl text-white">Tool Call Details</h3>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          status.bg,
          "border border-zinc-700/50"
        )}>
          <StatusIcon className={cn("h-4 w-4", status.color, event.status === "pending" && "animate-spin")} />
          <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2.5">
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-2.5 border border-zinc-700/50">
          <div className="text-xs text-zinc-400 mb-1 font-medium">Type</div>
          <div className="text-sm sm:text-base font-mono text-white capitalize">{event.type}</div>
        </div>

        {event.duration !== undefined && (
          <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-2.5 border border-zinc-700/50">
            <div className="text-xs text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Duration
            </div>
            <div className="text-sm sm:text-base font-semibold text-white">{event.duration}ms</div>
          </div>
        )}

        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-2.5 border border-zinc-700/50 sm:col-span-2">
          <div className="text-xs text-zinc-400 mb-1 font-medium">Timestamp</div>
          <div className="text-sm sm:text-base text-white">
            {new Date(event.timestamp).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Payload */}
      <div className="mt-4 sm:mt-3 pt-4 sm:pt-3 border-t border-zinc-700/50">
        <div className="text-xs text-zinc-400 mb-2.5 font-medium">Payload</div>
        <div className="bg-zinc-900/80 rounded-lg border border-zinc-700/50 overflow-hidden">
          <pre className="text-xs sm:text-[11px] p-3 sm:p-2.5 overflow-x-auto touch-pan-x text-zinc-300 font-mono leading-relaxed">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      </div>

      {/* Screenshot */}
      {event.type === "screenshot" && event.payload.imageData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mt-4 sm:mt-3 pt-4 sm:pt-3 border-t border-zinc-700/50"
        >
          <div className="text-xs text-zinc-400 mb-2.5 font-medium flex items-center gap-2">
            <Camera className="h-3.5 w-3.5" />
            Screenshot
          </div>
          <div className="rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-900/50 p-2">
            <Image
              src={`data:image/png;base64,${event.payload.imageData}`}
              alt="Screenshot"
              width={800}
              height={600}
              className="w-full h-auto rounded-md shadow-lg object-cover"
              unoptimized
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

