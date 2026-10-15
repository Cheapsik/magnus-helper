import { getStorageKey } from "@/lib/campaignStorage";

/**
 * Single runtime entry point for campaign-scoped persistence.
 *
 * Every read and write the app performs while running goes through here, so
 * that React stays in sync when any module writes, and so that swapping
 * localStorage for a server backend later is one file rather than call sites
 * scattered across the app.
 *
 * Raw `localStorage` access stays correct in two places that cannot go through
 * a per-key API: the boot migrations in `main.tsx` (they run before render and
 * rewrite keys wholesale) and the settings export/import/reset, which scan the
 * whole keyspace.
 */

type Listener = () => void;

export type StorageScope = {
  /** Device/UI preference shared by every campaign instead of namespaced. */
  global?: boolean;
};

export type StorageOptions<T = unknown> = StorageScope & {
  revive?: (parsed: unknown) => T;
};

/**
 * Snapshot cache. Exists so `useSyncExternalStore` gets a stable reference
 * between renders — without it every read would parse fresh JSON and React
 * would re-render forever.
 */
const snapshots = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();

export function resolveStorageKey(key: string, options?: StorageScope): string {
  return options?.global ? key : getStorageKey(key);
}

function notify(resolvedKey: string): void {
  const set = listeners.get(resolvedKey);
  if (!set) return;
  for (const listener of set) listener();
}

function parse<T>(raw: string | null, fallback: T, revive?: (parsed: unknown) => T): T {
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return revive ? revive(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

/** Fresh read, bypassing the snapshot cache. Use outside React. */
export function readJson<T>(key: string, fallback: T, options?: StorageOptions<T>): T {
  try {
    return parse(window.localStorage.getItem(resolveStorageKey(key, options)), fallback, options?.revive);
  } catch {
    return fallback;
  }
}

/**
 * Cached read with a stable identity for the same underlying value.
 * Backs `useLocalStorage`; prefer `readJson` everywhere else.
 */
export function getSnapshot<T>(key: string, fallback: T, options?: StorageOptions<T>): T {
  const resolved = resolveStorageKey(key, options);
  if (snapshots.has(resolved)) return snapshots.get(resolved) as T;
  const value = readJson(key, fallback, options);
  snapshots.set(resolved, value);
  return value;
}

/** Returns false when the value could not be persisted (storage full or blocked). */
export function writeJson<T>(key: string, value: T, options?: StorageOptions<T>): boolean {
  const resolved = resolveStorageKey(key, options);
  snapshots.set(resolved, value);
  let persisted = true;
  try {
    window.localStorage.setItem(resolved, JSON.stringify(value));
  } catch {
    // Keep the in-memory value so the UI stays consistent for this session,
    // matching the previous behaviour, but tell the caller it did not stick.
    persisted = false;
  }
  notify(resolved);
  return persisted;
}

export function removeJson(key: string, options?: StorageScope): void {
  const resolved = resolveStorageKey(key, options);
  snapshots.delete(resolved);
  try {
    window.localStorage.removeItem(resolved);
  } catch {
    // nothing to remove
  }
  notify(resolved);
}

export function subscribe(key: string, listener: Listener, options?: StorageScope): () => void {
  const resolved = resolveStorageKey(key, options);
  let set = listeners.get(resolved);
  if (!set) {
    set = new Set();
    listeners.set(resolved, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(resolved);
  };
}

/** Drops cached snapshots so the next read hits storage again. */
export function clearStorageCache(): void {
  snapshots.clear();
}

if (typeof window !== "undefined") {
  // Another tab wrote to storage: drop our snapshot and let subscribers re-read.
  window.addEventListener("storage", (event) => {
    if (event.key === null) {
      // storage.clear() elsewhere
      const keys = [...snapshots.keys()];
      snapshots.clear();
      for (const key of keys) notify(key);
      return;
    }
    snapshots.delete(event.key);
    notify(event.key);
  });
}
