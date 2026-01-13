"use client";

import { useEffect } from "react";
import type { Message } from "ai";
import { useEventStore } from "./store";
import type { AgentEvent } from "./types";

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

function createEventFromToolCall(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result",
  sessionId: string,
  result?: unknown
): AgentEvent | null {
  const eventType = mapToolCallToEventType(toolName, args);
  if (!eventType) return null;

  const timestamp = Date.now();
  const status: AgentEvent["status"] =
    state === "call" ? "pending" : result === "User aborted" ? "error" : "complete";

  const baseEvent = {
    id: toolCallId,
    timestamp,
    status,
    sessionId,
  };

  if (toolName === "computer") {
    if (eventType === "screenshot") {
      return {
        ...baseEvent,
        type: "screenshot",
        payload: {
          toolCallId,
          coordinate: args.coordinate as [number, number] | undefined,
          imageData:
            result && typeof result === "object" && "data" in result
              ? (result.data as string)
              : undefined,
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

export function useExtractEvents(messages: Message[], sessionId: string) {
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

    // Extract all tool invocations from messages
    messages.forEach((message) => {
      if (message.parts) {
        message.parts.forEach((part) => {
          if (part.type === "tool-invocation") {
            // Only process "call" or "result" states, skip "partial-call"
            if (part.toolInvocation.state === "call" || part.toolInvocation.state === "result") {
              toolCalls.push({
                id: part.toolInvocation.toolCallId,
                toolName: part.toolInvocation.toolName,
                args: part.toolInvocation.args as Record<string, unknown>,
                state: part.toolInvocation.state,
                result:
                  part.toolInvocation.state === "result" && "result" in part.toolInvocation
                    ? part.toolInvocation.result
                    : undefined,
              });
            }
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
          const status: AgentEvent["status"] =
            toolCall.result === "User aborted" ? "error" : "complete";
          updateEvent(toolCall.id, status, duration);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, sessionId]);
}

