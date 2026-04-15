const RPG_ITEMS_KEY = "rpg_items_db";
const RPG_LOOT_KEY = "rpg_loot_config";

export interface LootDbItem {
  id: string;
  name: string;
  type: string;
  rankName: string;
  description: string;
  price: number;
  currency: string;
}

interface LegacyLootItemRow {
  id: string;
  name: string;
  type: string;
  rankId: string;
  description: string;
}

interface LegacyLootConfig {
  ranks?: { id: string; name: string; chance: number }[];
  items?: LegacyLootItemRow[];
  itemCurrency?: string;
  coinRanges?: unknown;
  itemCount?: unknown;
}

function rankNameForId(ranks: { id: string; name: string }[], rankId: string): string {
  return ranks.find((r) => r.id === rankId)?.name ?? "Pospolity";
}

export const DEFAULT_LOOT_DB_ITEMS: LootDbItem[] = [
  { id: "def-1", name: "Zardzewiały miecz", type: "broń", rankName: "Zniszczony", description: "Ledwo trzyma się w całości", price: 2, currency: "sz" },
  { id: "def-2", name: "Krótki miecz", type: "broń", rankName: "Pospolity", description: "", price: 15, currency: "sz" },
  { id: "def-3", name: "Elficki sztylet", type: "broń", rankName: "Rzadki", description: "Wyryty runicznym wzorem", price: 120, currency: "sz" },
  { id: "def-4", name: "Połatana skórzana", type: "zbroja", rankName: "Zniszczony", description: "Pełna dziur", price: 3, currency: "sz" },
  { id: "def-5", name: "Kolczuga", type: "zbroja", rankName: "Pospolity", description: "", price: 40, currency: "sz" },
  { id: "def-6", name: "Mikstura leczenia", type: "mikstura", rankName: "Pospolity", description: "Leczy 1k6 ran", price: 25, currency: "sz" },
  { id: "def-7", name: "Antytruciznka", type: "mikstura", rankName: "Rzadki", description: "Neutralizuje większość trucizn", price: 80, currency: "sz" },
  { id: "def-8", name: "Stara mapa", type: "gadżet", rankName: "Ciekawy", description: "Prowadzi gdzieś... ale gdzie?", price: 50, currency: "sz" },
  { id: "def-9", name: "Sygnet z herbem", type: "gadżet", rankName: "Ciekawy", description: "Czyj to ród?", price: 35, currency: "sz" },
];

export function normalizeLootDbItem(raw: unknown, defaultCurrency: string): LootDbItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name =
    typeof o.name === "string" && o.name
      ? o.name
      : typeof o.nazwa === "string"
        ? o.nazwa
        : "";
  if (!id || !name) return null;
  const type =
    typeof o.type === "string" ? o.type : typeof o.typ === "string" ? o.typ : "other";
  const rankName =
    typeof o.rankName === "string"
      ? o.rankName
      : typeof o.ranga === "string"
        ? o.ranga
        : "Pospolity";
  const description =
    typeof o.description === "string" ? o.description : typeof o.opis === "string" ? o.opis : "";
  const priceRaw = o.price ?? o.cena;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw) ? Math.max(0, priceRaw) : 0;
  const currency =
    typeof o.currency === "string"
      ? o.currency
      : typeof o.waluta === "string"
        ? o.waluta
        : defaultCurrency;
  return { id, name, type, rankName, description, price, currency };
}

function migrateLegacyLootItemsIfNeeded(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RPG_LOOT_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let loot: LegacyLootConfig;
  try {
    loot = JSON.parse(raw) as LegacyLootConfig;
  } catch {
    return;
  }
  if (!loot.items || !Array.isArray(loot.items) || loot.items.length === 0) return;

  const ranks = loot.ranks ?? [];
  const lootRec = loot as Record<string, unknown>;
  const defaultCurrency =
    typeof loot.itemCurrency === "string"
      ? loot.itemCurrency
      : typeof lootRec["itemWaluta"] === "string"
        ? (lootRec["itemWaluta"] as string)
        : "sz";

  let existing: LootDbItem[] = [];
  try {
    const itemsRaw = localStorage.getItem(RPG_ITEMS_KEY);
    if (itemsRaw) {
      const parsed = JSON.parse(itemsRaw) as unknown[];
      if (Array.isArray(parsed)) {
        existing = parsed.map((x) => normalizeLootDbItem(x, defaultCurrency)).filter(Boolean) as LootDbItem[];
      }
    }
  } catch {
    existing = [];
  }

  const existingIds = new Set(existing.map((i) => i.id));
  for (const it of loot.items) {
    if (!it?.id || existingIds.has(it.id)) continue;
    existing.push({
      id: it.id,
      name: it.name ?? "",
      type: it.type ?? "other",
      rankName: rankNameForId(ranks, it.rankId),
      description: it.description ?? "",
      price: 0,
      currency: defaultCurrency,
    });
    existingIds.add(it.id);
  }

  try {
    localStorage.setItem(RPG_ITEMS_KEY, JSON.stringify(existing));
  } catch {
    void 0;
  }

  const { items: _removed, ...rest } = loot;
  try {
    localStorage.setItem(RPG_LOOT_KEY, JSON.stringify(rest));
  } catch {
    void 0;
  }
}

function migrateItemsDbPolishKeysIfNeeded(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RPG_ITEMS_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let arr: unknown[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    arr = parsed;
  } catch {
    return;
  }
  const first = arr[0];
  if (!first || typeof first !== "object") return;
  const row = first as Record<string, unknown>;
  if (!("nazwa" in row) || "name" in row) return;
  const converted = arr.map((rawRow) => {
    const r = rawRow as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      name: String(r.nazwa ?? ""),
      type: String(r.typ ?? "other"),
      rankName: String(r.ranga ?? "Pospolity"),
      description: String(r.opis ?? ""),
      price: typeof r.cena === "number" && Number.isFinite(r.cena) ? Math.max(0, r.cena) : 0,
      currency: String(r.waluta ?? "sz"),
    };
  }).filter((x) => x.id && x.name);
  try {
    localStorage.setItem(RPG_ITEMS_KEY, JSON.stringify(converted));
  } catch {
    void 0;
  }
}

function migrateLootConfigCurrencyKey(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RPG_LOOT_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o["itemWaluta"] === "string" && typeof o.itemCurrency !== "string") {
      o.itemCurrency = o["itemWaluta"];
      delete o["itemWaluta"];
      localStorage.setItem(RPG_LOOT_KEY, JSON.stringify(o));
    }
  } catch {
    void 0;
  }
}

function seedDefaultLootItemsIfEmpty(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RPG_ITEMS_KEY);
  } catch {
    return;
  }
  let items: unknown[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
  }
  if (items.length > 0) return;
  try {
    localStorage.setItem(RPG_ITEMS_KEY, JSON.stringify(DEFAULT_LOOT_DB_ITEMS));
  } catch {
    void 0;
  }
}

export function initLootStorage(): void {
  if (typeof window === "undefined") return;
  migrateLegacyLootItemsIfNeeded();
  migrateItemsDbPolishKeysIfNeeded();
  migrateLootConfigCurrencyKey();
  seedDefaultLootItemsIfEmpty();
}
