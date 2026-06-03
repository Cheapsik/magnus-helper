import type { CharacterSheetCore } from "@/components/character-sheet/types";

export type EntityKind = "npc" | "hero";
export type RelationStatus = "aktywna" | "ukryta" | "zmienna" | "zerwana";

export interface HistoryEntry {
  id: string;
  ts: number;
  session?: string;
  message: string;
}

export interface NodeMeta {
  description?: string;
  secrets?: string;
  goals?: string;
  notes?: string;
  history?: HistoryEntry[];
}

export interface PersistedNode {
  id: string;
  type: EntityKind;
  position: { x: number; y: number };
  entityId: string;
  tags?: string[];
  pinned?: boolean;
  meta?: NodeMeta;
}

export interface PersistedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  relationType: string;
  customType?: string | null;
  description?: string;
  bidirectional: boolean;
  status?: RelationStatus;
  strength?: number;
  history?: HistoryEntry[];
  changedSince?: string;
}

export interface SessionRecord {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  snapshot: PersistedEdge[];
}

export interface PersistedMap {
  nodes: PersistedNode[];
  edges: PersistedEdge[];
  customRelationTypes: string[];
  currentSessionId?: string;
  sessionRecords: SessionRecord[];
}

export interface FilterState {
  kind: "all" | "npc" | "hero";
  faction: string;
  status: "all" | RelationStatus;
  relationType: string;
  pinnedOnly: boolean;
  changedOnly: boolean;
}

export type StoredHero = CharacterSheetCore & { id: string };

export interface EdgeDraft {
  relationType: string;
  customType: string | null;
  description: string;
  bidirectional: boolean;
  status: RelationStatus;
  strength: number;
}

export interface EntityLookupEntry {
  name: string;
  subtitle: string;
  description: string;
  kind: EntityKind;
  aliases: string[];
}

export interface SidebarEntry {
  id: string;
  kind: EntityKind;
  name: string;
  desc: string;
}

export interface TimelineItem {
  ts: number;
  session?: string;
  message: string;
  source: string;
}

export interface MapNodeData {
  entityId: string;
  kind: EntityKind;
  name: string;
  subtitle: string;
  pinned: boolean;
  missing?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  changed?: boolean;
  [key: string]: unknown;
}

export interface RelationEdgeData {
  relationType: string;
  customType?: string | null;
  description?: string;
  bidirectional: boolean;
  status: RelationStatus;
  strength: number;
  changed?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  label: string;
  [key: string]: unknown;
}

export type QuickLinkPhase = "idle" | "pickTarget" | "pickType";

export const DEFAULT_FILTER_STATE: FilterState = {
  kind: "all",
  faction: "all",
  status: "all",
  relationType: "all",
  pinnedOnly: false,
  changedOnly: false,
};

export const DEFAULT_EDGE_DRAFT: EdgeDraft = {
  relationType: "Sojusz",
  customType: null,
  description: "",
  bidirectional: true,
  status: "aktywna",
  strength: 3,
};
