import { useMemo } from "react";
import type { SavedNpc } from "@/components/character-sheet/types";
import { getNpcDisplayName } from "@/components/character-sheet/npcAccessors";
import type {
  EntityLookupEntry,
  FilterState,
  PersistedEdge,
  PersistedMap,
  PersistedNode,
  SidebarEntry,
  StoredHero,
  TimelineItem,
} from "../types";
import { normalize } from "../utils";
import { getSessionName } from "../storage";

function getHeroDisplayName(h: StoredHero): string {
  return h.daneOgolne.imie.trim() || "(bez imienia)";
}

function getHeroSubtitle(h: StoredHero): string {
  return [h.daneOgolne.rasa, h.daneOgolne.obecnaProfesja].filter(Boolean).join(" • ");
}

export function buildLookup(savedNpcs: SavedNpc[], heroes: StoredHero[]) {
  const m = new Map<string, EntityLookupEntry>();
  savedNpcs.forEach((n) =>
    m.set(n.id, {
      name: getNpcDisplayName(n),
      subtitle: n.daneOgolne.obecnaProfesja || n.cechyCharakteru || "",
      description: n.opisOgolny || n.notatkiMG || "",
      kind: "npc",
      aliases: [n.daneOgolne.obecnaProfesja, n.cechyCharakteru].filter(Boolean),
    })
  );
  heroes.forEach((h) =>
    m.set(h.id, {
      name: getHeroDisplayName(h),
      subtitle: getHeroSubtitle(h),
      description: getHeroSubtitle(h),
      kind: "hero",
      aliases: [h.daneOgolne.rasa, h.daneOgolne.obecnaProfesja].filter(Boolean),
    })
  );
  return m;
}

export function buildEdgesByNode(edges: PersistedEdge[]) {
  const m = new Map<string, PersistedEdge[]>();
  edges.forEach((e) => {
    [e.source, e.target].forEach((n) => {
      const arr = m.get(n) ?? [];
      arr.push(e);
      m.set(n, arr);
    });
  });
  return m;
}

export function useVisibleGraph(params: {
  persisted: PersistedMap;
  displayEdges: PersistedEdge[];
  lookup: Map<string, EntityLookupEntry>;
  filters: FilterState;
  search: string;
  sessionMode: boolean;
}) {
  const { persisted, displayEdges, lookup, filters, search, sessionMode } = params;

  const edgesByNode = useMemo(
    () => buildEdgesByNode(displayEdges),
    [displayEdges]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    persisted.nodes.forEach((n) => n.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [persisted.nodes]);

  const visibleNodeIds = useMemo(() => {
    const q = normalize(search.trim());
    return new Set(
      persisted.nodes
        .filter((n) => filterNode(n, { lookup, filters, q, sessionMode, edgesByNode }))
        .map((n) => n.id)
    );
  }, [persisted.nodes, lookup, filters, search, sessionMode, edgesByNode]);

  const visibleEdges = useMemo(
    () =>
      displayEdges.filter((e) => {
        if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
        const st = e.status ?? "aktywna";
        if (filters.status !== "all" && st !== filters.status) return false;
        if (
          filters.relationType !== "all" &&
          (e.customType || e.relationType) !== filters.relationType
        )
          return false;
        if (sessionMode && (st === "ukryta" || st === "zerwana")) return false;
        if (filters.changedOnly && !e.changedSince) return false;
        return true;
      }),
    [displayEdges, visibleNodeIds, filters, sessionMode]
  );

  return { visibleNodeIds, visibleEdges, edgesByNode, allTags };
}

function filterNode(
  n: PersistedNode,
  ctx: {
    lookup: Map<string, EntityLookupEntry>;
    filters: FilterState;
    q: string;
    sessionMode: boolean;
    edgesByNode: Map<string, PersistedEdge[]>;
  }
) {
  const info = ctx.lookup.get(n.entityId);
  if (ctx.filters.kind !== "all" && n.type !== ctx.filters.kind) return false;
  if (ctx.filters.faction !== "all" && !n.tags?.includes(ctx.filters.faction)) return false;
  if (ctx.filters.pinnedOnly && !n.pinned) return false;
  if (ctx.sessionMode && !n.pinned) {
    const eds = ctx.edgesByNode.get(n.id) ?? [];
    if (!eds.some((e) => (e.status ?? "aktywna") === "aktywna")) return false;
  }
  if (ctx.q) {
    const hay =
      normalize(info?.name || "") +
      " " +
      normalize((info?.aliases ?? []).join(" ")) +
      " " +
      normalize((n.tags ?? []).join(" "));
    if (!hay.includes(ctx.q)) return false;
  }
  if (ctx.filters.changedOnly) {
    const eds = ctx.edgesByNode.get(n.id) ?? [];
    if (!eds.some((e) => !!e.changedSince)) return false;
  }
  return true;
}

export function buildSidebarEntries(
  savedNpcs: SavedNpc[],
  heroes: StoredHero[],
  search: string
): SidebarEntry[] {
  const list: SidebarEntry[] = [];
  savedNpcs.forEach((n) =>
    list.push({
      id: n.id,
      kind: "npc",
      name: getNpcDisplayName(n),
      desc: n.opisOgolny || n.notatkiMG || n.daneOgolne.obecnaProfesja || "",
    })
  );
  heroes.forEach((h) =>
    list.push({
      id: h.id,
      kind: "hero",
      name: getHeroDisplayName(h),
      desc: getHeroSubtitle(h),
    })
  );
  const q = normalize(search);
  return list.filter((e) => normalize(e.name).includes(q));
}

export function buildTimeline(
  persisted: PersistedMap,
  lookup: Map<string, EntityLookupEntry>
): TimelineItem[] {
  const items: TimelineItem[] = [];
  persisted.edges.forEach((e) => {
    (e.history ?? []).forEach((h) =>
      items.push({
        ts: h.ts,
        session: h.session,
        message: h.message,
        source: `${lookup.get(persisted.nodes.find((n) => n.id === e.source)?.entityId ?? "")?.name || "?"} ↔ ${lookup.get(persisted.nodes.find((n) => n.id === e.target)?.entityId ?? "")?.name || "?"}`,
      })
    );
  });
  persisted.nodes.forEach((n) => {
    (n.meta?.history ?? []).forEach((h) =>
      items.push({
        ts: h.ts,
        session: h.session,
        message: h.message,
        source: lookup.get(n.entityId)?.name || "Postać",
      })
    );
  });
  return items.sort((a, b) => b.ts - a.ts);
}

export function countChangedEdges(edges: PersistedEdge[]) {
  return edges.filter((e) => e.changedSince).length;
}

export { getHeroDisplayName, getHeroSubtitle, getSessionName };
