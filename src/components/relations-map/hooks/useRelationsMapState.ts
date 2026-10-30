import { useMemo } from "react";
import { type Card, type CardTypeDef, cardSubtitle, cardTitle } from "@/lib/cardSchema";
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
  return h.name || "(bez imienia)";
}

function getHeroSubtitle(h: StoredHero): string {
  return h.subtitle;
}

export function buildLookup(npcs: Card[], npcCardType: CardTypeDef, heroes: StoredHero[]) {
  const m = new Map<string, EntityLookupEntry>();
  npcs.forEach((n) => {
    const subtitle = cardSubtitle(npcCardType, n);
    m.set(n.id, {
      name: cardTitle(n),
      subtitle,
      description: n.notes || "",
      kind: "npc",
      aliases: [subtitle].filter(Boolean),
    });
  });
  heroes.forEach((h) =>
    m.set(h.id, {
      name: getHeroDisplayName(h),
      subtitle: getHeroSubtitle(h),
      description: getHeroSubtitle(h),
      kind: "hero",
      aliases: [h.subtitle].filter(Boolean),
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
  npcs: Card[],
  npcCardType: CardTypeDef,
  heroes: StoredHero[],
  search: string
): SidebarEntry[] {
  const list: SidebarEntry[] = [];
  npcs.forEach((n) =>
    list.push({
      id: n.id,
      kind: "npc",
      name: cardTitle(n),
      desc: cardSubtitle(npcCardType, n) || n.notes || "",
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
