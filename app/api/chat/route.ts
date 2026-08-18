import { anthropic } from "@ai-sdk/anthropic";
import { streamText, UIMessage } from "ai";
import { killDesktop } from "@/lib/e2b/utils";
import { bashTool, computerTool } from "@/lib/e2b/tool";
import { prunedMessages } from "@/lib/utils";
import { resolveModelId } from "@/lib/models";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const {
    messages,
    sandboxId,
    modelId,
  }: { messages: UIMessage[]; sandboxId: string; modelId?: string } =
    await req.json();
  try {
    // Resolve the client-supplied model against the allow-list before use.
    const model = resolveModelId(modelId);
    const result = streamText({
      model: anthropic(model),
      system:
        "You are a capable assistant that operates a computer on the user's behalf. " +
        "Use the computer tool to interact with the screen, and the bash tool to run commands; prefer bash when it accomplishes the task more directly. You can create files and folders with bash. " +
        "Let the user know when an action will take time to complete. " +
        "If a browser setup wizard appears, skip it and go straight to the task (e.g. type the URL into the address bar). " +
        "An approval gate blocks irreversible or system-level commands (deleting large trees, formatting disks, powering off, piping remote scripts into a shell). If a command is blocked, do not retry it — explain what you were trying to do and ask the user to confirm, or take a safer, reversible approach.",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });

    // Create response stream. sendUsage streams token counts to the client
    // so the dashboard can show per-session cost + model routing telemetry.
    const response = result.toDataStreamResponse({
      sendUsage: true,
      getErrorMessage(error) {
        console.error(error);
        
        // Handle rate limit errors with a user-friendly message
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (errorMessage.includes("rate limit") || errorMessage.includes("exceed")) {
            return "Rate limit exceeded. Please wait a moment and try again. Your tier allows 30,000 input tokens per minute.";
          }
          return errorMessage;
        }
        return String(error);
      },
    });

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    await killDesktop(sandboxId); // Force cleanup on error
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
