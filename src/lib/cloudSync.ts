import { supabase } from "@/lib/supabase";
import {
  type Campaign,
  getActiveCampaignId,
  getStorageKey,
  readCampaignsRegistry,
  removeCampaignLocally,
  writeCampaignsRegistry,
} from "@/lib/campaignStorage";
import {
  CACHE_OWNER_KEY,
  SYNC_PENDING_KEY,
  SYNCED_CAMPAIGNS_KEY,
  type FileKind,
  type SyncEntry,
  clearEntry,
  markDirty,
  onDirty,
  pendingEntries,
} from "@/lib/syncQueue";

/**
 * The GM's campaigns live in the cloud (supabase/migrations/*_campaign_data.sql, docs/adr/0010).
 * localStorage and IndexedDB stay this device's copy, so the app keeps reading synchronously
 * and works offline: on start the account's copy is pulled before anything renders, and every
 * change is queued (lib/syncQueue) and pushed in the background. Concurrent edits of the same
 * key on two devices: the last one pushed wins.
 */

const BUCKET = "campaign-files";
const BOOT_TIMEOUT_MS = 8000;
const FLUSH_DELAY_MS = 3000;
const PAGE = 1000;
const UPSERT_CHUNK = 50;

export type CloudCampaign = { id: string; name: string; created_at: string; archived_at: string | null };
type CloudRow = { campaign_id: string; key: string; value: string };

let userId: string | null = null;

const filePath = (campaignId: string, kind: FileKind, id: string) => `${campaignId}/${kind}/${id}`;

// ─── Merging (pure) ───────────────────────────────────────────────────────────

/**
 * The campaign list after a pull. `pending`: campaigns changed here and not yet pushed, where
 * this device wins. `synced`: campaigns this device has seen in the cloud before, so one now
 * missing there was deleted elsewhere rather than never uploaded. `upload`: campaigns the
 * cloud has never had, whose whole content must be pushed.
 */
export function reconcileCampaigns(
  local: Campaign[],
  cloud: CloudCampaign[],
  pending: Set<string>,
  synced: Set<string>,
): { campaigns: Campaign[]; removed: string[]; upload: string[] } {
  const cloudById = new Map(cloud.map((c) => [c.id, c]));
  const campaigns: Campaign[] = [];
  const removed: string[] = [];
  const upload: string[] = [];
  for (const c of local) {
    const remote = cloudById.get(c.id);
    if (remote) campaigns.push(pending.has(c.id) ? c : { ...c, name: remote.name, archivedAt: remote.archived_at });
    else if (synced.has(c.id) && !pending.has(c.id)) removed.push(c.id);
    else {
      campaigns.push(c);
      upload.push(c.id);
    }
  }
  const localIds = new Set(local.map((c) => c.id));
  for (const remote of cloud) {
    // pending without a local campaign: deleted here, the cloud just hasn't heard yet
    if (localIds.has(remote.id) || pending.has(remote.id)) continue;
    campaigns.push({ id: remote.id, name: remote.name, createdAt: remote.created_at, archivedAt: remote.archived_at });
  }
  return { campaigns, removed, upload };
}

/** What to write and remove locally so a campaign matches the cloud, keeping keys changed here. */
export function mergeCampaignData(
  local: Record<string, string>,
  cloud: Record<string, string>,
  pending: Set<string>,
): { set: Record<string, string>; remove: string[] } {
  const set: Record<string, string> = {};
  for (const [key, value] of Object.entries(cloud)) if (!pending.has(key) && local[key] !== value) set[key] = value;
  const remove = Object.keys(local).filter((key) => !(key in cloud) && !pending.has(key));
  return { set, remove };
}

// ─── Start ────────────────────────────────────────────────────────────────────

