/** Stare klucze → kanoniczne `rpg_*`. Wywoływane przed pierwszym renderem. */
const LEGACY_KEY_MIGRATIONS: readonly [from: string, to: string][] = [
  ["grim-rolls", "rpg_dice_rolls"],
  ["grim-tests", "rpg_test_results"],
  ["grim-character", "rpg_character"],
  ["grim-pinned", "rpg_codex_pins"],
  ["magnus-combatants", "rpg_combatants"],
  ["magnus-combat-round", "rpg_combat_round"],
  ["magnus-combat-turn", "rpg_combat_turn"],
  ["magnus-conditions", "rpg_conditions"],
  ["magnus-inventory", "rpg_inventory"],
  ["magnus-session-notes", "rpg_session_notes"],
  ["magnus-gm-enemies", "rpg_gm_enemies"],
  ["magnus-saved-npcs", "rpg_saved_npcs"],
  ["magnus-difficulty-presets", "rpg_difficulty_presets"],
  ["magnus-codex-entries", "rpg_codex_entries"],
];

function migratePair(from: string, to: string) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (window.localStorage.getItem(to) !== null) return;
    const value = window.localStorage.getItem(from);
    if (value === null) return;
    window.localStorage.setItem(to, value);
    window.localStorage.removeItem(from);
  } catch {
    // ignore quota / private mode
  }
}

/** Przenosi dane ze starych kluczy do `rpg_*` oraz motyw z `theme` → `rpg_theme`. */
export function migrateRpgStorageKeys() {
  if (typeof window === "undefined" || !window.localStorage) return;

  for (const [from, to] of LEGACY_KEY_MIGRATIONS) {
    migratePair(from, to);
  }

  migratePair("theme", "rpg_theme");
}
