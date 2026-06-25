"use client";

import { useCallback, useState } from "react";

import type { FlowCategory } from "@/lib/classifyTaste";

const FLOW_SESSION_KEY = "flowstate.session";
const FLOW_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type FlowSessionMode = FlowCategory;

export type FlowSessionSnapshot = {
  lastMoodInput: string | null;
  lastRecommendationMode: FlowSessionMode | null;
  lastScene: FlowSessionMode | null;
  selectedMode: FlowSessionMode | null;
  savedAt: number;
};

type FlowSessionUpdate = Partial<
  Omit<FlowSessionSnapshot, "savedAt">
>;

const flowModes: FlowSessionMode[] = [
  "focus",
  "escape",
  "chill",
  "energy",
  "worship",
];

function isFlowMode(value: unknown): value is FlowSessionMode {
  return typeof value === "string" && flowModes.includes(value as FlowSessionMode);
}

function emptySession(): FlowSessionSnapshot {
  return {
    lastMoodInput: null,
    lastRecommendationMode: null,
    lastScene: null,
    selectedMode: null,
    savedAt: Date.now(),
  };
}

function normalizeSession(value: unknown): FlowSessionSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<FlowSessionSnapshot>;

  if (typeof candidate.savedAt !== "number") {
    return null;
  }

  return {
    lastMoodInput:
      typeof candidate.lastMoodInput === "string"
        ? candidate.lastMoodInput
        : null,
    lastRecommendationMode: isFlowMode(candidate.lastRecommendationMode)
      ? candidate.lastRecommendationMode
      : null,
    lastScene: isFlowMode(candidate.lastScene) ? candidate.lastScene : null,
    selectedMode: isFlowMode(candidate.selectedMode)
      ? candidate.selectedMode
      : null,
    savedAt: candidate.savedAt,
  };
}

function readStoredSession(): FlowSessionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(FLOW_SESSION_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const session = normalizeSession(JSON.parse(storedValue));

    if (!session || Date.now() - session.savedAt > FLOW_SESSION_TTL_MS) {
      window.localStorage.removeItem(FLOW_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(FLOW_SESSION_KEY);
    return null;
  }
}

export function useFlowSession() {
  const [session, setSession] = useState<FlowSessionSnapshot | null>(() =>
    readStoredSession(),
  );
  const [isReady, setIsReady] = useState(true);

  const restoreSession = useCallback(() => {
    const restoredSession = readStoredSession();

    setSession(restoredSession);
    setIsReady(true);

    return restoredSession;
  }, []);

  const saveSession = useCallback((update: FlowSessionUpdate) => {
    if (typeof window === "undefined") {
      return null;
    }

    const nextSession: FlowSessionSnapshot = {
      ...(readStoredSession() ?? emptySession()),
      ...update,
      savedAt: Date.now(),
    };

    window.localStorage.setItem(FLOW_SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setIsReady(true);

    return nextSession;
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FLOW_SESSION_KEY);
    }

    setSession(null);
    setIsReady(true);
  }, []);

  return {
    clearSession,
    isReady,
    restoreSession,
    saveSession,
    session,
  };
}
