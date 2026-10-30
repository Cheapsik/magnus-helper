import type { Combatant } from "@/context/AppContext";
import { type Card, type CardTypeDef, cardSubtitle, cardTitle, findField, getCardCombatStats } from "@/lib/cardSchema";
import { resolveComputedValues } from "@/lib/formulaEngine";

/**
 * Turns a card into a tracker participant using only what the campaign's roles
 * declare. Nothing is derived; an unbound role leaves a blank the GM fills in.
 * The main resource is copied so each fight tracks its own; everything an
 * attack needs is read from the card itself through `card`.
 */
export function cardToCombatant(card: Card, cardType: CardTypeDef, isEnemy: boolean): Combatant {
  const resolved = resolveComputedValues(cardType, card.values);
  const combat = getCardCombatStats(cardType, resolved);
  const resourceField = cardType.roles.mainResource
    ? findField(cardType, cardType.roles.mainResource.current.fieldId)
    : undefined;
  return {
    id: crypto.randomUUID(),
    name: cardTitle(card, isEnemy ? "Przeciwnik" : "Bohater"),
    initiative: combat.initiative ?? 0,
    resource: { current: combat.resource?.current ?? 0, max: combat.resource?.max ?? 0 },
    resourceLabel: resourceField?.name,
    stats: combat.stats,
    card: { kind: card.kind, id: card.id },
    statuses: [],
    notes: cardSubtitle(cardType, card),
    isEnemy,
  };
}
