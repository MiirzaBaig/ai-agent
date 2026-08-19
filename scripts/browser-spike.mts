// Make-or-break spike: Playwright driving Chrome inside E2B over CDP,
// with a Host+ws-URL rewriting proxy so getHost() works end to end.
import { Sandbox } from "@e2b/desktop";
import { chromium } from "playwright-core";
import { config } from "dotenv";
import { readFileSync } from "node:fs";

config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("E2B_API_KEY missing");

  console.log("1. Creating sandbox…");
  const sbx = await Sandbox.create({ apiKey, timeoutMs: 180000 });
  console.log("   sandbox:", sbx.sandboxId);

  try {
    console.log("2. Launching Chrome…");
    await sbx.commands.run(
      "nohup google-chrome --no-sandbox --remote-debugging-port=9222 --remote-allow-origins=* --no-first-run --no-default-browser-check --disable-dev-shm-usage --user-data-dir=/tmp/cp --start-maximized about:blank > /tmp/chrome.log 2>&1 &",
      { background: true },
    );
    await new Promise((r) => setTimeout(r, 4000));

    console.log("3. Uploading + starting CDP proxy…");
    const proxySrc = readFileSync("scripts/cdp-proxy.py", "utf8");
    await sbx.files.write("/tmp/cdp-proxy.py", proxySrc);
    const publicHost = sbx.getHost(9223);
    await sbx.commands.run(
      `PUBLIC_HOST=${publicHost} nohup python3 /tmp/cdp-proxy.py > /tmp/proxy.log 2>&1 &`,
      { background: true },
    );

    const cdpHttp = `https://${publicHost}`;
    console.log("   public CDP:", cdpHttp);

    console.log("4. Polling /json/version until CDP is reachable…");
    let version: any;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await fetch(`${cdpHttp}/json/version`);
        if (res.status === 200) {
          version = await res.json();
          console.log(`   ready after ${(i + 1) * 1.5}s`);
          break;
        }
        console.log(`   attempt ${i + 1}: ${res.status}`);
      } catch (e) {
        console.log(`   attempt ${i + 1}: ${String(e).slice(0, 60)}`);
      }
    }
    if (!version) throw new Error("CDP never became reachable");
    // Build the PUBLIC wss URL from Chrome's internal ws path.
    const wsPath = new URL(version.webSocketDebuggerUrl).pathname;
    const publicWs = `wss://${publicHost}${wsPath}`;
    console.log("   chrome ws:", version.webSocketDebuggerUrl);
    console.log("   public ws:", publicWs);

    console.log("5. Connecting Playwright over CDP (30s timeout)…");
    const browser = await chromium.connectOverCDP(publicWs, { timeout: 30000 });
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    console.log("6. Navigating to example.com…");
    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const title = await page.title();
    console.log("   ✅ PAGE TITLE:", title);

    console.log("7. Extracting a DOM element…");
    const h1 = await page.locator("h1").first().textContent();
    console.log("   ✅ H1 TEXT:", h1);

    await browser.close();
    console.log("\n✅✅ SPIKE PASSED — Playwright drives Chrome in E2B via CDP.");
  } catch (err) {
    console.error("\n❌ SPIKE FAILED:", err);
    for (const f of ["chrome", "proxy"]) {
      try {
        const log = await sbx.commands.run(`tail -15 /tmp/${f}.log 2>/dev/null`);
        console.error(`--- ${f}.log ---\n`, log.stdout || log.stderr);
      } catch {}
    }
  } finally {
    await sbx.kill();
    console.log("sandbox killed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
