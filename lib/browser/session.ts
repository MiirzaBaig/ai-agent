import "server-only";

import { Sandbox } from "@e2b/desktop";
import { chromium, type Browser, type Page } from "playwright-core";
import { resolution } from "@/lib/e2b/tool";

// Host-rewriting CDP proxy (verified working — see scripts/cdp-proxy.py).
// Chrome binds DevTools to 127.0.0.1 and rejects non-localhost Host headers;
// this proxy on :9223 rewrites the Host line to localhost:9222 and raw-relays
// so E2B getHost() can reach it. Response bodies are NOT touched (avoids
// truncation) — the client builds the public wss URL itself.
const CDP_PROXY_PY = `import asyncio
CHROME_HOST,CHROME_PORT="127.0.0.1",9222
LISTEN_PORT=9223
async def pipe(r,w):
    try:
        while True:
            d=await r.read(65536)
            if not d: break
            w.write(d); await w.drain()
    except Exception: pass
    finally:
        try: w.close()
        except Exception: pass
async def handle(cr,cw):
    try: sr,sw=await asyncio.open_connection(CHROME_HOST,CHROME_PORT)
    except Exception:
        cw.close(); return
    first=await cr.read(65536)
    head,sep,body=first.partition(b'\\r\\n\\r\\n')
    lines=head.split(b'\\r\\n')
    lines=[b'Host: localhost:9222' if l.lower().startswith(b'host:') else l for l in lines]
    sw.write(b'\\r\\n'.join(lines)+sep+body); await sw.drain()
    await asyncio.gather(pipe(sr,cw),pipe(cr,sw))
async def main():
    s=await asyncio.start_server(handle,'0.0.0.0',LISTEN_PORT)
    async with s: await s.serve_forever()
asyncio.run(main())
`;

const CHROME_CMD =
  "nohup google-chrome --no-sandbox --remote-debugging-port=9222 " +
  "--remote-allow-origins=* --no-first-run --no-default-browser-check " +
  "--disable-dev-shm-usage --user-data-dir=/tmp/chrome-profile " +
  `--window-size=${resolution.x},${resolution.y} --start-maximized about:blank ` +
  "> /tmp/chrome.log 2>&1 &";

const CDP_PORT = 9222;
const PROXY_PORT = 9223;

export type BrowserSession = {
  sandbox: Sandbox;
  browser: Browser;
  page: Page;
  sandboxId: string;
};

// Cache live sessions per sandbox so every tool call in a run reuses one browser.
const sessions = new Map<string, BrowserSession>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Launch Chrome + the CDP proxy inside a sandbox and connect Playwright. */
async function connect(sandbox: Sandbox): Promise<BrowserSession> {
  // 1. Launch Chrome with remote debugging.
  await sandbox.commands.run(CHROME_CMD, { background: true });
  await sleep(3500);

  // 2. Write the Host-rewriting proxy to a user-writable path via base64
  // (avoids /tmp permission conflicts) and start it.
  const proxyPath = "/home/user/cdp-proxy.py";
  const b64 = Buffer.from(CDP_PROXY_PY, "utf8").toString("base64");
  await sandbox.commands.run(`echo '${b64}' | base64 -d > ${proxyPath}`);
  await sandbox.commands.run(
    `nohup python3 ${proxyPath} > /home/user/cdp-proxy.log 2>&1 &`,
    { background: true },
  );

  // 3. Poll the public CDP endpoint until it responds.
  const publicHost = sandbox.getHost(PROXY_PORT);
  const cdpHttp = `https://${publicHost}`;
  let version: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    try {
      const res = await fetch(`${cdpHttp}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      // not ready yet
    }
  }
  if (!version?.webSocketDebuggerUrl) {
    throw new Error("Chrome CDP did not become reachable in the sandbox");
  }

  // 4. Build the PUBLIC wss URL from Chrome's internal ws path, then connect.
  const wsPath = new URL(version.webSocketDebuggerUrl).pathname;
  const publicWs = `wss://${publicHost}${wsPath}`;
  const browser = await chromium.connectOverCDP(publicWs, { timeout: 30000 });

  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);

  return { sandbox, browser, page, sandboxId: sandbox.sandboxId };
}

/**
 * Get (or create) the browser session for a sandbox. If no id is given, or the
 * sandbox isn't reachable, a fresh sandbox + browser is provisioned.
 */
export async function getBrowserSession(id?: string): Promise<BrowserSession> {
  if (id && sessions.has(id)) {
    const existing = sessions.get(id)!;
    if (existing.browser.isConnected()) return existing;
    sessions.delete(id);
  }

  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("E2B_API_KEY is not set");

  let sandbox: Sandbox | undefined;
  if (id) {
    try {
      const connected = await Sandbox.connect(id, { apiKey });
      if (await connected.isRunning()) sandbox = connected;
    } catch {
      // fall through to fresh sandbox
    }
  }
  if (!sandbox) {
    sandbox = await Sandbox.create({
      apiKey,
      resolution: [resolution.x, resolution.y],
      timeoutMs: 300000,
    });
  }

  // Desktop VNC stream (so the user can watch the live browser).
  try {
    await sandbox.stream.start();
  } catch {
    // may already be running
  }

  const session = await connect(sandbox);
  sessions.set(session.sandboxId, session);
  return session;
}

/** The public VNC stream URL for a sandbox, for the live-view panel. */
export async function getBrowserStreamURL(id?: string) {
  const session = await getBrowserSession(id);
  try {
    await session.sandbox.stream.start();
  } catch {
    // already running
  }
  const streamUrl = session.sandbox.stream.getUrl();
  return { streamUrl, id: session.sandboxId };
}

export async function killBrowserSession(id: string) {
  const s = sessions.get(id);
  sessions.delete(id);
  try {
    await s?.browser.close();
  } catch {
    // ignore
  }
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) return;
  try {
    const sandbox = s?.sandbox ?? (await Sandbox.connect(id, { apiKey }));
    await sandbox.kill();
  } catch {
    // ignore
  }
}
