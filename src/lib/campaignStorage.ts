export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  archivedAt: string | null;
}

interface CampaignsRegistry {
  campaigns: Campaign[];
  activeCampaignId: string | null;
}

export const CAMPAIGNS_REGISTRY_KEY = "magnus_campaigns";
const NAMESPACE_PREFIX = "campaign:";

const EMPTY_REGISTRY: CampaignsRegistry = { campaigns: [], activeCampaignId: null };

/**
 * Device/UI-level preferences that stay global instead of being isolated per
 * campaign (Decyzja 2 scopes *game data* to campaigns, not device prefs).
 * Keep this in sync with any `{ global: true }` useLocalStorage call sites.
 */
const GLOBAL_KEYS = new Set<string>([
  CAMPAIGNS_REGISTRY_KEY,
  "magnus_settings",
  "rpg_theme",
  "magnus_sidebar_width",
  "rpg_mode",
  "magnus-dice-3d-visual",
]);

const LEGACY_DATA_PREFIXES = ["rpg_", "magnus_", "magnus-"] as const;
/** Known legacy key that doesn't follow the rpg_/magnus_ naming convention. */
const LEGACY_EXTRA_KEYS = ["mg_session_notes"];

function isLegacyGameDataKey(key: string): boolean {
  if (GLOBAL_KEYS.has(key)) return false;
  if (isNamespacedKey(key)) return false;
  if (LEGACY_EXTRA_KEYS.includes(key)) return true;
  return LEGACY_DATA_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function collectLegacyGameDataKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && isLegacyGameDataKey(key)) keys.push(key);
  }
  return keys;
}

export function hasLegacyGameData(): boolean {
  try {
    return collectLegacyGameDataKeys().length > 0;
  } catch {
    return false;
  }
}

/**
 * Moves any un-namespaced, flat legacy game-data keys into a campaign's own
 * namespace. Used both by the one-shot boot migration and whenever a
 * campaign becomes active from an "empty" registry (e.g. after the last
 * campaign was deleted and a new one is created), so data written in that
 * in-between window is never silently orphaned.
 */
function absorbLegacyDataInto(campaignId: string): void {
  try {
    for (const key of collectLegacyGameDataKeys()) {
      const value = window.localStorage.getItem(key);
      if (value === null) continue;
      window.localStorage.setItem(getStorageKey(key, campaignId), value);
      window.localStorage.removeItem(key);
    }
  } catch {
    // storage unavailable — nothing to absorb
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function readCampaignsRegistry(): CampaignsRegistry {
  try {
    const raw = window.localStorage.getItem(CAMPAIGNS_REGISTRY_KEY);
    if (!raw) return EMPTY_REGISTRY;
    const parsed = JSON.parse(raw) as Partial<CampaignsRegistry>;
    return {
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      activeCampaignId: parsed.activeCampaignId ?? null,
    };
  } catch {
    return EMPTY_REGISTRY;
  }
}

function writeCampaignsRegistry(registry: CampaignsRegistry): void {
  try {
    window.localStorage.setItem(CAMPAIGNS_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // storage unavailable/full — silently ignored, consistent with useLocalStorage
  }
}

export function listCampaigns(): Campaign[] {
  return readCampaignsRegistry().campaigns;
}

export function getActiveCampaignId(): string | null {
  return readCampaignsRegistry().activeCampaignId;
}

export function setActiveCampaignId(campaignId: string): void {
  const registry = readCampaignsRegistry();
  if (!registry.campaigns.some((c) => c.id === campaignId)) return;
  writeCampaignsRegistry({ ...registry, activeCampaignId: campaignId });
}

/**
 * Creates a new campaign and makes it the active one only if no campaign was
 * active before (e.g. the very first campaign, or the initial migration).
 * Switching to a freshly created campaign is a separate, explicit action —
 * see Decyzja 1 (header shortcut creates, but doesn't force-switch).
 */
export function createCampaign(name: string): Campaign {
  const registry = readCampaignsRegistry();
  const campaign: Campaign = {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
  const becomesActive = registry.activeCampaignId === null;
  writeCampaignsRegistry({
    campaigns: [...registry.campaigns, campaign],
    activeCampaignId: becomesActive ? campaign.id : registry.activeCampaignId,
  });
  if (becomesActive) absorbLegacyDataInto(campaign.id);
  return campaign;
}

export function renameCampaign(campaignId: string, name: string): void {
  const registry = readCampaignsRegistry();
  writeCampaignsRegistry({
    ...registry,
    campaigns: registry.campaigns.map((c) => (c.id === campaignId ? { ...c, name } : c)),
  });
}

export function archiveCampaign(campaignId: string): void {
  const registry = readCampaignsRegistry();
  writeCampaignsRegistry({
    ...registry,
    campaigns: registry.campaigns.map((c) =>
      c.id === campaignId ? { ...c, archivedAt: new Date().toISOString() } : c,
    ),
  });
}

export function unarchiveCampaign(campaignId: string): void {
  const registry = readCampaignsRegistry();
  writeCampaignsRegistry({
    ...registry,
    campaigns: registry.campaigns.map((c) => (c.id === campaignId ? { ...c, archivedAt: null } : c)),
  });
}

/** Removes a campaign and every piece of namespaced data that belongs to it. */
export function deleteCampaign(campaignId: string): void {
  const registry = readCampaignsRegistry();
  const remaining = registry.campaigns.filter((c) => c.id !== campaignId);
  const activeCampaignId =
    registry.activeCampaignId === campaignId
      ? (remaining[0]?.id ?? null)
      : registry.activeCampaignId;

  const prefix = `${NAMESPACE_PREFIX}${campaignId}:`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) window.localStorage.removeItem(key);
  } catch {
    // storage unavailable — nothing left to clean up
  }

  writeCampaignsRegistry({ campaigns: remaining, activeCampaignId });
}

/** Namespaces a raw storage key under a campaign. Defaults to the active campaign. */
export function getStorageKey(key: string, campaignId?: string): string {
  const id = campaignId ?? getActiveCampaignId();
  if (!id) return key;
  return `${NAMESPACE_PREFIX}${id}:${key}`;
}

export function isNamespacedKey(key: string): boolean {
  return key.startsWith(NAMESPACE_PREFIX);
}
