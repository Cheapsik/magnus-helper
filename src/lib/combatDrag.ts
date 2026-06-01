export const GM_ENEMY_DRAG = "text/magnus-gm-enemy-id";

export const ROSTER_NPC_DRAG = "text/magnus-roster-npc-id";

export const ROSTER_HERO_DRAG = "text/magnus-roster-hero-id";

export function isGmEnemyDragEvent(e: React.DragEvent) {
  return Boolean(e.dataTransfer.types?.includes?.(GM_ENEMY_DRAG));
}

export function isRosterNpcDragEvent(e: React.DragEvent) {
  return Boolean(e.dataTransfer.types?.includes?.(ROSTER_NPC_DRAG));
}

export function isRosterHeroDragEvent(e: React.DragEvent) {
  return Boolean(e.dataTransfer.types?.includes?.(ROSTER_HERO_DRAG));
}

export function isCombatRosterDragEvent(e: React.DragEvent) {
  return isGmEnemyDragEvent(e) || isRosterNpcDragEvent(e) || isRosterHeroDragEvent(e);
}
