const STORAGE_UPDATE_EVENT = "rpg-storage-update";

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  return safeParseJson<T>(window.localStorage.getItem(key), fallback);
}

function emitStorageUpdate(key: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(STORAGE_UPDATE_EVENT, { detail: { key } }));
}

export function updateStorageCollectionItem<T extends { id: string }>(
  key: string,
  id: string,
  applyChanges: (item: T) => T,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const existing = readStorageValue<T[]>(key, []);
  const updated = existing.map((item) => (item.id === id ? applyChanges(item) : item));
  window.localStorage.setItem(key, JSON.stringify(updated));
  emitStorageUpdate(key);
}

export function writeStorageValue<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
  emitStorageUpdate(key);
}

export function onStorageUpdate(callback: (key: string) => void): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<{ key?: string }>;
    if (custom.detail?.key) {
      callback(custom.detail.key);
    }
  };
  const storageListener = (event: StorageEvent) => {
    if (event.key) {
      callback(event.key);
    }
  };
  window.addEventListener(STORAGE_UPDATE_EVENT, listener);
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(STORAGE_UPDATE_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}
