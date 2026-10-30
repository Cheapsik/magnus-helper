/**
 * What this device changed and has not yet pushed to the cloud (src/lib/cloudSync.ts).
 * Kept in localStorage so changes made offline, or just before closing the tab, are sent
 * on the next start.
 */

export type FileKind = "images" | "audio";

/** A campaign's name/archive state, one storage key of a campaign, or one of its files. */
export type SyncEntry =
  | ["campaign", string]
  | ["data", string, string]
  | ["file", string, FileKind, string];

export const SYNC_PENDING_KEY = "magnus_sync_pending";
/** Campaigns known to be in the cloud: one missing there now was deleted on another device. */
export const SYNCED_CAMPAIGNS_KEY = "magnus_synced_campaigns";
/** The account whose campaigns this device holds. */
export const CACHE_OWNER_KEY = "magnus_cache_owner";
export const SYNC_BOOKKEEPING_KEYS = [SYNC_PENDING_KEY, SYNCED_CAMPAIGNS_KEY, CACHE_OWNER_KEY];

// Bumped on every change, so a flush only clears an entry nobody touched while it was sending.
let seq = Date.now();
const listeners = new Set<() => void>();

function read(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SYNC_PENDING_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>): void {
  try {
    window.localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(map));
  } catch {
    // storage full: the change stays local until the next write of the same thing
  }
}

export function markDirty(entry: SyncEntry): void {
  const map = read();
  map[JSON.stringify(entry)] = ++seq;
  write(map);
  for (const listener of listeners) listener();
}

export function pendingEntries(): { entry: SyncEntry; seq: number }[] {
  return Object.entries(read()).map(([key, seq]) => ({ entry: JSON.parse(key) as SyncEntry, seq }));
}

/** Drops an entry once it reached the cloud, unless it changed again in the meantime. */
export function clearEntry(entry: SyncEntry, sentSeq: number): void {
  const map = read();
  const key = JSON.stringify(entry);
  if (map[key] !== sentSeq) return;
  delete map[key];
  write(map);
}

export function onDirty(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
