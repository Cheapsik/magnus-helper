import type { Combatant } from "@/context/AppContext";
import type { CombatFight } from "@/lib/combatSessions";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { readJson, writeJson } from "@/lib/storage";
import { getAppUrl } from "@/lib/authUrls";

/**
 * What the player-facing second window shows. The GM window writes it, the
 * player window reads it; both go through campaign-scoped storage, whose
 * `storage` event listener carries writes across windows.
 */
export const PLAYER_SCREEN_STORAGE_KEY = "rpg_player_screen";

export interface PlayerHandout {
  title: string;
  text: string;
  /** http(s) URL or a data URL. */
  image?: string;
}

export interface PlayerScreenState {
  /** Blank shows only the logo, hiding everything else without losing the selection. */
  blank: boolean;
  showInitiative: boolean;
  /** Hide resource numbers for enemies (heroes still show theirs). */
  hideEnemyResources: boolean;
  showClocks: boolean;
  handout: PlayerHandout | null;
  /** Safety pause: overrides everything with a calm "break" view. */
  paused: boolean;
  /** Show the campaign's table safety agreements (hard lines and veils). */
  showSafety: boolean;
}

export const DEFAULT_PLAYER_SCREEN: PlayerScreenState = {
  blank: true,
  showInitiative: false,
  hideEnemyResources: true,
  showClocks: false,
  handout: null,
  paused: false,
  showSafety: false,
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function revivePlayerScreen(parsed: unknown): PlayerScreenState {
  if (!parsed || typeof parsed !== "object") return DEFAULT_PLAYER_SCREEN;
  const p = parsed as Record<string, unknown>;
  const h = p.handout as Record<string, unknown> | null | undefined;
  const handout: PlayerHandout | null =
    h && typeof h === "object" && (str(h.title) || str(h.text) || str(h.image))
      ? { title: str(h.title), text: str(h.text), image: str(h.image) || undefined }
      : null;
  return {
    blank: p.blank === undefined ? DEFAULT_PLAYER_SCREEN.blank : Boolean(p.blank),
    showInitiative: Boolean(p.showInitiative),
    hideEnemyResources: p.hideEnemyResources === undefined ? true : Boolean(p.hideEnemyResources),
    showClocks: Boolean(p.showClocks),
    handout,
    paused: Boolean(p.paused),
    showSafety: Boolean(p.showSafety),
  };
}

export interface PlayerInitiativeRow {
  id: string;
  name: string;
  isEnemy: boolean;
  active: boolean;
  out: boolean;
  /** Absent when hidden or when the combatant tracks no resource. */
  resource?: { current: number; max: number; label?: string };
}

export interface PlayerInitiative {
  fightName: string;
  round: number;
  rows: PlayerInitiativeRow[];
}

/**
 * Projects a fight onto what players may see: order, names, whose turn and
 * (optionally) resources. Notes, stats, statuses and card links never leave.
 * Order and turn index match CombatPage (sorted by initiative, descending).
 */
export function toPlayerInitiative(fight: CombatFight, hideEnemyResources: boolean): PlayerInitiative {
  const sorted = [...fight.combatants].sort((a, b) => b.initiative - a.initiative);
  return {
    fightName: fight.name,
    round: fight.combatRound,
    rows: sorted.map((c: Combatant, i) => {
      const hasResource = c.resource.max > 0;
      const row: PlayerInitiativeRow = {
        id: c.id,
        name: c.name,
        isEnemy: c.isEnemy,
        active: i === fight.combatTurn,
        out: hasResource && c.resource.current <= 0,
      };
      if (hasResource && !(c.isEnemy && hideEnemyResources)) {
        row.resource = { current: c.resource.current, max: c.resource.max, label: c.resourceLabel };
      }
      return row;
    }),
  };
}

const storageOptions = { revive: revivePlayerScreen };

export function usePlayerScreen() {
  return useLocalStorage<PlayerScreenState>(PLAYER_SCREEN_STORAGE_KEY, DEFAULT_PLAYER_SCREEN, storageOptions);
}

/** Puts a handout on the player screen (leaving blank mode). False when storage is full. */
export function showHandoutToPlayers(handout: PlayerHandout): boolean {
  const prev = readJson(PLAYER_SCREEN_STORAGE_KEY, DEFAULT_PLAYER_SCREEN, storageOptions);
  return writeJson(PLAYER_SCREEN_STORAGE_KEY, { ...prev, blank: false, handout }, storageOptions);
}

export function openPlayerScreenWindow(): void {
  window.open(getAppUrl("player-screen"), "magnus-player-screen", "popup,width=1280,height=720");
}
