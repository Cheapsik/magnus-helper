import type { Combatant } from "@/context/AppContext";
import type { SavedNpc } from "@/components/character-sheet/types";
import {
  getNpcCombatStats,
  getNpcDisplayName,
} from "@/components/character-sheet/npcAccessors";

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

