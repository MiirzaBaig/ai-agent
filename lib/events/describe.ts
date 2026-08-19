import type { AgentEvent } from "./types";

/**
 * Human-readable, evidence-grade descriptions of agent actions.
 * Turns the typed event pipeline into the "proof it works" trail:
 * every click, keystroke, and command rendered as a plain-language step.
 */

export type EventCategory = "vision" | "input" | "navigation" | "command" | "wait";

export function categoryOf(event: AgentEvent): EventCategory {
  switch (event.type) {
    case "screenshot":
      return "vision";
    case "type":
    case "key":
      return "input";
    case "left_click":
    case "right_click":
    case "double_click":
    case "mouse_move":
    case "scroll":
      return "navigation";
    case "bash":
      return "command";
    case "wait":
      return "wait";
    case "browser":
      switch (event.payload.action) {
        case "screenshot":
          return "vision";
        case "type":
          return "input";
        case "read":
          return "command";
        default:
          return "navigation";
      }
  }
}

/** A short verb-phrase label for the timeline row. */
export function describeEvent(event: AgentEvent): string {
  switch (event.type) {
    case "screenshot":
      return "Captured screen";
    case "left_click": {
      const [x, y] = event.payload.coordinate;
      return `Clicked at (${x}, ${y})`;
    }
    case "right_click": {
      const [x, y] = event.payload.coordinate;
      return `Right-clicked at (${x}, ${y})`;
    }
    case "double_click": {
      const [x, y] = event.payload.coordinate;
      return `Double-clicked at (${x}, ${y})`;
    }
    case "mouse_move": {
      const [x, y] = event.payload.coordinate;
      return `Moved cursor to (${x}, ${y})`;
    }
    case "type":
      return `Typed “${truncate(event.payload.text, 48)}”`;
    case "key":
      return `Pressed ${event.payload.key}`;
    case "scroll":
      return `Scrolled ${event.payload.direction} ×${event.payload.amount}`;
    case "wait":
      return `Waited ${event.payload.duration}s`;
    case "bash":
      return `Ran \`${truncate(event.payload.command, 56)}\``;
    case "browser": {
      const { action, summary } = event.payload;
      switch (action) {
        case "navigate":
          return `Opened ${truncate(summary, 56)}`;
        case "click":
          return `Clicked “${truncate(summary, 48)}”`;
        case "type":
          return `Typed ${truncate(summary, 48)}`;
        case "read":
          return `Read ${truncate(summary, 48)}`;
        case "screenshot":
          return "Captured page";
        case "goBack":
          return "Went back";
      }
    }
  }
}

/** Optional secondary detail (bash output, page text, etc.) under the label. */
export function detailOf(event: AgentEvent): string | undefined {
  if (event.type === "bash") return event.payload.output || undefined;
  if (event.type === "browser") {
    // Only surface text output for read/navigate — not for screenshots.
    if (event.payload.action === "read" || event.payload.action === "navigate") {
      return event.payload.output || undefined;
    }
  }
  return undefined;
}

/** The captured screenshot for this event, if any (base64 PNG, no data: prefix). */
export function screenshotOf(event: AgentEvent): string | undefined {
  if (event.type === "screenshot") return event.payload.imageData;
  if (event.type === "browser") return event.payload.imageData;
  return undefined;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
