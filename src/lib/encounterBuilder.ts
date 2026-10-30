import { type Card, type CardTypeDef, getCardCombatStats } from "@/lib/cardSchema";

export const ENCOUNTER_PRESETS_KEY = "rpg_encounter_presets";

/** cardId -> how many copies take part. */
export type Picks = Record<string, number>;

export type EncounterPreset = { id: string; name: string; party: Picks; enemies: Picks };

export type SideStats = { hp: number; avgAttack: number; count: number };

export type Verdict = "Łatwe spotkanie" | "Zrównoważone" | "Trudne" | "Śmiertelne";

export type EncounterBalance = {
  party: SideStats;
  enemies: SideStats;
  /** enemy actions per party action; null when the party is empty */
  actionRatio: number | null;
  /** enemy threat / party threat; null when either side is empty */
  ratio: number | null;
  verdict: Verdict | null;
};

const ATTACK_LABEL = /atak|attack|obra|dmg|damage/i;

/** Attack = the combat resource labelled like an attack, else the first one bound. */
function cardAttack(cardType: CardTypeDef, card: Card): number {
  const { stats } = getCardCombatStats(cardType, card.values);
  return (stats.find((s) => ATTACK_LABEL.test(s.label)) ?? stats[0])?.value ?? 0;
}

function sideStats(cardType: CardTypeDef, cards: Card[], picks: Picks): SideStats {
  let hp = 0;
  let attack = 0;
  let count = 0;
  for (const card of cards) {
    const n = picks[card.id] ?? 0;
    if (n <= 0) continue;
    hp += n * (getCardCombatStats(cardType, card.values).resource?.max ?? 0);
    attack += n * cardAttack(cardType, card);
    count += n;
  }
  return { hp, avgAttack: count ? attack / count : 0, count };
}

export function calculateEncounterBalance(
  heroType: CardTypeDef,
  monsterType: CardTypeDef,
  heroes: Card[],
  monsters: Card[],
  preset: Pick<EncounterPreset, "party" | "enemies">,
): EncounterBalance {
  const party = sideStats(heroType, heroes, preset.party);
  const enemies = sideStats(monsterType, monsters, preset.enemies);
  const actionRatio = party.count ? enemies.count / party.count : null;
  if (!party.count || !enemies.count) return { party, enemies, actionRatio, ratio: null, verdict: null };
  const threat = (s: SideStats) => Math.max(s.hp, 1) * (1 + s.avgAttack);
  // shortcut: crude heuristic (HP x attack, damped by action economy); tune thresholds per system
  const ratio = (threat(enemies) / threat(party)) * Math.sqrt(enemies.count / party.count);
  const verdict: Verdict =
    ratio < 0.6 ? "Łatwe spotkanie" : ratio < 1.1 ? "Zrównoważone" : ratio < 1.8 ? "Trudne" : "Śmiertelne";
  return { party, enemies, actionRatio, ratio, verdict };
}
