import type { AgentEvent } from "@/lib/events/types";
import { describeEvent, screenshotOf } from "@/lib/events/describe";

// A shareable "proof receipt": a self-contained HTML file with every step, its
// screenshot, timing, and a content hash — verifiable evidence the agent did
// the work. Downloadable, openable in any browser, no dependencies.

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

// Render a small, safe subset of markdown (bold, italic, inline code, bullet
// lists, line breaks). Escapes first, so no user text can inject HTML.
function mdToHtml(src: string): string {
  const inline = (line: string) =>
    esc(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  const out: string[] = [];
  let inList = false;
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (line) out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

export async function buildReceiptHtml(opts: {
  task: string;
  answer: string;
  events: AgentEvent[];
}): Promise<string> {
  const { task, answer, events } = opts;
  const when = new Date();
  const verified = events.filter((e) => e.status === "complete").length;

  const stepsHash = await sha256(
    events.map((e) => `${e.type}:${describeEvent(e)}:${e.timestamp}`).join("|"),
  );

  // Contact-sheet of captured frames for the hero strip (mirrors the in-app
  // filmstrip). Cap the thumbnail count so the file stays shareable.
  const shots = events
    .map((e) => ({ shot: screenshotOf(e), label: describeEvent(e) }))
    .filter((s): s is { shot: string; label: string } => Boolean(s.shot));
  const MAX_THUMBS = 12;
  const thumbsPick =
    shots.length <= MAX_THUMBS
      ? shots
      : shots.filter(
          (_, i) => i % Math.ceil(shots.length / MAX_THUMBS) === 0,
        );
  const filmstrip = shots.length
    ? `<div class="film">${thumbsPick
        .map(
          (s, i) =>
            `<figure class="frame"><img src="data:image/png;base64,${s.shot}" alt="${esc(
              s.label,
            )}"/><figcaption>${i + 1}</figcaption></figure>`,
        )
        .join("")}</div>`
    : "";

  const steps = events
    .map((e, i) => {
      const shot = screenshotOf(e);
      const dur =
        e.duration != null
          ? e.duration < 1000
            ? `${e.duration}ms`
            : `${(e.duration / 1000).toFixed(1)}s`
          : "";
      return `<li class="step">
        <div class="step-head">
          <span class="badge">${e.status === "complete" ? "✓" : e.status === "error" ? "✕" : "…"}</span>
          <span class="num">${i + 1}</span>
          <span class="label">${esc(describeEvent(e))}</span>
          <span class="dur">${dur}</span>
        </div>
        ${shot ? `<img class="shot" src="data:image/png;base64,${shot}" alt="step ${i + 1}"/>` : ""}
      </li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sentry Proof Receipt</title>
<style>
  :root{--ink:#111;--paper:#f5f3eb;--lime:#c2f542;--violet:#a855f7}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:#18181b;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:32px 20px 64px}
  .card{background:#fff;border:2.5px solid var(--ink);border-radius:16px;box-shadow:6px 6px 0 0 var(--ink);padding:24px;margin-bottom:24px}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .chip{width:34px;height:34px;border:2.5px solid var(--ink);border-radius:9px;background:var(--lime);display:flex;align-items:center;justify-content:center;font-weight:900}
  h1{font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-.5px;margin:0}
  .sub{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#71717a}
  .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .pill{border:2px solid var(--ink);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:800}
  .pill.lime{background:var(--lime)}
  .task{background:#fff;border:2.5px solid var(--ink);border-radius:12px;padding:12px 14px;font-weight:600}
  h2{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#71717a;margin:24px 0 8px}
  ol.steps{list-style:none;margin:0;padding:0}
  .step{border:2.5px solid var(--ink);border-radius:12px;background:#fff;margin-bottom:12px;overflow:hidden}
  .step-head{display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:600}
  .badge{width:20px;height:20px;border:2px solid var(--ink);border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex:0 0 auto}
  .num{font-size:11px;color:#a1a1aa;font-weight:800}
  .label{flex:1}
  .dur{font-size:11px;color:#a1a1aa;font-variant-numeric:tabular-nums}
  .shot{display:block;width:100%;max-height:420px;object-fit:cover;object-position:top;border-top:2px solid var(--ink)}
  .answer p{margin:0 0 10px}
  .answer p:last-child{margin-bottom:0}
  .answer ul{margin:0 0 10px;padding-left:20px}
  .answer li{margin:2px 0}
  .answer strong{font-weight:800}
  .answer code{background:#ececec}
  .foot{text-align:center;font-size:11px;color:#a1a1aa;margin-top:20px}
  code{background:#ececec;border-radius:4px;padding:1px 5px;font-size:12px;word-break:break-all}
  .film{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px}
  .frame{margin:0;position:relative;flex:0 0 auto;width:120px}
  .frame img{display:block;width:120px;height:76px;object-fit:cover;object-position:top;border:2.5px solid var(--ink);border-radius:8px;box-shadow:3px 3px 0 0 var(--ink)}
  .frame figcaption{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.65);color:#fff;font-size:9px;font-weight:900;border-radius:4px;padding:1px 5px}
</style></head>
<body><div class="wrap">
  <div class="card">
    <div class="brand"><span class="chip">&gt;_</span>
      <div><h1>Proof Receipt</h1><div class="sub">Sentry · Autonomous browser agent</div></div>
    </div>
    <div class="meta">
      <span class="pill lime">${verified} verified</span>
      <span class="pill">${events.length} steps</span>
      <span class="pill">${esc(when.toLocaleString())}</span>
    </div>
  </div>

  ${filmstrip ? `<h2>Captured frames</h2><div class="card" style="padding:12px">${filmstrip}</div>` : ""}

  <h2>Task</h2>
  <div class="task">${esc(task)}</div>

  <h2>Steps (${events.length})</h2>
  <ol class="steps">${steps}</ol>

  ${answer ? `<h2>Result</h2><div class="card answer">${mdToHtml(answer)}</div>` : ""}

  <div class="card">
    <h2 style="margin-top:0">Integrity</h2>
    <div>Steps hash (SHA-256): <code>${stepsHash}</code></div>
  </div>

  <div class="foot">Generated by Sentry — every action recorded, every result verifiable.</div>
</div></body></html>`;
}

/** Build the receipt and trigger a browser download. */
export async function downloadReceipt(opts: {
  task: string;
  answer: string;
  events: AgentEvent[];
}) {
  const html = await buildReceiptHtml(opts);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sentry-receipt-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