/** Resolves once this device holds the signed-in account's campaigns, or the cloud can't be reached. Never rejects. */
export async function startCloudSync(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id ?? null;
  } catch {
    userId = null;
  }
  supabase.auth.onAuthStateChange((event, session) => {
    // Signed in on this page: start over, so the account's campaigns are loaded before anything renders.
    if (event === "SIGNED_IN" && session && session.user.id !== userId) window.location.reload();
    if (event === "SIGNED_OUT") userId = null;
  });
  if (!userId) return;
  setStatus({ active: true });
  try {
    adoptLocalCopy(userId);
    applyRemote(await withTimeout(fetchRemote(), BOOT_TIMEOUT_MS));
  } catch (e) {
    console.error("[Magnus Helper] cloud sync: using this device's copy:", errorMessage(e));
  }
  onDirty(() => {
    setStatus({});
    scheduleFlush();
  });
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  scheduleFlush();
}

/** Another account's campaigns must never show up; a device used before sign-in was required keeps its data. */
function adoptLocalCopy(uid: string): void {
  const owner = window.localStorage.getItem(CACHE_OWNER_KEY);
  if (owner && owner !== uid) {
    for (const c of readCampaignsRegistry().campaigns) removeCampaignLocally(c.id);
    writeCampaignsRegistry({ campaigns: [], activeCampaignId: null });
    window.localStorage.removeItem(SYNC_PENDING_KEY);
    window.localStorage.removeItem(SYNCED_CAMPAIGNS_KEY);
  }
  window.localStorage.setItem(CACHE_OWNER_KEY, uid);
}

async function fetchRemote(): Promise<{ campaigns: CloudCampaign[]; rows: CloudRow[] }> {
  const campaigns = await must(supabase.from("campaigns").select("id, name, created_at, archived_at"));
  const rows: CloudRow[] = [];
  // Stop on an empty page, not a short one: the project may cap rows per request below PAGE.
  for (;;) {
    const from = rows.length;
    const page = await must(
      supabase.from("campaign_data").select("campaign_id, key, value").order("campaign_id").order("key").range(from, from + PAGE - 1),
    );
    if (page.length === 0) break;
    rows.push(...page);
  }
  return { campaigns, rows };
}

function applyRemote({ campaigns: cloud, rows }: { campaigns: CloudCampaign[]; rows: CloudRow[] }): void {
  const registry = readCampaignsRegistry();
  const pending = pendingEntries().map((p) => p.entry);
  const pendingCampaigns = new Set(pending.filter((e) => e[0] === "campaign").map((e) => e[1]));
  const { campaigns, removed, upload } = reconcileCampaigns(registry.campaigns, cloud, pendingCampaigns, readSynced());

  for (const id of removed) removeCampaignLocally(id);

  const cloudData = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const values = cloudData.get(row.campaign_id) ?? {};
    values[row.key] = row.value;
    cloudData.set(row.campaign_id, values);
  }
  for (const c of campaigns) {
    if (upload.includes(c.id)) {
      queueWholeCampaign(c.id);
      continue;
    }
    const pendingKeys = new Set(pending.filter((e) => e[0] === "data" && e[1] === c.id).map((e) => e[2] as string));
    const { set, remove } = mergeCampaignData(localData(c.id), cloudData.get(c.id) ?? {}, pendingKeys);
    for (const [key, value] of Object.entries(set)) window.localStorage.setItem(getStorageKey(key, c.id), value);
    for (const key of remove) window.localStorage.removeItem(getStorageKey(key, c.id));
  }

  const keepActive = campaigns.some((c) => c.id === registry.activeCampaignId);
  const fallback = campaigns.find((c) => !c.archivedAt) ?? campaigns[0];
  writeCampaignsRegistry({ campaigns, activeCampaignId: keepActive ? registry.activeCampaignId : (fallback?.id ?? null) });
  writeSynced(new Set(cloud.map((c) => c.id)));
}

/** A campaign the cloud has never seen: queue its row, every key and every file. */
function queueWholeCampaign(campaignId: string): void {
  markDirty(["campaign", campaignId]);
  for (const key of Object.keys(localData(campaignId))) markDirty(["data", campaignId, key]);
  void Promise.all([import("@/lib/imageStore"), import("@/lib/audioStore")])
    .then(async ([images, audio]) => {
      for (const id of await images.localImageIds(campaignId)) markDirty(["file", campaignId, "images", id]);
      for (const id of await audio.localAudioIds(campaignId)) markDirty(["file", campaignId, "audio", id]);
    })
    .catch((e) => console.error("[Magnus Helper] cloud sync: could not list local files:", errorMessage(e)));
}

