import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { getBrowserSession, type BrowserSession } from "./session";

// Every browser tool returns this shape: `text` goes to the model (cheap), and
// `shot` (base64 PNG) is captured after the action so the UI can build a live
// filmstrip / thumbnails of what the agent actually saw at each step.
type ActionResult = { text: string; shot?: string };

async function pageText(session: BrowserSession): Promise<string> {
  const { page } = session;
  const url = page.url();
  const title = await page.title().catch(() => "");
  const text = await page
    .evaluate(() => {
      const body = document.body;
      if (!body) return "";
      return (body.innerText || "").replace(/\s+/g, " ").slice(0, 3000);
    })
    .catch(() => "");
  return `URL: ${url}\nTitle: ${title}\n\nVisible text (trimmed):\n${text}`;
}

async function screenshotB64(session: BrowserSession): Promise<string | undefined> {
  try {
    const buf = await session.page.screenshot({ type: "png" });
    return Buffer.from(buf).toString("base64");
  } catch {
    return undefined;
  }
}

// Capture a screenshot only on the visually meaningful actions (navigate,
// click, type, explicit screenshot) — these feed the live filmstrip. The
// cheap actions (read, goBack) skip the PNG encode to keep the loop fast.
async function actionResult(
  session: BrowserSession,
  withShot = false,
): Promise<ActionResult> {
  if (!withShot) return { text: await pageText(session) };
  const [text, shot] = await Promise.all([
    pageText(session),
    screenshotB64(session),
  ]);
  return { text, shot };
}

// Model output for browser tools: send only the text (the screenshot is for the
// UI filmstrip, not the model — keeps token cost down).
function toModelText(result: { output: unknown }) {
  const out = result.output as ActionResult | string | undefined;
  const text = typeof out === "string" ? out : (out?.text ?? "");
  return { type: "content" as const, value: [{ type: "text" as const, text }] };
}

export function browserTools(sandboxId?: string) {
  const withSession = async <T>(
    fn: (s: BrowserSession) => Promise<T>,
  ): Promise<T> => {
    const session = await getBrowserSession(sandboxId);
    return fn(session);
  };

  const navigate = tool({
    description:
      "Navigate the browser to a URL. Use full https URLs. Returns the resulting page URL, title and visible text.",
    inputSchema: z.object({
      url: z.string().describe("The full URL to open, e.g. https://example.com"),
    }),
    execute: async ({ url }) =>
      withSession(async (s) => {
        const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        await s.page.goto(target, { waitUntil: "domcontentloaded" });
        return actionResult(s, true);
      }),
    toModelOutput: toModelText,
  });

  const click = tool({
    description:
      "Click an element. Prefer a visible text label (e.g. 'News', 'Sign in'); a CSS selector also works. Returns the updated page.",
    inputSchema: z.object({
      text: z
        .string()
        .optional()
        .describe("Visible text of the element to click"),
      selector: z.string().optional().describe("CSS selector, if you know it"),
    }),
    execute: async ({ text, selector }) =>
      withSession(async (s): Promise<ActionResult> => {
        if (selector) {
          await s.page.locator(selector).first().click();
        } else if (text) {
          await s.page.getByText(text, { exact: false }).first().click();
        } else {
          return { text: "Provide either text or selector to click." };
        }
        await s.page
          .waitForLoadState("domcontentloaded", { timeout: 8000 })
          .catch(() => {});
        return actionResult(s, true);
      }),
    toModelOutput: toModelText,
  });

  const type = tool({
    description:
      "Type text into an input. Optionally target a field by its placeholder/label/selector, then optionally press Enter to submit.",
    inputSchema: z.object({
      text: z.string().describe("The text to type"),
      into: z
        .string()
        .optional()
        .describe("Placeholder, label, or CSS selector of the field"),
      submit: z
        .boolean()
        .optional()
        .describe("Press Enter after typing (e.g. to run a search)"),
    }),
    execute: async ({ text, into, submit }) =>
      withSession(async (s) => {
        const field = into
          ? s.page
              .locator(
                `${into}, input[placeholder*="${into}" i], textarea[placeholder*="${into}" i]`,
              )
              .first()
          : s.page.locator("input:visible, textarea:visible").first();
        await field.click();
        await field.fill(text);
        if (submit) {
          await field.press("Enter");
          await s.page
            .waitForLoadState("domcontentloaded", { timeout: 8000 })
            .catch(() => {});
        }
        return actionResult(s, true);
      }),
    toModelOutput: toModelText,
  });

  const read = tool({
    description:
      "Read text from the page. With no selector, returns the whole visible text; with a selector, returns just that element's text.",
    inputSchema: z.object({
      selector: z
        .string()
        .optional()
        .describe("CSS selector to read; omit for the whole page"),
    }),
    execute: async ({ selector }) =>
      withSession(async (s): Promise<ActionResult> => {
        if (selector) {
          const t = await s.page
            .locator(selector)
            .allTextContents()
            .catch(() => []);
          return {
            text: t.join("\n").slice(0, 5000) || "(no matching elements)",
          };
        }
        return actionResult(s);
      }),
    toModelOutput: toModelText,
  });

  const screenshot = tool({
    description:
      "Take a screenshot of the current page to visually verify state. Use sparingly — reading text is cheaper.",
    inputSchema: z.object({}),
    execute: async () =>
      withSession(async (s) => ({
        text: "Screenshot captured.",
        shot: await screenshotB64(s),
      })),
    toModelOutput: toModelText,
  });

  const goBack = tool({
    description: "Go back to the previous page in browser history.",
    inputSchema: z.object({}),
    execute: async () =>
      withSession(async (s) => {
        await s.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        return actionResult(s);
      }),
    toModelOutput: toModelText,
  });

  return { navigate, click, type, read, screenshot, goBack };
}
