import type { Combatant } from "@/context/AppContext";
import {
  type Card,
  type CardTypeDef,
  cardSubtitle,
  cardTitle,
  getCardCombatStats,
} from "@/lib/cardSchema";

/**
 * Turns a card into a tracker participant using only what the campaign's roles
 * declare. Nothing is derived — an unbound role simply yields a blank the GM
 * fills in by hand.
 */
export function cardToCombatant(card: Card, cardType: CardTypeDef, isEnemy: boolean): Combatant {
  const combat = getCardCombatStats(cardType, card.values);
  return {
    id: crypto.randomUUID(),
    name: cardTitle(card, isEnemy ? "Potwór" : "Bohater"),
    initiative: combat.initiative ?? 0,
    ww: 0,
    us: 0,
    sb: 0,
    hp: {
      current: combat.resource?.current ?? 0,
      max: Math.max(1, combat.resource?.max ?? 1),
    },
    armor: 0,
    toughness: 0,
    stats: combat.stats,
    statuses: [],
    notes: cardSubtitle(cardType, card),
    isEnemy,
  };
}
