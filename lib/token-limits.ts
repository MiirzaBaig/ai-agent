export const TOKEN_TOP_UP_EMAIL = "mirza.devs@gmail.com";

const LIMIT_PATTERNS = [
  /token/i,
  /context/i,
  /rate.?limit/i,
  /quota/i,
  /credit/i,
  /billing/i,
  /insufficient/i,
  /exceed/i,
  /too many requests/i,
  /429/,
];

export function isTokenLimitError(message: string) {
  return LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function tokenLimitMessage() {
  return [
    "Sentry hit the demo token limit.",
    `For more runs, contact ${TOKEN_TOP_UP_EMAIL} and I'll add credits.`,
  ].join(" ");
}
