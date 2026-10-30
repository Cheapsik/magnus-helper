import { newId } from "@/lib/cardSchema";
import { reputationValue, type Faction, type ReputationChange } from "@/lib/factions";

export const FACTION_RELATIONS_KEY = "rpg_faction_relations";
export const FACTION_THRESHOLDS_KEY = "rpg_faction_thresholds";

export type RelationKind = "ally" | "enemy" | "neutral";

export const RELATION_LABELS: Record<RelationKind, string> = { ally: "Sojusz", enemy: "Wrogość", neutral: "Neutralność" };

/** Undirected link between two factions; `factor` scales how much of a reputation change carries over. */
export type FactionRelation = { id: string; aId: string; bId: string; kind: RelationKind; factor: number };

/** At `min` reputation or above (with the faction), `effect` applies. */
export type ReputationThreshold = { id: string; factionId: string; min: number; effect: string };

export type ReputationEffect = { factionId: string; delta: number };

export function newRelation(aId: string, bId: string): FactionRelation {
  return { id: newId(), aId, bId, kind: "ally", factor: 0.5 };
}

export function newThreshold(factionId: string): ReputationThreshold {
  return { id: newId(), factionId, min: 3, effect: "" };
}

/** One hop only (no chains), so cycles of allies cannot feed back. Allies gain, enemies lose. */
export function propagateReputation(factionId: string, delta: number, relations: FactionRelation[]): ReputationEffect[] {
  const out: ReputationEffect[] = [];
  for (const r of relations) {
    if (r.kind === "neutral" || (r.aId !== factionId && r.bId !== factionId)) continue;
    const scaled = Math.round(delta * r.factor) * (r.kind === "enemy" ? -1 : 1);
    if (scaled) out.push({ factionId: r.aId === factionId ? r.bId : r.aId, delta: scaled });
  }
  return out;
}

/** Thresholds whose state flipped when the value moved from `before` to `after` (either direction). */
export function crossedThresholds(thresholds: ReputationThreshold[], before: number, after: number) {
  return thresholds
    .filter((t) => t.effect && before >= t.min !== after >= t.min)
    .map((t) => ({ threshold: t, gained: after >= t.min }));
}

/** Applies a change plus its propagation; returns new factions (source's own log is the caller's) and Polish reminders. */
export function applyReputationChange(
  factions: Faction[],
  relations: FactionRelation[],
  thresholds: ReputationThreshold[],
  sourceId: string,
  change: ReputationChange,
): { factions: Faction[]; reminders: string[] } {
  const source = factions.find((f) => f.id === sourceId);
  const effects = propagateReputation(sourceId, change.delta, relations);
  const reminders: string[] = [];
  const check = (f: Faction, delta: number) => {
    const before = reputationValue(f.log, change.heroId);
    for (const { threshold, gained } of crossedThresholds(thresholds.filter((t) => t.factionId === f.id), before, before + delta)) {
      reminders.push(`${f.name || "Bez nazwy"}: ${gained ? "próg osiągnięty" : "próg utracony"} (${threshold.min}+) — ${threshold.effect}`);
    }
  };
  if (source) check(source, change.delta);
  const next = factions.map((f) => {
    const e = effects.find((x) => x.factionId === f.id);
    if (!e) return f;
    check(f, e.delta);
    const reason = `Skutek zmiany u „${source?.name ?? "?"}”${change.reason ? `: ${change.reason}` : ""}`;
    return { ...f, log: [...f.log, { ...change, id: newId(), delta: e.delta, reason }] };
  });
  return { factions: next, reminders };
}
