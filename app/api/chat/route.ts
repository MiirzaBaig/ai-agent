import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
} from "ai";
import { killBrowserSession } from "@/lib/browser/session";
import { browserTools } from "@/lib/browser/tools";
import { prunedMessages } from "@/lib/utils";
import { resolveModelId } from "@/lib/models";

// Node runtime (Playwright/CDP + child_process); allow long agent runs.
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_AGENT_STEPS = 30;
const FINAL_ANSWER_STEP = 24;

const systemPrompt =
  "You are Sentry, a capable web agent that drives a real Chrome browser on the user's behalf. " +
  "You have DOM-level tools — navigate, click, type, read, screenshot, goBack. Prefer reading page text over screenshots (it's faster and cheaper); take a screenshot only when you need to visually verify something. " +
  "\n\nWork efficiently: state your plan in one short sentence, then execute. Each tool returns the current URL, title, and visible page text — use that to decide the next step rather than re-reading unnecessarily. Don't narrate every routine action; a brief note when you change direction is enough. " +
  "\n\nActing on pages: click by the element's visible text when you can (e.g. 'News', 'Sign in'); fall back to a CSS selector if needed. To search, type into the search box with submit=true. Navigate directly to a known URL when that's faster than clicking through. " +
  "\n\nAvoid blockers: prefer reliable, CAPTCHA-free sources. If a page shows a CAPTCHA, Cloudflare/'verify you are human' check, cookie wall, or login gate, do NOT try to solve it — go back and pick a different result or source. For research, open sources directly rather than getting stuck on one blocked page. " +
  "\n\nCount-limited requests: if the user asks for N items (reviews, headlines, products), collect what's publicly accessible. If a site exposes fewer, requires sign-in, or hides content behind pagination you can't reach, say so clearly and summarize what you found. Don't retry the same blocked action more than twice; try at most one alternate source, then conclude. " +
  "\n\nRecover from dead-ends: if an action fails or a page won't load, don't repeat it — try an alternative (a different link, a direct URL, goBack). If truly stuck, tell the user what blocked you and what you'd try next. " +
  "\n\nAlways end with a concise final answer that leads with the outcome. If you couldn't fully complete the task, still end with a clear partial-result summary — why it stopped, then what you found.";

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
      tools: browserTools(sandboxId),
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
      await killBrowserSession(sandboxId); // Force cleanup on error
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
