// Central registry of models the agent can run on.
// Single source of truth for the model selector UI and cost telemetry.
// Pricing is USD per 1M tokens (see https://platform.claude.com/docs/en/pricing).

export type ModelId =
  | "claude-opus-4-8"
  | "claude-sonnet-5"
  | "claude-haiku-4-5";

export type ModelInfo = {
  id: ModelId;
  /** Short label for the selector. */
  label: string;
  /** One-line positioning shown in the selector dropdown. */
  tagline: string;
  /** USD per 1M input tokens. */
  inputPricePerM: number;
  /** USD per 1M output tokens. */
  outputPricePerM: number;
};

export const MODELS: ModelInfo[] = [
  {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    tagline: "Most capable — best computer-use accuracy",
    inputPricePerM: 5,
    outputPricePerM: 25,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    tagline: "Near-Opus quality, faster and cheaper",
    inputPricePerM: 3,
    outputPricePerM: 15,
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    tagline: "Fastest and most economical",
    inputPricePerM: 1,
    outputPricePerM: 5,
  },
];

// Sonnet 5 is the sweet spot for computer-use: much smarter than Haiku per
// step (fewer wrong clicks → fewer steps → faster + cheaper to finish a task),
// at lower per-token cost than Opus.
export const DEFAULT_MODEL_ID: ModelId = "claude-sonnet-5";

const MODELS_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function getModel(id: string | null | undefined): ModelInfo {
  return (
    (id && MODELS_BY_ID.get(id as ModelId)) ||
    MODELS_BY_ID.get(DEFAULT_MODEL_ID) ||
    MODELS[0]
  );
}

/** Server-side guard: resolve an untrusted model string to a known, allowed id. */
export function resolveModelId(id: string | null | undefined): ModelId {
  return id && MODELS_BY_ID.has(id as ModelId)
    ? (id as ModelId)
    : DEFAULT_MODEL_ID;
}

/** Estimate USD cost from token usage for a given model. */
export function estimateCost(
  modelId: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const m = getModel(modelId);
  return (
    (inputTokens / 1_000_000) * m.inputPricePerM +
    (outputTokens / 1_000_000) * m.outputPricePerM
  );
}
