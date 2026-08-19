import "server-only";

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

// The agent drives a DEDICATED local Chrome (its own profile + debug port), so
// it never touches the user's everyday browser, tabs, or logins. We launch it,
// connect Playwright over CDP on localhost (no proxy/Host-rewrite needed — that
// was only for the cloud sandbox), and drive it via the DOM.

export const resolution = { x: 1280, y: 800 };

const CDP_PORT = 9222;
const PROFILE_DIR = join(tmpdir(), "sentry-chrome-profile");

export type BrowserSession = {
  browser: Browser;
  page: Page;
  /** Session key (stable per app run). */
  sessionId: string;
  /** The Chrome process we spawned, if any (so we can close only ours). */
  proc?: ChildProcess;
};

// One live session per key. In practice the app uses a single local browser.
const sessions = new Map<string, BrowserSession>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Locate a Chrome/Chromium executable for the current OS. */
function findChrome(): string {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : process.platform === "win32"
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "Could not find Chrome. Install Google Chrome, or set CHROME_PATH to its executable.",
    );
  }
  return found;
}

/** Is a CDP endpoint already listening on the debug port? */
async function cdpReady(): Promise<{ webSocketDebuggerUrl: string } | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    if (res.ok) return res.json();
  } catch {
    // not up
  }
  return null;
}

/** Launch a dedicated Chrome with remote debugging and wait for CDP. */
async function launchChrome(): Promise<ChildProcess | undefined> {
  // If a debuggable Chrome is already up (e.g. from a previous run), reuse it.
  if (await cdpReady()) return undefined;

  const bin = findChrome();
  const proc = spawn(
    bin,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${resolution.x},${resolution.y}`,
      "about:blank",
    ],
    { detached: true, stdio: "ignore" },
  );
  proc.unref();

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    if (await cdpReady()) return proc;
  }
  throw new Error("Chrome did not expose a CDP endpoint in time");
}

async function connect(sessionId: string): Promise<BrowserSession> {
  const proc = await launchChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, {
    timeout: 30000,
  });
  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  return { browser, page, sessionId, proc };
}

/** Get (or create) the local browser session. */
export async function getBrowserSession(id?: string): Promise<BrowserSession> {
  const key = id || "local";
  const existing = sessions.get(key);
  if (existing?.browser.isConnected()) return existing;
  sessions.delete(key);

  const session = await connect(key);
  sessions.set(key, session);
  return session;
}

/** Provision the session and return its id (no VNC stream in the local build). */
export async function getBrowserSessionInfo(id?: string) {
  const session = await getBrowserSession(id);
  return { id: session.sessionId };
}

/** Disconnect Playwright and close the dedicated Chrome we launched (only ours). */
export async function killBrowserSession(id?: string) {
  const key = id || "local";
  const s = sessions.get(key);
  sessions.delete(key);
  try {
    await s?.browser.close();
  } catch {
    // ignore
  }
  try {
    s?.proc?.kill();
  } catch {
    // ignore
  }
}
