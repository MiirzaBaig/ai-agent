import { UIMessage, isToolUIPart, getToolName } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ABORTED = "User aborted";

export const prunedMessages = (messages: UIMessage[]): UIMessage[] => {
  if (messages.at(-1)?.role === "assistant") {
    return messages;
  }

  // Limit message history to prevent rate limit issues
  // Keep last 20 messages (approximately 10 exchanges)
  const maxMessages = 20;
  const limitedMessages =
    messages.length > maxMessages
      ? [...messages.slice(0, 1), ...messages.slice(-maxMessages + 1)]
      : messages;

  return limitedMessages.map((message) => {
    // Redact old screenshot outputs to save input tokens. In AI SDK v5, tool
    // parts are typed (`tool-computer`) with `input`/`output`/`state` fields.
    const parts = message.parts.map((part) => {
      if (
        isToolUIPart(part) &&
        getToolName(part) === "computer" &&
        part.state === "output-available" &&
        (part.input as { action?: string } | undefined)?.action === "screenshot"
      ) {
        return {
          ...part,
          output: {
            type: "text" as const,
            value: "Image redacted to save input tokens",
          },
        };
      }
      return part;
    });
    return { ...message, parts };
  });
};
