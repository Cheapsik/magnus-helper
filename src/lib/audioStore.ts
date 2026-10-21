import { getStorageKey } from "@/lib/campaignStorage";

/** GM's own audio files live in IndexedDB: localStorage is far too small for them. */
const DB_NAME = "magnus_audio";
const STORE = "blobs";

export const AUDIO_FILE_WARN_BYTES = 30 * 1024 * 1024;
export const AUDIO_ACCEPT = ".mp3,.ogg,.wav,.m4a,audio/mpeg,audio/ogg,audio/wav,audio/mp4";

/** Namespaces a sound id under the active campaign, like every other piece of game data. */
export function audioBlobKey(soundId: string, campaignId?: string): string {
  return getStorageKey(`rpg_ambient_audio:${soundId}`, campaignId);
}

export function isAudioFile(file: { name: string; type: string }): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|ogg|wav|m4a)$/i.test(file.name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAudio(soundId: string, blob: Blob): Promise<void> {
  await run("readwrite", (s) => s.put(blob, audioBlobKey(soundId)));
}

export async function getAudio(soundId: string): Promise<Blob | null> {
  return ((await run("readonly", (s) => s.get(audioBlobKey(soundId)))) as Blob | undefined) ?? null;
}

export async function hasAudio(soundId: string): Promise<boolean> {
  return (await run("readonly", (s) => s.count(audioBlobKey(soundId)))) > 0;
}

export async function deleteAudio(soundId: string): Promise<void> {
  await run("readwrite", (s) => s.delete(audioBlobKey(soundId)));
}

/** Drops every stored file of a campaign; called when the campaign is deleted. */
export async function deleteCampaignAudio(campaignId: string): Promise<void> {
  const prefix = getStorageKey("rpg_ambient_audio:", campaignId);
  await run("readwrite", (s) => s.delete(IDBKeyRange.bound(prefix, `${prefix}\uffff`)));
}
