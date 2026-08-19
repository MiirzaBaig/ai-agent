import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { getBrowserSession, type BrowserSession } from "./session";

// A short, model-friendly view of the page after each action, so the agent can
// decide the next step without always needing a screenshot.
async function pageContext(session: BrowserSession): Promise<string> {
  const { page } = session;
  const url = page.url();
  const title = await page.title().catch(() => "");
  // Trimmed visible text — enough to reason over, cheap on tokens.
  const text = await page
    .evaluate(() => {
      const body = document.body;
      if (!body) return "";
      return (body.innerText || "").replace(/\s+/g, " ").slice(0, 3000);
    })
    .catch(() => "");
  return `URL: ${url}\nTitle: ${title}\n\nVisible text (trimmed):\n${text}`;
}

async function screenshotB64(session: BrowserSession): Promise<string> {
  const buf = await session.page.screenshot({ type: "png" });
  return Buffer.from(buf).toString("base64");
}

/** Build the browser tool set bound to a sandbox's live Playwright page. */
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
        return pageContext(s);
      }),
  });

  const click = tool({
    description:
      "Click an element. Prefer a visible text label (e.g. 'News', 'Sign in'); a CSS selector also works. Returns the updated page.",
    inputSchema: z.object({
      text: z
        .string()
        .optional()
        .describe("Visible text of the element to click"),
      selector: z
        .string()
        .optional()
        .describe("CSS selector, if you know it"),
    }),
    execute: async ({ text, selector }) =>
      withSession(async (s) => {
        if (selector) {
          await s.page.locator(selector).first().click();
        } else if (text) {
          await s.page.getByText(text, { exact: false }).first().click();
        } else {
          return "Provide either text or selector to click.";
        }
        await s.page
          .waitForLoadState("domcontentloaded", { timeout: 8000 })
          .catch(() => {});
        return pageContext(s);
      }),
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
        return pageContext(s);
      }),
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
      withSession(async (s) => {
        if (selector) {
          const t = await s.page
            .locator(selector)
            .allTextContents()
            .catch(() => []);
          return t.join("\n").slice(0, 5000) || "(no matching elements)";
        }
        return pageContext(s);
      }),
  });

  const screenshot = tool({
    description:
      "Take a screenshot of the current page to visually verify state. Use sparingly — reading text is cheaper.",
    inputSchema: z.object({}),
    execute: async () =>
      withSession(async (s) => ({
        type: "image" as const,
        data: await screenshotB64(s),
      })),
    toModelOutput(result) {
      const out = result.output as { type?: string; data?: string };
      if (out?.type === "image" && out.data) {
        return {
          type: "content",
          value: [
            { type: "image-data", mediaType: "image/png", data: out.data },
          ],
        };
      }
      return { type: "content", value: [{ type: "text", text: "screenshot" }] };
    },
  });

  const goBack = tool({
    description: "Go back to the previous page in browser history.",
    inputSchema: z.object({}),
    execute: async () =>
      withSession(async (s) => {
        await s.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        return pageContext(s);
      }),
  });

  return { navigate, click, type, read, screenshot, goBack };
}
