import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
} from "ai";
import { killDesktop } from "@/lib/e2b/utils";
import { bashTool, computerTool } from "@/lib/e2b/tool";
import { prunedMessages } from "@/lib/utils";
import { resolveModelId } from "@/lib/models";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

const MAX_AGENT_STEPS = 30;
const FINAL_ANSWER_STEP = 24;

const systemPrompt =
  "You are Sentry, a capable agent that operates a real computer on the user's behalf. " +
  "Use the computer tool to interact with the screen, and the bash tool to run commands; prefer bash when it accomplishes the task more directly (e.g. creating files, fetching data). " +
  "\n\nWork efficiently: before acting, state your plan in one short sentence, then execute. Don't narrate every routine click — a brief note when you start a new sub-task or change direction is enough. Take a screenshot after actions that change the screen so you can verify the result before continuing. " +
  "\n\nBrowsing: prefer reliable, CAPTCHA-free sources. When a page shows a CAPTCHA, Cloudflare/'verify you are human' check, cookie wall, or login gate, do NOT attempt to solve it — go back and pick a different result or source instead. When reading news/articles, favor the article listing and open sources directly rather than getting stuck on one blocked page. " +
  "\n\nReviews and count-limited requests: if the user asks for a number of reviews, headlines, products, or similar items, collect what is publicly accessible. If a site only exposes fewer items, asks for sign-in, blocks full reviews, or hides content behind pagination you cannot reliably access, say that clearly in the final answer and summarize the accessible items. Do not keep scrolling or clicking carousel controls after two unsuccessful attempts to reveal more items from the same source. Try at most one alternate public source, then conclude. " +
  "\n\nRecover from dead-ends: if an action doesn't work or a page won't load, don't repeat the same step — back up and try an alternative (a different link, a direct URL, or a different approach). If you're truly stuck, tell the user what blocked you and what you'd try next. " +
  "\n\nIf a browser setup wizard appears, skip it and go straight to the task (type the URL into the address bar). " +
  "\n\nAn approval gate blocks irreversible or system-level commands (deleting large trees, formatting disks, powering off, piping remote scripts into a shell). If a command is blocked, do not retry it — explain what you intended and ask the user to confirm, or take a safer, reversible approach. " +
  "\n\nAlways end with a concise final answer. If you could not fully complete the request, still end with a clear partial-result summary that starts with why it stopped, then what you found.";

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
    const modelMessages = await convertToModelMessages(prunedMessages(messages));
    const result = streamText({
      model: anthropic(model),
      system: systemPrompt,
      messages: modelMessages,
      // Multi-step agent loop (was useChat maxSteps: 30 in v4).
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      prepareStep: ({ stepNumber }) => {
        if (stepNumber < FINAL_ANSWER_STEP) return undefined;

        return {
          activeTools: [],
          system:
            systemPrompt +
            "\n\nYou are near the tool-step limit. Stop using tools now and write the final answer from the evidence already collected. If the task is incomplete, explain the blocker and provide partial results instead of continuing to browse.",
        };
      },
      tools: {
        computer: computerTool(sandboxId, model),
        bash: bashTool(sandboxId),
      },
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });

    // Stream the response as UI messages. Total token usage is attached as
    // message metadata on finish so the dashboard can show per-session cost.
    const response = result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) =>
        part.type === "finish" ? { totalUsage: part.totalUsage } : undefined,
      onError(error) {
        console.error(error);
        
        // Handle rate limit errors with a user-friendly message
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (/abort|cancel|interrupted/i.test(errorMessage)) {
            return "Run stopped.";
          }
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
    if (sandboxId) {
      await killDesktop(sandboxId); // Force cleanup on error
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
