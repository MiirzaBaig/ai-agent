"use client";

import { useEffect } from "react";

// Browsers render favicons statically, so we "animate on refresh" by swapping
// the <link rel="icon"> through a few data-URI frames on mount, then settling.
// The frames blink the terminal cursor bar, matching the logo's caret.

const CHIP = `<rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="#c2f542" stroke="#111111" stroke-width="2.5"/>`;
const CHEVRON = `<path d="M8 8 16 16 8 24"/>`;
const CURSOR = `<path d="M18.5 23H25"/>`;

function frame(showCursor: boolean): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${CHIP}<g fill="none" stroke="#111111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${CHEVRON}${showCursor ? CURSOR : ""}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function FaviconAnimator() {
  useEffect(() => {
    // Find (or create) the icon link element.
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const original = link.href;

    // Blink the cursor a few times on load, then leave the full mark.
    const seq = [false, true, false, true, false, true];
    const timers: ReturnType<typeof setTimeout>[] = [];
    seq.forEach((show, i) => {
      timers.push(
        setTimeout(() => {
          if (link) link.href = frame(show);
        }, i * 220),
      );
    });
    // Settle back to the static asset so it stays crisp.
    timers.push(
      setTimeout(() => {
        if (link) link.href = original || frame(true);
      }, seq.length * 220 + 200),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
