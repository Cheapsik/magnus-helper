import type { Combatant } from "@/context/AppContext";
import type { SavedNpc } from "@/components/character-sheet/types";
import {
  getCharacterSheetCombatStats,
  getNpcCombatStats,
  getNpcDisplayName,
  type CombatStatsSheetSlice,
} from "@/components/character-sheet/npcAccessors";

export const HEROES_STORAGE_KEY = "rpg_characters";

export type HeroRosterEntry = CombatStatsSheetSlice & {
  id: string;
  daneOgolne: { imie: string; rasa?: string; obecnaProfesja?: string };
};

export function getHeroRosterDisplayName(h: HeroRosterEntry): string {
  return h.daneOgolne.imie.trim() || "Bohater";
}

export function getHeroRosterSubtitle(h: HeroRosterEntry): string {
  return [h.daneOgolne.obecnaProfesja, h.daneOgolne.rasa].filter(Boolean).join(" · ");
}

export function savedNpcToCombatant(npc: SavedNpc): Combatant {
  const c = getNpcCombatStats(npc);
  return {
    id: crypto.randomUUID(),
    name: getNpcDisplayName(npc),
    initiative: c.initiative,
    ww: c.ww,
    us: c.us,
    sb: c.sb,
    hp: { current: c.hp, max: Math.max(1, c.hpMax) },
    armor: c.armor,
    toughness: c.toughness,
    statuses: [],
    notes: c.notes || c.weapon,
    isEnemy: true,
  };
}

export function heroRosterToCombatant(h: HeroRosterEntry): Combatant {
  const c = getCharacterSheetCombatStats(h);
  const name = getHeroRosterDisplayName(h);
  const hint = getHeroRosterSubtitle(h);
  return {
    id: crypto.randomUUID(),
    name,
    initiative: c.initiative,
    ww: c.ww,
    us: c.us,
    sb: c.sb,
    hp: { current: c.hp, max: Math.max(1, c.hpMax) },
    armor: c.armor,
    toughness: c.toughness,
    statuses: [],
    notes: hint || c.weapon,
    isEnemy: false,
  };
}

export function reviveHeroRoster(parsed: unknown): HeroRosterEntry[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
    .map((x) => ({
      id: String(x.id || crypto.randomUUID()),
      daneOgolne: {
        imie: String((x.daneOgolne as Record<string, unknown> | undefined)?.imie ?? ""),
        rasa: String((x.daneOgolne as Record<string, unknown> | undefined)?.rasa ?? ""),
        obecnaProfesja: String(
          (x.daneOgolne as Record<string, unknown> | undefined)?.obecnaProfesja ?? "",
        ),
      },
      cechyGlowne: x.cechyGlowne as HeroRosterEntry["cechyGlowne"],
      cechyDrugorzedne: x.cechyDrugorzedne as HeroRosterEntry["cechyDrugorzedne"],
      punktyZbroi: x.punktyZbroi as HeroRosterEntry["punktyZbroi"],
      bron: Array.isArray(x.bron) ? (x.bron as HeroRosterEntry["bron"]) : [],
    }));
}
