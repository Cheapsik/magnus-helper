import type { RelationStatus } from "./types";

export const STORAGE_KEY = "magnus_relations_map";

export const BUILTIN_TYPES = [
  "Rodzina",
  "Sojusz",
  "Przyjaźń",
  "Romans",
  "Wrogość",
  "Mentor-Uczeń",
  "Pracodawca-Pracobiorca",
  "Rywal",
  "Tajemnica",
  "Dług",
  "Zależność",
  "Neutralny",
] as const;

export const STATUSES: RelationStatus[] = ["aktywna", "ukryta", "zmienna", "zerwana"];

export const LEGEND_TYPES = [
  "Sojusz",
  "Przyjaźń",
  "Rodzina",
  "Romans",
  "Wrogość",
  "Rywal",
  "Mentor-Uczeń",
  "Tajemnica",
  "Dług",
  "Neutralny",
] as const;

export const DEFAULT_PERSISTED_MAP = {
  nodes: [],
  edges: [],
  customRelationTypes: [],
  currentSessionId: "",
  sessionRecords: [],
};
