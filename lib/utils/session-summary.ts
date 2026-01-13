import type { AgentEvent, EventCounts } from "@/lib/events/types";
import type { Session } from "@/lib/sessions/types";

export interface SessionSummaryData {
  session: Session | null;
  events: AgentEvent[];
  eventCounts: EventCounts;
  totalDuration: number;
  startTime: number | null;
  endTime: number | null;
}

export function generateSessionSummary(data: SessionSummaryData): string {
  const { session, events, eventCounts, totalDuration, startTime, endTime } = data;

  const lines: string[] = [];

  // Header
  lines.push("# Session Summary");
  lines.push("");
  lines.push(`**Session:** ${session?.name || "Unknown"}`);
  if (session?.createdAt) {
    lines.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`);
  }
  lines.push("");

  // Statistics
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- **Total Events:** ${events.length}`);
  lines.push(`- **Total Duration:** ${formatDuration(totalDuration)}`);
  
  if (startTime && endTime) {
    const sessionDuration = endTime - startTime;
    lines.push(`- **Session Duration:** ${formatDuration(sessionDuration)}`);
  }
  lines.push("");

  // Event Breeakdown
  if (Object.keys(eventCounts).length > 0) {
    lines.push("## Event Breakdown");
    lines.push("");
    const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedEvents) {
      const percentage = ((count / events.length) * 100).toFixed(1);
      lines.push(`- **${formatEventType(type)}:** ${count} (${percentage}%)`);
    }
    lines.push("");
  }

  // Key Actions
  const keyEvents = getKeyActions(events);
  if (keyEvents.length > 0) {
    lines.push("## Key Actions");
    lines.push("");
    for (const action of keyEvents) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  // Performance-mets
  const performanceMetrics = calculatePerformanceMetrics(events);
  if (performanceMetrics.length > 0) {
    lines.push("## Performance Metrics");
    lines.push("");
    for (const metric of performanceMetrics) {
      lines.push(`- ${metric}`);
    }
    lines.push("");
  }

  // Timeline...
  if (events.length > 0) {
    lines.push("## Timeline");
    lines.push("");
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const recentEvents = sortedEvents.slice(-10).reverse();
    
    for (const event of recentEvents) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const status = event.status === "complete" ? "✅" : event.status === "error" ? "❌" : "⏳";
      lines.push(`- ${status} **${formatEventType(event.type)}** at ${time}${event.duration ? ` (${event.duration}ms)` : ""}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push(`*Generated on ${new Date().toLocaleString()}*`);

  return lines.join("\n");
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function getKeyActions(events: AgentEvent[]): string[] {
  const actions: string[] = [];
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // Find firstcreenshot
  const firstScreenshot = sortedEvents.find((e) => e.type === "screenshot");
  if (firstScreenshot) {
    actions.push("Initial screenshot captured");
  }

  // alsoFind bash commands
  const bashEvents = sortedEvents.filter((e) => e.type === "bash");
  if (bashEvents.length > 0) {
    const uniqueCommands = new Set(
      bashEvents
        .map((e) => {
          if ("command" in e.payload) {
            return (e.payload as { command: string }).command;
          }
          return null;
        })
        .filter((cmd): cmd is string => cmd !== null)
    );
    if (uniqueCommands.size > 0) {
      actions.push(`${uniqueCommands.size} unique bash command${uniqueCommands.size > 1 ? "s" : ""} executed`);
    }
  }

  // Find typing events
  const typeEvents = sortedEvents.filter((e) => e.type === "type");
  if (typeEvents.length > 0) {
    const totalChars = typeEvents.reduce((sum, e) => {
      if ("text" in e.payload) {
        return sum + ((e.payload as { text: string }).text?.length || 0);
      }
      return sum;
    }, 0);
    if (totalChars > 0) {
      actions.push(`${totalChars} characters typed across ${typeEvents.length} action${typeEvents.length > 1 ? "s" : ""}`);
    }
  }

  // Find clicks
  const clickEvents = sortedEvents.filter(
    (e) => e.type === "left_click" || e.type === "right_click" || e.type === "double_click"
  );
  if (clickEvents.length > 0) {
    actions.push(`${clickEvents.length} click${clickEvents.length > 1 ? "s" : ""} performed`);
  }

  return actions;
}

function calculatePerformanceMetrics(events: AgentEvent[]): string[] {
  const metrics: string[] = [];
  const completedEvents = events.filter((e) => e.status === "complete" && e.duration);

  if (completedEvents.length > 0) {
    const durations = completedEvents.map((e) => e.duration!);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    metrics.push(`Average event duration: ${formatDuration(avgDuration)}`);
    metrics.push(`Fastest event: ${formatDuration(minDuration)}`);
    metrics.push(`Slowest event: ${formatDuration(maxDuration)}`);

    // Success rate
    const successCount = events.filter((e) => e.status === "complete").length;
    const errorCount = events.filter((e) => e.status === "error").length;
    const total = successCount + errorCount;
    if (total > 0) {
      const successRate = ((successCount / total) * 100).toFixed(1);
      metrics.push(`Success rate: ${successRate}% (${successCount}/${total} events)`);
    }
  }

  return metrics;
}
