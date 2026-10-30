/**
 * Data written before the configurable campaign system has the shape of one
 * hardcoded game. It is not migrated (docs/adr/0008): the first run of this
 * version removes every piece of app data except device/UI preferences.
 * Since docs/adr/0010 the cloud holds the data too: a future bump has to clear
 * or migrate it there as well, or the next pull brings the old data back.
 */

export const DATA_VERSION_KEY = "magnus_data_version";
export const DATA_VERSION = 2;

/** Device/UI preferences that survive the reset. */
const PRESERVED_KEYS = new Set([
  DATA_VERSION_KEY,
  "magnus_settings",
  "rpg_theme",
  "magnus_sidebar_width",
  "magnus-dice-3d-visual",
]);

/** Every key the app has ever written starts with one of these; auth tokens don't. */
const APP_KEY_PREFIXES = ["campaign:", "rpg_", "magnus_", "magnus-", "mg_", "grim-"];

function isAppDataKey(key: string): boolean {
  if (PRESERVED_KEYS.has(key)) return false;
  return APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Returns true when data was reset. Safe to call on every boot. */
export function resetDataFromPreviousVersions(storage: Storage = window.localStorage): boolean {
  try {
    const stored = Number(storage.getItem(DATA_VERSION_KEY) ?? "0");
    if (stored >= DATA_VERSION) return false;

    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && isAppDataKey(key)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
    storage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
    return keys.length > 0;
  } catch {
    return false;
  }
}
