import { UIMessage } from "ai";
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
  const limitedMessages = messages.length > maxMessages 
    ? [...messages.slice(0, 1), ...messages.slice(-maxMessages + 1)]
    : messages;

  return limitedMessages.map((message) => {
    // check if last message part is a tool invocation in a call state, then append a part with the tool result
    message.parts = message.parts.map((part) => {
      if (part.type === "tool-invocation") {
        if (
          part.toolInvocation.toolName === "computer" &&
          part.toolInvocation.args.action === "screenshot"
        ) {
          return {
            ...part,
            toolInvocation: {
              ...part.toolInvocation,
              result: {
                type: "text",
                text: "Image redacted to save input tokens",
              },
            },
          };
        }
        return part;
      }
      return part;
    });
    return message;
  });
};
