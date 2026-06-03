import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useApp } from "@/context/AppContext";
import type { SavedNpc } from "@/components/character-sheet/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { BUILTIN_TYPES, DEFAULT_PERSISTED_MAP, STORAGE_KEY } from "../constants";
import { statusLabel } from "../colors";
import { migratePersistedMap, getSessionName } from "../storage";
import {
  buildLookup,
  buildSidebarEntries,
  buildTimeline,
  countChangedEdges,
  useVisibleGraph,
} from "../hooks/useRelationsMapState";
import { useGraphHighlight } from "../hooks/useGraphHighlight";
import { useQuickLinkMode } from "../hooks/useQuickLinkMode";
import { cloneEdges, newId } from "../utils";
import type {
  EdgeDraft,
  EntityKind,
  EntityLookupEntry,
  FilterState,
  HistoryEntry,
  NodeMeta,
  PersistedEdge,
  PersistedMap,
  PersistedNode,
  SidebarEntry,
  StoredHero,
  TimelineItem,
} from "../types";
import { DEFAULT_EDGE_DRAFT } from "../types";

// re-export defaults
const INITIAL_FILTERS: FilterState = {
  kind: "all",
  faction: "all",
  status: "all",
  relationType: "all",
  pinnedOnly: false,
  changedOnly: false,
};

interface RelationsMapContextValue {
  persisted: PersistedMap;
  setPersisted: (fn: PersistedMap | ((prev: PersistedMap) => PersistedMap)) => void;
  savedNpcs: SavedNpc[];
  heroes: StoredHero[];
  lookup: Map<string, EntityLookupEntry>;
  displayEdges: PersistedEdge[];
  visibleNodeIds: Set<string>;
  visibleEdges: PersistedEdge[];
  edgesByNode: Map<string, PersistedEdge[]>;
  allTags: string[];
  allTypes: string[];
  sidebarEntries: SidebarEntry[];
  onCanvasIds: Set<string>;
  timeline: TimelineItem[];
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  resetFilters: () => void;
  search: string;
  setSearch: (s: string) => void;
  sessionMode: boolean;
  setSessionMode: Dispatch<SetStateAction<boolean>>;
  uiVisible: boolean;
  setUiVisible: Dispatch<SetStateAction<boolean>>;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  showLegend: boolean;
  setShowLegend: Dispatch<SetStateAction<boolean>>;
  showSessions: boolean;
  setShowSessions: Dispatch<SetStateAction<boolean>>;
  showTimeline: boolean;
  setShowTimeline: Dispatch<SetStateAction<boolean>>;
  detailPanelOpen: boolean;
  setDetailPanelOpen: Dispatch<SetStateAction<boolean>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  hasSelection: boolean;
  previewSessionId: string | null;
  setPreviewSessionId: (id: string | null) => void;
  previewSessionName: string | null;
  isReadOnly: boolean;
  activeTab: string;
  setActiveTab: (t: string) => void;
  editingNode: PersistedNode | null;
  editingEntity: EntityLookupEntry | null | undefined;
  editingFullNpc: SavedNpc | undefined;
  editingFullHero: StoredHero | undefined;
  editingEdges: PersistedEdge[];
  currentSessionName: string;
  changedCount: number;
  hasChangedFlags: boolean;
  linkingBanner: string | null;
  quickLink: ReturnType<typeof useQuickLinkMode>;
  edgeDraft: EdgeDraft;
  setEdgeDraft: Dispatch<SetStateAction<EdgeDraft>>;
  editingEdgeId: string | null;
  setEditingEdgeId: (id: string | null) => void;
  addEntityToCanvas: (entityId: string, kind: EntityKind) => void;
  handleTogglePin: (nodeId: string) => void;
  updateNodeMeta: (nodeId: string, patch: Partial<NodeMeta>) => void;
  addNodeHistory: (nodeId: string, message: string) => void;
  addTag: (nodeId: string, tag: string) => void;
  removeTag: (nodeId: string, tag: string) => void;
  startNewSession: () => void;
  clearChangedFlags: () => void;
  exitPreview: () => void;
  commitQuickRelation: (relationType: string) => void;
  updateExistingEdge: (closeId?: string | null) => void;
  deleteExistingEdge: () => void;
  onOpenDetail: (nodeId: string) => void;
  onStartQuickLink: (nodeId: string) => void;
  onEditEdge: (edgeId: string) => void;
  handleNodeClick: (nodeId: string) => void;
  handlePaneClick: () => void;
  autoLayoutRef: React.MutableRefObject<(() => void) | null>;
}

