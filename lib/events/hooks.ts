"use client";

import { useEffect } from "react";
import { type UIMessage, isToolUIPart, getToolName } from "ai";
import { useEventStore } from "./store";
import type { AgentEvent } from "./types";

// The computer tool's screenshot output may arrive as the raw execute return
// ({ type: "image", data }) or the v5 model-output content shape
// ({ type: "content", value: [{ type: "media", data }] }). Handle both.
function extractImageData(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  if (typeof r.data === "string") return r.data;
  if (Array.isArray(r.value)) {
    const media = r.value.find(
      (v): v is { data: string } =>
        !!v && typeof v === "object" && typeof (v as { data?: unknown }).data === "string",
    );
    if (media) return media.data;
  }
  return undefined;
}

function mapToolCallToEventType(
  toolName: string,
  args: Record<string, unknown>
): AgentEvent["type"] | null {
  if (toolName === "computer") {
    const action = args.action as string;
    if (action === "screenshot") return "screenshot";
    if (action === "left_click") return "left_click";
    if (action === "right_click") return "right_click";
    if (action === "double_click") return "double_click";
    if (action === "mouse_move") return "mouse_move";
    if (action === "type") return "type";
    if (action === "key") return "key";
    if (action === "scroll") return "scroll";
    if (action === "wait") return "wait";
  }
  if (toolName === "bash") return "bash";
  return null;
}

const BROWSER_ACTIONS = new Set([
  "navigate",
  "click",
  "type",
  "read",
  "screenshot",
  "goBack",
]);

function summarizeBrowser(
  action: string,
  args: Record<string, unknown>,
): string {
  switch (action) {
    case "navigate":
      return String(args.url ?? "");
    case "click":
      return String(args.text ?? args.selector ?? "element");
    case "type":
      return `“${String(args.text ?? "")}”${args.submit ? " ⏎" : ""}`;
    case "read":
      return args.selector ? String(args.selector) : "page text";
    case "screenshot":
      return "current page";
    case "goBack":
      return "previous page";
    default:
      return action;
  }
}

function createEventFromToolCall(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result",
  sessionId: string,
  result?: unknown
): AgentEvent | null {
  const timestamp = Date.now();
  const wasBlocked =
    typeof result === "string" && result.startsWith("⛔ Blocked");
  const status: AgentEvent["status"] =
    state === "call"
      ? "pending"
      : result === "User aborted" || wasBlocked
        ? "error"
        : "complete";

  const baseEvent = {
    id: toolCallId,
    timestamp,
    status,
    sessionId,
  };

  // Browser agent tools → a single browser event with a human summary.
  if (BROWSER_ACTIONS.has(toolName)) {
    const imageData =
      toolName === "screenshot" ? extractImageData(result) : undefined;
    const output =
      typeof result === "string" ? result.slice(0, 4000) : undefined;
    return {
      ...baseEvent,
      type: "browser",
      payload: {
        toolCallId,
        action: toolName as import("./types").BrowserAction,
        summary: summarizeBrowser(toolName, args),
        imageData,
        output,
      },
    };
  }

  const eventType = mapToolCallToEventType(toolName, args);
  if (!eventType) return null;

  if (toolName === "computer") {
    if (eventType === "screenshot") {
      return {
        ...baseEvent,
        type: "screenshot",
        payload: {
          toolCallId,
          coordinate: args.coordinate as [number, number] | undefined,
          imageData: extractImageData(result),
        },
      };
    }
    if (eventType === "left_click" || eventType === "right_click" || eventType === "double_click") {
      return {
        ...baseEvent,
        type: eventType,
        payload: {
          toolCallId,
          coordinate: (args.coordinate as [number, number]) || [0, 0],
        },
      };
    }
    if (eventType === "mouse_move") {
      return {
        ...baseEvent,
        type: "mouse_move",
        payload: {
          toolCallId,
          coordinate: (args.coordinate as [number, number]) || [0, 0],
        },
      };
    }
    if (eventType === "type") {
      return {
        ...baseEvent,
        type: "type",
        payload: {
          toolCallId,
          text: (args.text as string) || "",
        },
      };
    }
    if (eventType === "key") {
      return {
        ...baseEvent,
        type: "key",
        payload: {
          toolCallId,
          key: (args.text as string) || "",
        },
      };
    }
    if (eventType === "scroll") {
      return {
        ...baseEvent,
        type: "scroll",
        payload: {
          toolCallId,
          direction: (args.scroll_direction as "up" | "down") || "down",
          amount: (args.scroll_amount as number) || 0,
        },
      };
    }
    if (eventType === "wait") {
      return {
        ...baseEvent,
        type: "wait",
        payload: {
          toolCallId,
          duration: (args.duration as number) || 0,
        },
      };
    }
  }

  if (toolName === "bash") {
    return {
      ...baseEvent,
      type: "bash",
      payload: {
        toolCallId,
        command: (args.command as string) || "",
        output:
          result && typeof result === "string"
            ? result
            : result && typeof result === "object" && "stdout" in result
              ? (result.stdout as string)
              : undefined,
      },
    };
  }

  return null;
}

export function useExtractEvents(messages: UIMessage[], sessionId: string) {
  const { addEvent, updateEvent, events } = useEventStore();

  useEffect(() => {
    if (!sessionId) return;

    const toolCalls: Array<{
      id: string;
      toolName: string;
      args: Record<string, unknown>;
      state: "call" | "result";
      result?: unknown;
    }> = [];

    // Extract all tool invocations from messages. In AI SDK v5, tool parts are
    // typed (`tool-computer`, `tool-bash`) with input/output/state fields; we
    // map them onto the internal call/result shape the pipeline already uses.
    messages.forEach((message) => {
      if (message.parts) {
        message.parts.forEach((part) => {
          if (!isToolUIPart(part)) return;
          // input-available → tool is being called; output-available → done.
          if (
            part.state === "input-available" ||
            part.state === "output-available"
          ) {
            toolCalls.push({
              id: part.toolCallId,
              toolName: getToolName(part),
              args: (part.input ?? {}) as Record<string, unknown>,
              state: part.state === "output-available" ? "result" : "call",
              result:
                part.state === "output-available" ? part.output : undefined,
            });
          }
        });
      }
    });

    // Process each tool call
    toolCalls.forEach((toolCall) => {
      const existingEvent = events.find((e) => e.id === toolCall.id);

      if (!existingEvent) {
        // Create new event
        const event = createEventFromToolCall(
          toolCall.id,
          toolCall.toolName,
          toolCall.args,
          toolCall.state,
          sessionId,
          toolCall.result
        );
        if (event) {
          addEvent(event);
        }
      } else {
        // Update existing event only if status changed
        if (toolCall.state === "result" && existingEvent.status === "pending") {
          const duration = Date.now() - existingEvent.timestamp;
          const blocked =
            typeof toolCall.result === "string" &&
            toolCall.result.startsWith("⛔ Blocked");
          const status: AgentEvent["status"] =
            toolCall.result === "User aborted" || blocked ? "error" : "complete";
          updateEvent(toolCall.id, status, duration);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);
}

