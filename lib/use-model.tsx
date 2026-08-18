"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MODEL_ID, resolveModelId, type ModelId } from "@/lib/models";

const STORAGE_KEY = "ai-agent-model";

/**
 * Selected-model state, persisted to localStorage.
 * A single scalar, so a lightweight hook is enough — no context provider needed.
 */
export function useModel() {
  const [modelId, setModelIdState] = useState<ModelId>(DEFAULT_MODEL_ID);

  // Hydrate from storage on mount (client-only).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setModelIdState(resolveModelId(stored));
    } catch {
      // ignore — fall back to default
    }
  }, []);

  const setModelId = useCallback((id: ModelId) => {
    const resolved = resolveModelId(id);
    setModelIdState(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch {
      // ignore persistence failures
    }
  }, []);

  return { modelId, setModelId };
}