const RelationsMapContext = createContext<RelationsMapContextValue | null>(null);
const RelationsMapActionsContext = createContext<{
  onOpenDetail: (nodeId: string) => void;
  onStartQuickLink: (nodeId: string) => void;
  onEditEdge: (edgeId: string) => void;
} | null>(null);

export function useRelationsMap() {
  const ctx = useContext(RelationsMapContext);
  if (!ctx) throw new Error("useRelationsMap outside provider");
  return ctx;
}

export function useRelationsMapActions() {
  const ctx = useContext(RelationsMapActionsContext);
  if (!ctx) throw new Error("useRelationsMapActions outside provider");
  return ctx;
}

export function RelationsMapProvider({ children }: { children: ReactNode }) {
  const { savedNpcs } = useApp();
  const [heroes] = useLocalStorage<StoredHero[]>("rpg_characters", []);
  const [persisted, setPersisted] = useLocalStorage<PersistedMap>(
    STORAGE_KEY,
    DEFAULT_PERSISTED_MAP,
    { revive: migratePersistedMap }
  );

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sessionMode, setSessionMode] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("opis");
  const [edgeDraft, setEdgeDraft] = useState<EdgeDraft>(DEFAULT_EDGE_DRAFT);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const autoLayoutRef = { current: null as (() => void) | null };

  const quickLink = useQuickLinkMode();
  const lookup = useMemo(() => buildLookup(savedNpcs, heroes), [savedNpcs, heroes]);

  useEffect(() => {
    if (sessionMode) setDetailPanelOpen(false);
  }, [sessionMode]);

  const displayEdges = useMemo(() => {
    if (!previewSessionId) return persisted.edges;
    const session = persisted.sessionRecords.find((s) => s.id === previewSessionId);
    return session?.snapshot.length ? session.snapshot : persisted.edges;
  }, [previewSessionId, persisted]);

  const { visibleNodeIds, visibleEdges, edgesByNode, allTags } = useVisibleGraph({
    persisted,
    displayEdges,
    lookup,
    filters,
    search,
    sessionMode,
  });

  const { highlightedNodeIds, highlightedEdgeIds, hasSelection } = useGraphHighlight(
    selectedNodeId,
    visibleEdges
  );

  const allTypes = useMemo(
    () => [...BUILTIN_TYPES, ...persisted.customRelationTypes],
    [persisted.customRelationTypes]
  );

  const sidebarEntries = useMemo(
    () => buildSidebarEntries(savedNpcs, heroes, search),
    [savedNpcs, heroes, search]
  );

  const onCanvasIds = useMemo(
    () => new Set(persisted.nodes.map((n) => n.entityId)),
    [persisted.nodes]
  );

  const timeline = useMemo(() => buildTimeline(persisted, lookup), [persisted, lookup]);

  const editingNode = selectedNodeId
    ? persisted.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const editingEntity = editingNode ? lookup.get(editingNode.entityId) : null;
  const editingFullNpc =
    editingNode?.type === "npc"
      ? savedNpcs.find((n) => n.id === editingNode.entityId)
      : undefined;
  const editingFullHero =
    editingNode?.type === "hero"
      ? heroes.find((h) => h.id === editingNode.entityId)
      : undefined;
  const editingEdges = useMemo(
    () =>
      editingNode
        ? displayEdges.filter(
            (e) => e.source === editingNode.id || e.target === editingNode.id
          )
        : [],
    [editingNode, displayEdges]
  );

  const currentSessionName = getSessionName(persisted);
  const changedCount = countChangedEdges(persisted.edges);
  const hasChangedFlags = changedCount > 0;
  const isReadOnly = !!previewSessionId;

  const previewSessionName = previewSessionId
    ? persisted.sessionRecords.find((s) => s.id === previewSessionId)?.name ?? null
    : null;

  const linkingBanner =
    quickLink.phase === "pickTarget" && quickLink.sourceNodeId
      ? `Wybierz postać docelową dla relacji z „${lookup.get(persisted.nodes.find((n) => n.id === quickLink.sourceNodeId)?.entityId ?? "")?.name ?? "?"}"`
      : null;

  const resetFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const getSessionLabel = useCallback(
    () =>
      persisted.sessionRecords.find((s) => s.id === persisted.currentSessionId)?.name ??
      persisted.currentSessionId ??
      undefined,
    [persisted]
  );

  const recordEdgeChange = useCallback(
    (e: PersistedEdge, message: string): PersistedEdge => {
      const entry: HistoryEntry = {
        id: newId("h"),
        ts: Date.now(),
        session: getSessionLabel(),
        message,
      };
      return {
        ...e,
        history: [...(e.history ?? []), entry],
        changedSince: persisted.currentSessionId || e.changedSince,
      };
    },
    [persisted.currentSessionId, getSessionLabel]
  );

  const addEntityToCanvas = useCallback(
    (entityId: string, kind: EntityKind) => {
      if (isReadOnly) return;
      if (persisted.nodes.some((n) => n.entityId === entityId)) return;
      const newNode: PersistedNode = {
        id: `${kind}_${entityId}`,
        type: kind,
        position: { x: 120 + Math.random() * 200, y: 120 + Math.random() * 200 },
        entityId,
        tags: [],
        pinned: false,
        meta: {},
      };
      setPersisted((p) => ({ ...p, nodes: [...p.nodes, newNode] }));
    },
    [persisted.nodes, setPersisted, isReadOnly]
  );

  const handleTogglePin = useCallback(
    (nodeId: string) => {
      if (isReadOnly) return;
      setPersisted((p) => ({
        ...p,
        nodes: p.nodes.map((n) =>
          n.id === nodeId ? { ...n, pinned: !n.pinned } : n
        ),
      }));
    },
    [setPersisted, isReadOnly]
  );

  const updateNodeMeta = useCallback(
    (nodeId: string, patch: Partial<NodeMeta>) => {
      if (isReadOnly) return;
      setPersisted((p) => ({
        ...p,
        nodes: p.nodes.map((n) =>
          n.id === nodeId ? { ...n, meta: { ...(n.meta ?? {}), ...patch } } : n
        ),
      }));
    },
    [setPersisted, isReadOnly]
  );

  const addNodeHistory = useCallback(
    (nodeId: string, message: string) => {
      if (isReadOnly || !message.trim()) return;
      setPersisted((p) => ({
        ...p,
        nodes: p.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                meta: {
                  ...(n.meta ?? {}),
                  history: [
                    ...(n.meta?.history ?? []),
                    {
                      id: newId("h"),
                      ts: Date.now(),
                      session: getSessionLabel(),
                      message,
                    },
                  ],
                },
              }
            : n
        ),
      }));
    },
    [setPersisted, isReadOnly, getSessionLabel]
  );

  const addTag = useCallback(
    (nodeId: string, tag: string) => {
      if (isReadOnly || !tag.trim()) return;
      setPersisted((p) => ({
        ...p,
        nodes: p.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, tags: Array.from(new Set([...(n.tags ?? []), tag.trim()])) }
            : n
        ),
      }));
    },
    [setPersisted, isReadOnly]
  );

  const removeTag = useCallback(
    (nodeId: string, tag: string) => {
      if (isReadOnly) return;
      setPersisted((p) => ({
        ...p,
        nodes: p.nodes.map((n) =>
          n.id === nodeId ? { ...n, tags: (n.tags ?? []).filter((t) => t !== tag) } : n
        ),
      }));
    },
    [setPersisted, isReadOnly]
  );

  const startNewSession = useCallback(() => {
    const name = window.prompt('Nazwa sesji (np. "Sesja 12")');
    if (!name?.trim()) return;
    const now = Date.now();
    setPersisted((p) => {
      let records = [...p.sessionRecords];
      if (p.currentSessionId) {
        records = records.map((s) =>
          s.id === p.currentSessionId
            ? { ...s, endedAt: now, snapshot: cloneEdges(p.edges) }
            : s
        );
      }
      const newSession = {
        id: newId("sess"),
        name: name.trim(),
        startedAt: now,
        snapshot: [] as PersistedEdge[],
      };
      toast.success(`Rozpoczęto sesję: ${name.trim()}`);
      return {
        ...p,
        currentSessionId: newSession.id,
        sessionRecords: [...records, newSession],
      };
    });
  }, [setPersisted]);

  const clearChangedFlags = useCallback(() => {
    const count = countChangedEdges(persisted.edges);
    if (count === 0) return;
    setPersisted((p) => ({
      ...p,
      edges: p.edges.map((e) => ({ ...e, changedSince: undefined })),
    }));
    toast.success(
      count === 1
        ? "Usunięto znacznik NEW z 1 relacji"
        : `Usunięto znaczniki NEW z ${count} relacji`
    );
  }, [persisted.edges, setPersisted]);

  const exitPreview = useCallback(() => setPreviewSessionId(null), []);

  const commitQuickRelation = useCallback(
    (relationType: string) => {
      if (isReadOnly || !quickLink.sourceNodeId || !quickLink.targetNodeId) return;
      const newEdge: PersistedEdge = {
        id: newId("edge"),
        source: quickLink.sourceNodeId,
        target: quickLink.targetNodeId,
        relationType,
        customType: null,
        description: "",
        bidirectional: true,
        status: "aktywna",
        strength: 3,
        history: [
          {
            id: newId("h"),
            ts: Date.now(),
            session: getSessionLabel(),
            message: `Utworzono relację: ${relationType}`,
          },
        ],
        changedSince: persisted.currentSessionId || undefined,
      };
      setPersisted((p) => ({ ...p, edges: [...p.edges, newEdge] }));
      quickLink.finishLink();
      toast.success("Dodano relację");
    },
    [
      isReadOnly,
      quickLink,
      setPersisted,
      getSessionLabel,
      persisted.currentSessionId,
    ]
  );

  const updateExistingEdge = useCallback(
    (closeId: string | null = editingEdgeId) => {
      if (isReadOnly || !closeId) return;
      setPersisted((p) => ({
        ...p,
        edges: p.edges.map((e) => {
          if (e.id !== closeId) return e;
          const newLabel = edgeDraft.customType || edgeDraft.relationType;
          const oldLabel = e.customType || e.relationType;
          const diff: string[] = [];
          if (newLabel !== oldLabel) diff.push(`typ: ${oldLabel} → ${newLabel}`);
          if ((e.status ?? "aktywna") !== edgeDraft.status)
            diff.push(
              `status: ${statusLabel[e.status ?? "aktywna"]} → ${statusLabel[edgeDraft.status]}`
            );
          if ((e.strength ?? 3) !== edgeDraft.strength)
            diff.push(`siła: ${e.strength ?? 3} → ${edgeDraft.strength}`);
          const updated: PersistedEdge = {
            ...e,
            relationType: edgeDraft.relationType,
            customType: edgeDraft.customType || null,
            description: edgeDraft.description || "",
            bidirectional: edgeDraft.bidirectional,
            status: edgeDraft.status,
            strength: edgeDraft.strength,
          };
          return diff.length > 0 ? recordEdgeChange(updated, diff.join("; ")) : updated;
        }),
        customRelationTypes:
          edgeDraft.customType && !p.customRelationTypes.includes(edgeDraft.customType)
            ? [...p.customRelationTypes, edgeDraft.customType]
            : p.customRelationTypes,
      }));
      setEditingEdgeId(null);
    },
    [isReadOnly, editingEdgeId, edgeDraft, setPersisted, recordEdgeChange]
  );

  const deleteExistingEdge = useCallback(() => {
    if (isReadOnly || !editingEdgeId) return;
    setPersisted((p) => ({
      ...p,
      edges: p.edges.filter((e) => e.id !== editingEdgeId),
    }));
    setEditingEdgeId(null);
  }, [isReadOnly, editingEdgeId, setPersisted]);

  const onOpenDetail = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDetailPanelOpen(true);
    setActiveTab("opis");
  }, []);

  const onStartQuickLink = useCallback(
    (nodeId: string) => {
      if (isReadOnly) return;
      quickLink.startLink(nodeId);
    },
    [isReadOnly, quickLink]
  );

  const onEditEdge = useCallback(
    (edgeId: string) => {
      if (isReadOnly) return;
      const e = persisted.edges.find((x) => x.id === edgeId);
      if (!e) return;
      setEdgeDraft({
        relationType: e.relationType,
        customType: e.customType ?? null,
        description: e.description ?? "",
        bidirectional: e.bidirectional,
        status: e.status ?? "aktywna",
        strength: e.strength ?? 3,
      });
      setEditingEdgeId(edgeId);
    },
    [isReadOnly, persisted.edges]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (quickLink.phase === "pickTarget" && quickLink.sourceNodeId) {
        if (nodeId === quickLink.sourceNodeId) return;
        quickLink.pickTarget(nodeId);
        return;
      }
      onOpenDetail(nodeId);
    },
    [quickLink, onOpenDetail]
  );

  const handlePaneClick = useCallback(() => {
    if (quickLink.isLinking) {
      quickLink.cancelLink();
      return;
    }
    setSelectedNodeId(null);
  }, [quickLink]);

  const actions = useMemo(
    () => ({ onOpenDetail, onStartQuickLink, onEditEdge }),
    [onOpenDetail, onStartQuickLink, onEditEdge]
  );

  const value: RelationsMapContextValue = {
    persisted,
    setPersisted,
    savedNpcs,
    heroes,
    lookup,
    displayEdges,
    visibleNodeIds,
    visibleEdges,
    edgesByNode,
    allTags,
    allTypes,
    sidebarEntries,
    onCanvasIds,
    timeline,
    filters,
    setFilters,
    resetFilters,
    search,
    setSearch,
    sessionMode,
    setSessionMode,
    uiVisible,
    setUiVisible,
    showFilters,
    setShowFilters,
    showLegend,
    setShowLegend,
    showSessions,
    setShowSessions,
    showTimeline,
    setShowTimeline,
    detailPanelOpen,
    setDetailPanelOpen,
    selectedNodeId,
    setSelectedNodeId,
    highlightedNodeIds,
    highlightedEdgeIds,
    hasSelection,
    previewSessionId,
    setPreviewSessionId,
    previewSessionName,
    isReadOnly,
    activeTab,
    setActiveTab,
    editingNode,
    editingEntity,
    editingFullNpc,
    editingFullHero,
    editingEdges,
    currentSessionName,
    changedCount,
    hasChangedFlags,
    linkingBanner,
    quickLink,
    edgeDraft,
    setEdgeDraft,
    editingEdgeId,
    setEditingEdgeId,
    addEntityToCanvas,
    handleTogglePin,
    updateNodeMeta,
    addNodeHistory,
    addTag,
    removeTag,
    startNewSession,
    clearChangedFlags,
    exitPreview,
    commitQuickRelation,
    updateExistingEdge,
    deleteExistingEdge,
    onOpenDetail,
    onStartQuickLink,
    onEditEdge,
    handleNodeClick,
    handlePaneClick,
    autoLayoutRef,
  };

  return (
    <RelationsMapContext.Provider value={value}>
      <RelationsMapActionsContext.Provider value={actions}>
        {children}
      </RelationsMapActionsContext.Provider>
    </RelationsMapContext.Provider>
  );
}
