import { useLocalStorage } from "@/hooks/useLocalStorage";

export const PROGRESSION_CONFIG_KEY = "rpg_progression_config";
export const CARD_XP_KEY = "rpg_card_xp";

/** Reaching `level` takes `xp` total points; `reward` is what the GM tells the player they gain. */
export type ProgressionTier = { id: string; level: number; xp: number; reward: string };
export type ProgressionConfig = { tiers: ProgressionTier[] };
export type XPHistoryEntry = { at: number; type: "xp" | "level"; amount?: number; level?: number; note: string };
export type XPRecord = { xp: number; level: number; history: XPHistoryEntry[] };

export const EMPTY_CONFIG: ProgressionConfig = { tiers: [] };
export const newRecord = (): XPRecord => ({ xp: 0, level: 1, history: [] });

export const useProgressionConfig = () => useLocalStorage<ProgressionConfig>(PROGRESSION_CONFIG_KEY, EMPTY_CONFIG);
export const useCardXP = () => useLocalStorage<Record<string, XPRecord>>(CARD_XP_KEY, {});

export function grantXP(record: XPRecord | undefined, amount: number, note = ""): XPRecord {
  const r = record ?? newRecord();
  return { ...r, xp: Math.max(0, r.xp + amount), history: [...r.history, { at: Date.now(), type: "xp", amount, note }] };
}

export function nextTier(record: XPRecord, config: ProgressionConfig): ProgressionTier | undefined {
  return config.tiers.find((t) => t.level === record.level + 1);
}

export function canAdvance(record: XPRecord, config: ProgressionConfig): boolean {
  const tier = nextTier(record, config);
  return !!tier && record.xp >= tier.xp;
}

export function advance(record: XPRecord, config: ProgressionConfig): XPRecord {
  const tier = nextTier(record, config);
  if (!tier || record.xp < tier.xp) return record;
  return { ...record, level: tier.level, history: [...record.history, { at: Date.now(), type: "level", level: tier.level, note: tier.reward }] };
}
