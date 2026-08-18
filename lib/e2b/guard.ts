// Server-side approval gate for shell commands.
//
// The agent runs bash inside an isolated E2B sandbox, but "isolated" is not
// "harmless" — a destructive command still wipes the workspace the user is
// watching. This guard enforces controlled autonomy: genuinely irreversible
// or system-level commands are blocked and the agent is told to ask the user
// for explicit confirmation instead of firing them unattended.

export type CommandRisk = {
  /** Whether the command is allowed to run. */
  allowed: boolean;
  /** Human-readable reason, shown to the agent and surfaced in the timeline. */
  reason?: string;
  /** The pattern label that matched, for display. */
  rule?: string;
};

type Rule = { label: string; test: RegExp; why: string };

// Patterns for irreversible / high-blast-radius operations. Deliberately
// conservative — this blocks the clearly-dangerous, not everyday commands.
const BLOCK_RULES: Rule[] = [
  {
    label: "recursive force delete",
    test: /\brm\s+(-[a-z]*f[a-z]*r|-[a-z]*r[a-z]*f|-[rf]\s+-[rf])\b|\brm\s+-[rf]{1,2}\s+\/(?:\s|$)/i,
    why: "recursively force-deletes files",
  },
  {
    label: "delete root / home",
    test: /\brm\b[^|;&]*\s(\/|\/\*|~|\$HOME|\/root|\/home)(\s|$)/i,
    why: "targets the filesystem root or a home directory",
  },
  {
    label: "disk write / format",
    test: /\b(mkfs\S*|dd)\b[^|;&]*\bof=\/dev\/|\bmkfs\b|\bfdisk\b|\bwipefs\b/i,
    why: "formats or writes directly to a disk device",
  },
  {
    label: "device redirect",
    test: />\s*\/dev\/(sd[a-z]|nvme\d|disk\d|null\s*2>&1\s*;\s*rm)/i,
    why: "redirects output onto a raw block device",
  },
  {
    label: "power / system control",
    test: /\b(shutdown|reboot|halt|poweroff|init\s+0|init\s+6)\b/i,
    why: "powers off or reboots the machine",
  },
  {
    label: "fork bomb",
    test: /:\(\)\s*\{\s*:\|:&\s*\}\s*;?\s*:/,
    why: "is a fork bomb that would exhaust system resources",
  },
  {
    label: "recursive chmod/chown on root",
    test: /\b(chmod|chown)\s+-[a-z]*R[a-z]*\s+[^|;&]*\s\/(\s|$)/i,
    why: "recursively changes permissions/ownership from the filesystem root",
  },
  {
    label: "curl/wget pipe to shell",
    test: /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(bash|sh|zsh)\b/i,
    why: "pipes remote content directly into a shell (unvetted code execution)",
  },
];

export function classifyCommand(command: string): CommandRisk {
  const cmd = (command || "").trim();
  if (!cmd) return { allowed: true };

  for (const rule of BLOCK_RULES) {
    if (rule.test.test(cmd)) {
      return {
        allowed: false,
        rule: rule.label,
        reason: `This command ${rule.why}.`,
      };
    }
  }
  return { allowed: true };
}

/** The message returned to the agent when a command is gated. */
export function blockMessage(risk: CommandRisk): string {
  return (
    `⛔ Blocked by approval gate (${risk.rule}). ${risk.reason} ` +
    `Destructive or system-level actions require explicit user confirmation. ` +
    `Do not retry this command. Instead, describe what you intended to do and ` +
    `ask the user to confirm before proceeding, or choose a safer, reversible approach.`
  );
}
