import { UIMessage, isToolUIPart, getToolName } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ABORTED = "User aborted";

const RECENT_MESSAGES_TO_KEEP_FULL = 10;
const MAX_MESSAGES = 16;
const MAX_TEXT_PART_CHARS = 1800;
const MAX_TOOL_OUTPUT_CHARS = 1400;

function trimText(value: string, max = MAX_TEXT_PART_CHARS) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}\n\n[trimmed to save context]`;
}

function compactToolOutput(output: unknown) {
  if (!output) return output;
  if (typeof output === "string")
    return trimText(output, MAX_TOOL_OUTPUT_CHARS);
  if (typeof output !== "object") return output;

  const record = output as Record<string, unknown>;
  const text =
    typeof record.text === "string"
      ? trimText(record.text, MAX_TOOL_OUTPUT_CHARS)
      : undefined;
  const value =
    typeof record.value === "string"
      ? trimText(record.value, MAX_TOOL_OUTPUT_CHARS)
      : undefined;

  return {
    ...record,
    ...(text ? { text } : {}),
    ...(value ? { value } : {}),
    shot: record.shot ? "[image kept in evidence timeline]" : undefined,
  };
}

export const prunedMessages = (messages: UIMessage[]): UIMessage[] => {
  if (messages.at(-1)?.role === "assistant") {
    return messages;
  }

  const limitedMessages =
    messages.length > MAX_MESSAGES
      ? [...messages.slice(0, 1), ...messages.slice(-MAX_MESSAGES + 1)]
      : messages;

  return limitedMessages.map((message, index) => {
    const keepFull =
      index >= limitedMessages.length - RECENT_MESSAGES_TO_KEEP_FULL;
    const parts = message.parts.map((part) => {
      if (part.type === "text") {
        return { ...part, text: trimText(part.text) };
      }

      if (
        isToolUIPart(part) &&
        part.state === "output-available" &&
        (getToolName(part) === "screenshot" ||
          (part.input as { action?: string } | undefined)?.action ===
            "screenshot")
      ) {
        return {
          ...part,
          output: {
            type: "text" as const,
            value:
              "Screenshot stored in evidence timeline; image redacted from model context.",
          },
        };
      }

      if (isToolUIPart(part) && part.state === "output-available") {
        if (!keepFull) {
          return {
            type: "text" as const,
            text: `[Earlier browser step compacted: ${getToolName(part)}]`,
          };
        }
        return {
          ...part,
          output: compactToolOutput(part.output),
        };
      }

      return part;
    });
    return { ...message, parts };
  });
};
