import { getActiveCampaignId, getStorageKey } from "@/lib/campaignStorage";
import { markDirty } from "@/lib/syncQueue";

/**
 * GM's own map images: this device's copy in IndexedDB (localStorage is far too small for
 * them), the lasting one in the cloud (lib/cloudSync).
 */
const DB_NAME = "magnus_images";
const STORE = "blobs";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";

/** Namespaces an image id under the active campaign, like every other piece of game data. */
export function imageBlobKey(imageId: string, campaignId?: string): string {
  return getStorageKey(`rpg_map_image:${imageId}`, campaignId);
}

export function isImageFile(file: { name: string; type: string }): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
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

function queueForCloud(imageId: string): void {
  const campaignId = getActiveCampaignId();
  if (campaignId) markDirty(["file", campaignId, "images", imageId]);
}

export async function putImage(imageId: string, blob: Blob): Promise<void> {
  await run("readwrite", (s) => s.put(blob, imageBlobKey(imageId)));
  queueForCloud(imageId);
}

/** This device's copy, or the cloud's (kept here for next time). */
export async function getImage(imageId: string): Promise<Blob | null> {
  const local = await localImage(imageId);
  if (local) return local;
  const remote = await (await import("@/lib/cloudSync")).downloadFile("images", imageId);
  if (remote) await run("readwrite", (s) => s.put(remote, imageBlobKey(imageId))).catch(() => {});
  return remote;
}

export async function localImage(imageId: string, campaignId?: string): Promise<Blob | null> {
  return ((await run("readonly", (s) => s.get(imageBlobKey(imageId, campaignId)))) as Blob | undefined) ?? null;
}

export async function localImageIds(campaignId: string): Promise<string[]> {
  const prefix = getStorageKey("rpg_map_image:", campaignId);
  const keys = await run("readonly", (s) => s.getAllKeys(IDBKeyRange.bound(prefix, `${prefix}\uffff`)));
  return keys.map((key) => String(key).slice(prefix.length));
}

export async function deleteImage(imageId: string): Promise<void> {
  await run("readwrite", (s) => s.delete(imageBlobKey(imageId)));
  queueForCloud(imageId);
}

/** Drops every stored image of a campaign; called when the campaign is deleted. */
export async function deleteCampaignImages(campaignId: string): Promise<void> {
  const prefix = getStorageKey("rpg_map_image:", campaignId);
  await run("readwrite", (s) => s.delete(IDBKeyRange.bound(prefix, `${prefix}￿`)));
}