function localData(campaignId: string): Record<string, string> {
  const prefix = getStorageKey("", campaignId);
  const data: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    const value = key?.startsWith(prefix) ? window.localStorage.getItem(key) : null;
    if (key && value !== null) data[key.slice(prefix.length)] = value;
  }
  return data;
}

function readSynced(): Set<string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SYNCED_CAMPAIGNS_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSynced(ids: Set<string>): void {
  window.localStorage.setItem(SYNCED_CAMPAIGNS_KEY, JSON.stringify([...ids]));
}

// ─── Status (shown in the status bar) ─────────────────────────────────────────

/** `stalled`: the last push stopped on a failure worth retrying (offline, server down); it retries on the next change or when back online. */
export type SyncStatus = { active: boolean; sending: boolean; stalled: boolean; pending: number };

let status: SyncStatus = { active: false, sending: false, stalled: false, pending: 0 };
const statusListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch, pending: pendingEntries().length };
  for (const listener of statusListeners) listener();
}

export const getSyncStatus = (): SyncStatus => status;

export function onSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

// ─── Push ─────────────────────────────────────────────────────────────────────

let timer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | null = null;

function scheduleFlush(): void {
  if (timer || !userId) return;
  timer = setTimeout(() => {
    timer = undefined;
    void flush();
  }, FLUSH_DELAY_MS);
}

/** Pushes everything queued. Stops at the first network failure; the rest waits for the next try. */
export function flush(): Promise<void> {
  if (!userId) return Promise.resolve();
  if (!flushing) setStatus({ sending: true });
  flushing ??= push()
    .then((done) => {
      flushing = null;
      setStatus({ sending: false, stalled: !done });
      // Changes made while sending found the flush busy; send them now unless the cloud is unreachable.
      if (done && pendingEntries().length > 0) scheduleFlush();
    })
    .catch((e) => {
      flushing = null;
      setStatus({ sending: false, stalled: true });
      console.error("[Magnus Helper] cloud sync failed:", errorMessage(e));
    });
  return flushing;
}

/** false when it stopped on a failure worth retrying. */
async function push(): Promise<boolean> {
  const entries = pendingEntries();
  if (entries.length === 0) return true;
  const local = new Map(readCampaignsRegistry().campaigns.map((c) => [c.id, c]));
  const synced = readSynced();

  // Campaign rows first: data and files of a campaign need its row.
  for (const { entry, seq } of entries) {
    if (entry[0] !== "campaign") continue;
    const id = entry[1];
    const campaign = local.get(id);
    const ok = await attempt(entry, seq, async () => {
      if (campaign) {
        await must(
          supabase.from("campaigns").upsert({
            id,
            name: campaign.name,
            created_at: campaign.createdAt,
            archived_at: campaign.archivedAt,
            updated_at: new Date().toISOString(),
          }),
        );
        synced.add(id);
      } else {
        // Files first: once the row is gone, the storage policy no longer lets us remove them.
        await removeCloudFiles(id);
        await must(supabase.from("campaigns").delete().eq("id", id));
        synced.delete(id);
      }
    });
    writeSynced(synced);
    if (!ok) return false;
  }

  const data = entries.filter((e) => e.entry[0] === "data") as { entry: ["data", string, string]; seq: number }[];
  for (const [campaignId, items] of groupBy(data, (e) => e.entry[1])) {
    // A deleted campaign's data went with its row.
    if (!local.has(campaignId)) {
      for (const { entry, seq } of items) clearEntry(entry, seq);
      continue;
    }
    const withValues = items.map((item) => ({ ...item, value: window.localStorage.getItem(getStorageKey(item.entry[2], campaignId)) }));
    const removedKeys = withValues.filter((i) => i.value === null);
    if (removedKeys.length > 0) {
      const ok = await attemptAll(removedKeys, () =>
        must(supabase.from("campaign_data").delete().eq("campaign_id", campaignId).in("key", removedKeys.map((i) => i.entry[2]))),
      );
      if (!ok) return false;
    }
    const written = withValues.filter((i) => i.value !== null);
    for (let i = 0; i < written.length; i += UPSERT_CHUNK) {
      const chunk = written.slice(i, i + UPSERT_CHUNK);
      const now = new Date().toISOString();
      const ok = await attemptAll(chunk, () =>
        must(supabase.from("campaign_data").upsert(chunk.map((c) => ({ campaign_id: campaignId, key: c.entry[2], value: c.value, updated_at: now })))),
      );
      if (!ok) return false;
    }
  }

  for (const { entry, seq } of entries) {
    if (entry[0] !== "file") continue;
    const [, campaignId, kind, id] = entry;
    if (!local.has(campaignId)) {
      clearEntry(entry, seq);
      continue;
    }
    const ok = await attempt(entry, seq, async () => {
      const blob = await localBlob(kind, id, campaignId);
      const path = filePath(campaignId, kind, id);
      if (blob) await must(supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || "application/octet-stream" }));
      else await must(supabase.storage.from(BUCKET).remove([path]));
    });
    if (!ok) return false;
  }
  return true;
}

