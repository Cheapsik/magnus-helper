import type { CardKind } from "@/lib/cardSchema";

/** Payload is `<kind>:<cardId>`. */
export const ROSTER_CARD_DRAG = "text/magnus-roster-card";

export function rosterCardKey(kind: CardKind, id: string): string {
  return `${kind}:${id}`;
}

export function parseRosterCardKey(key: string): { kind: CardKind; id: string } | null {
  const [kind, id] = key.split(":");
  if (!id || (kind !== "hero" && kind !== "npc" && kind !== "monster")) return null;
  return { kind, id };
}

export function isCombatRosterDragEvent(e: React.DragEvent) {
  return Boolean(e.dataTransfer.types?.includes?.(ROSTER_CARD_DRAG));
}
