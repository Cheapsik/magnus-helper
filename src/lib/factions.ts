import { newId } from "@/lib/cardSchema";

export const FACTIONS_KEY = "rpg_factions";
export const REPUTATION_LADDER_KEY = "rpg_reputation_ladder";

/** One rung of the campaign's reputation ladder; a value reaches it at `min` or above. */
export type ReputationTier = { id: string; name: string; min: number };

/** One reputation change; without `heroId` it applies to the party as a whole. */
export type ReputationChange = {
  id: string;
  delta: number;
  reason: string;
  sessionId?: string;
  heroId?: string;
  timestamp: number;
};

export type Faction = {
  id: string;
  name: string;
  description: string;
  color: string;
  goal?: string;
  /** NPC card ids. */
  memberIds: string[];
  /** Progress clock id. */
  clockId?: string;
  /** Reputation is the sum of this log's deltas, so history and value never drift apart. */
  log: ReputationChange[];
  /** This faction's attitude towards other factions, by faction id, on the same ladder. */
  relations: Record<string, number>;
};

export function defaultReputationLadder(): ReputationTier[] {
  return [
    { id: newId(), name: "Wrogość", min: -3 },
    { id: newId(), name: "Nieufność", min: -1 },
    { id: newId(), name: "Obojętność", min: 0 },
    { id: newId(), name: "Życzliwość", min: 1 },
    { id: newId(), name: "Sojusz", min: 3 },
  ];
}

export function newFaction(name: string): Faction {
  return { id: newId(), name, description: "", color: "#6366f1", memberIds: [], log: [], relations: {} };
}

/** Highest tier whose minimum the value reaches; below every minimum it is the lowest tier. */
export function reputationTier(value: number, ladder: ReputationTier[]): ReputationTier | undefined {
  const sorted = [...ladder].sort((a, b) => a.min - b.min);
  return sorted.filter((t) => value >= t.min).pop() ?? sorted[0];
}

/** Party reputation when `heroId` is omitted, otherwise that hero's own. */
export function reputationValue(log: ReputationChange[], heroId?: string): number {
  return log.filter((c) => c.heroId === heroId).reduce((sum, c) => sum + c.delta, 0);
}