async function removeCloudFiles(campaignId: string): Promise<void> {
  for (const kind of ["images", "audio"] as const) {
    for (;;) {
      const listed = await must(supabase.storage.from(BUCKET).list(`${campaignId}/${kind}`, { limit: 100 }));
      if (listed.length === 0) break;
      const removed = await must(supabase.storage.from(BUCKET).remove(listed.map((f) => filePath(campaignId, kind, f.name))));
      if (removed.length === 0) break; // nothing we may remove: don't spin
    }
  }
}

async function localBlob(kind: FileKind, id: string, campaignId: string): Promise<Blob | null> {
  if (kind === "images") return (await import("@/lib/imageStore")).localImage(id, campaignId);
  return (await import("@/lib/audioStore")).localAudio(id, campaignId);
}

// ─── Files on demand ──────────────────────────────────────────────────────────

/** A file of the active campaign that this device doesn't have yet; null when signed out, offline or missing. */
export async function downloadFile(kind: FileKind, id: string): Promise<Blob | null> {
  const campaignId = getActiveCampaignId();
  if (!userId || !campaignId) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath(campaignId, kind, id));
  return error ? null : data;
}

export async function cloudFileExists(kind: FileKind, id: string): Promise<boolean> {
  const campaignId = getActiveCampaignId();
  if (!userId || !campaignId) return false;
  const { data, error } = await supabase.storage.from(BUCKET).exists(filePath(campaignId, kind, id));
  return !error && data;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

class CloudError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

/** Offline, server trouble, an expired token or a table not migrated yet: try again later. Anything else won't get better. */
function isRetryable(status: number | undefined): boolean {
  return !status || status >= 500 || [401, 404, 408, 429].includes(status);
}

type CloudResult<T> = { data: T; error: { message: string; status?: number | string } | null; status?: number };

async function must<T>(query: PromiseLike<CloudResult<T>>): Promise<NonNullable<T>> {
  let result: CloudResult<T>;
  try {
    result = await query;
  } catch (e) {
    throw new CloudError(errorMessage(e), true);
  }
  if (result.error) {
    const status = result.status ?? Number(result.error.status ?? 0);
    throw new CloudError(result.error.message, isRetryable(status));
  }
  return result.data as NonNullable<T>;
}

/** true when the entry is done with: sent, or dropped because it can never succeed. */
async function attempt(entry: SyncEntry, seq: number, send: () => Promise<unknown>): Promise<boolean> {
  return attemptAll([{ entry, seq }], send);
}

async function attemptAll(items: { entry: SyncEntry; seq: number }[], send: () => Promise<unknown>): Promise<boolean> {
  try {
    await send();
  } catch (e) {
    if (e instanceof CloudError && !e.retry) {
      console.error("[Magnus Helper] cloud sync dropped a change the server refused:", e.message, items.map((i) => i.entry));
    } else {
      console.warn("[Magnus Helper] cloud sync will retry:", errorMessage(e));
      return false;
    }
  }
  for (const { entry, seq } of items) clearEntry(entry, seq);
  return true;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
