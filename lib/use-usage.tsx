"use client";

import { useCallback, useEffect, useState } from "react";
import { estimateCost, type ModelId } from "@/lib/models";

export type SessionUsage = {
  /** Cumulative input (prompt) tokens across all runs this session. */
  inputTokens: number;
  /** Cumulative output (completion) tokens. */
  outputTokens: number;
  /** Number of completed agent runs (turns). */
  runs: number;
  /** Model ids that have run in this session, most-recent last. */
  models: ModelId[];
};

const EMPTY: SessionUsage = {
  inputTokens: 0,
  outputTokens: 0,
  runs: 0,
  models: [],
};

function storageKey(sessionId: string) {
  return `ai-usage-${sessionId}`;
}

/**
 * Per-session token + cost telemetry, persisted to localStorage.
 * Mirrors the runs / costs / model-routing dashboard pattern.
 */
export function useUsage(sessionId: string | null) {
  const [usage, setUsage] = useState<SessionUsage>(EMPTY);

  // Load when the active session changes.
  useEffect(() => {
    if (!sessionId) {
      setUsage(EMPTY);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(sessionId));
      setUsage(raw ? { ...EMPTY, ...(JSON.parse(raw) as SessionUsage) } : EMPTY);
    } catch {
      setUsage(EMPTY);
    }
  }, [sessionId]);

  /** Record one completed run's usage. */
  const recordRun = useCallback(
    (
      modelId: ModelId,
      tokens: { inputTokens?: number; outputTokens?: number },
    ) => {
      if (!sessionId) return;
      setUsage((prev) => {
        const models = prev.models.includes(modelId)
          ? prev.models
          : [...prev.models, modelId];
        const next: SessionUsage = {
          inputTokens: prev.inputTokens + (tokens.inputTokens ?? 0),
          outputTokens: prev.outputTokens + (tokens.outputTokens ?? 0),
          runs: prev.runs + 1,
          models,
        };
        try {
          localStorage.setItem(storageKey(sessionId), JSON.stringify(next));
        } catch {
          // ignore persistence failures
        }
        return next;
      });
    },
    [sessionId],
  );

  // Cost is derived from the most recent model that ran (the active routing
  // target); good enough for a per-session estimate.
  const activeModel = usage.models[usage.models.length - 1];
  const cost = estimateCost(activeModel, usage.inputTokens, usage.outputTokens);

  return { usage, recordRun, cost };
}
