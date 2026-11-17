// Tracks "critical flows" (OTP entry, uploads, checkout steps) so that
// window-focus refetches don't wipe in-progress UI state when the user
// switches away (e.g. to their SMS app) and comes back.

import { useEffect } from "react";

const active = new Set<string>();

export function beginCriticalFlow(id: string) {
  active.add(id);
}

export function endCriticalFlow(id: string) {
  active.delete(id);
}

export function isCriticalFlowActive() {
  return active.size > 0;
}

/** Marks a critical flow active for as long as `enabled` is true. */
export function useCriticalFlow(id: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    beginCriticalFlow(id);
    return () => endCriticalFlow(id);
  }, [id, enabled]);
}

// ─── Session-persisted flow state ────────────────────────────────────────────

export function loadFlowState<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`flow:${key}`);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveFlowState(key: string, value: unknown) {
  try {
    sessionStorage.setItem(`flow:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearFlowState(key: string) {
  try {
    sessionStorage.removeItem(`flow:${key}`);
  } catch {
    /* ignore */
  }
}
