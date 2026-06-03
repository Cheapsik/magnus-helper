import type { PersistedMap, PersistedEdge, SessionRecord } from "./types";
import { DEFAULT_PERSISTED_MAP } from "./constants";
import { newId, cloneEdges } from "./utils";

interface LegacyMap {
  nodes?: PersistedMap["nodes"];
  edges?: PersistedMap["edges"];
  customRelationTypes?: string[];
  currentSession?: string;
  sessions?: string[] | SessionRecord[];
  currentSessionId?: string;
  sessionRecords?: SessionRecord[];
}

export function migratePersistedMap(raw: unknown): PersistedMap {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PERSISTED_MAP };
  }

  const legacy = raw as LegacyMap;
  const nodes = Array.isArray(legacy.nodes) ? legacy.nodes : [];
  const edges = Array.isArray(legacy.edges) ? legacy.edges : [];
  const customRelationTypes = Array.isArray(legacy.customRelationTypes)
    ? legacy.customRelationTypes
    : [];

  let sessionRecords: SessionRecord[] = [];

  if (Array.isArray(legacy.sessionRecords) && legacy.sessionRecords.length > 0) {
    sessionRecords = legacy.sessionRecords.map((s) => ({
      id: s.id,
      name: s.name,
      startedAt: s.startedAt ?? Date.now(),
      endedAt: s.endedAt,
      snapshot: Array.isArray(s.snapshot) ? cloneEdges(s.snapshot) : [],
    }));
  } else if (Array.isArray(legacy.sessions)) {
    sessionRecords = legacy.sessions.map((s) => {
      if (typeof s === "string") {
        return {
          id: newId("sess"),
          name: s,
          startedAt: Date.now(),
          snapshot: [],
        };
      }
      return {
        id: s.id,
        name: s.name,
        startedAt: s.startedAt ?? Date.now(),
        endedAt: s.endedAt,
        snapshot: Array.isArray(s.snapshot) ? cloneEdges(s.snapshot) : [],
      };
    });
  }

  let currentSessionId = legacy.currentSessionId ?? "";

  if (!currentSessionId && legacy.currentSession) {
    const match = sessionRecords.find((s) => s.name === legacy.currentSession);
    currentSessionId = match?.id ?? legacy.currentSession;
    if (!match && legacy.currentSession) {
      const id = newId("sess");
      sessionRecords.push({
        id,
        name: legacy.currentSession,
        startedAt: Date.now(),
        snapshot: cloneEdges(edges),
      });
      currentSessionId = id;
    }
  }

  return {
    nodes,
    edges,
    customRelationTypes,
    currentSessionId,
    sessionRecords,
  };
}

export function getCurrentSession(
  map: PersistedMap
): SessionRecord | undefined {
  return map.sessionRecords.find((s) => s.id === map.currentSessionId);
}

export function getSessionName(map: PersistedMap): string {
  return getCurrentSession(map)?.name ?? "";
}
