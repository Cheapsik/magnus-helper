import type { LootRank } from "@/lib/lootDb";

export type ShopWealthLevel = "poor" | "average" | "rich";

export interface ShopTypeEntry {
  id: string;
  name: string;
  preferredTypes: string[];
}

export interface ShopConfigStored {
  shopTypes: ShopTypeEntry[];
  wealthLevel: ShopWealthLevel;
  itemCount: number;
  /** Per rank id, in the campaign's smallest denomination. */
  rankPriceRanges: Record<string, { min: number; max: number }>;
  selectedShopTypeId: string | null;
}

export interface ShopStockLine {
  lineId: string;
  sourceItemId: string;
  name: string;
  type: string;
  rankName: string;
  description: string;
  /** In the campaign's smallest denomination. */
  price: number;
}

export interface ShopSnapshot {
  id: string;
  snapshotName: string;
  savedAt: number;
  shopTitle: string;
  lines: ShopStockLine[];
}

const DEFAULT_SHOP_TYPES: ShopTypeEntry[] = [
  { id: "st-weapons", name: "Broń", preferredTypes: ["broń"] },
  { id: "st-clothes", name: "Odzież", preferredTypes: ["odzież"] },
  { id: "st-gear", name: "Wyposażenie", preferredTypes: ["wyposażenie", "drobiazg"] },
  { id: "st-market", name: "Targowisko", preferredTypes: [] },
];

export const DEFAULT_PRICE_RANGE = { min: 5, max: 30 };

/** Until the GM sets them, each rank starts four times pricier than the one before it. */
function defaultPriceRangeForRankIndex(index: number): { min: number; max: number } {
  const scale = 4 ** Math.min(index, 6);
  return { min: DEFAULT_PRICE_RANGE.min * scale, max: DEFAULT_PRICE_RANGE.max * scale };
}

function buildDefaultRankRanges(ranks: LootRank[]): Record<string, { min: number; max: number }> {
  const out: Record<string, { min: number; max: number }> = {};
  ranks.forEach((r, index) => {
    out[r.id] = defaultPriceRangeForRankIndex(index);
  });
  return out;
}

export const DEFAULT_SHOP_CONFIG_BASE: Omit<ShopConfigStored, "rankPriceRanges" | "selectedShopTypeId"> = {
  shopTypes: DEFAULT_SHOP_TYPES,
  wealthLevel: "average",
  itemCount: 8,
};

export function normalizeShopConfig(raw: unknown, ranks: LootRank[]): ShopConfigStored {
  const defaultRanges = buildDefaultRankRanges(ranks);
  const firstTypeId = DEFAULT_SHOP_TYPES[0]?.id ?? "";

  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SHOP_CONFIG_BASE,
      rankPriceRanges: defaultRanges,
      selectedShopTypeId: firstTypeId,
    };
  }

  const o = raw as Record<string, unknown>;

  const shopTypesRaw = o.shopTypes;
  let shopTypes: ShopTypeEntry[] = DEFAULT_SHOP_TYPES;
  if (Array.isArray(shopTypesRaw) && shopTypesRaw.length > 0) {
    shopTypes = shopTypesRaw
      .map((x): ShopTypeEntry | null => {
        if (!x || typeof x !== "object") return null;
        const e = x as Record<string, unknown>;
        const id = typeof e.id === "string" ? e.id : crypto.randomUUID();
        const name = typeof e.name === "string" ? e.name : "";
        const pt = e.preferredTypes;
        const preferredTypes =
          Array.isArray(pt) && pt.every((t) => typeof t === "string") ? (pt as string[]) : [];
        if (!name.trim()) return null;
        return { id, name: name.trim(), preferredTypes };
      })
      .filter(Boolean) as ShopTypeEntry[];
    if (shopTypes.length === 0) shopTypes = DEFAULT_SHOP_TYPES;
  }

  const wealthLevel: ShopWealthLevel =
    o.wealthLevel === "poor" || o.wealthLevel === "average" || o.wealthLevel === "rich" ? o.wealthLevel : "average";

  let itemCount = typeof o.itemCount === "number" && Number.isFinite(o.itemCount) ? Math.round(o.itemCount) : 8;
  itemCount = Math.min(20, Math.max(1, itemCount));

  const rankPriceRanges: Record<string, { min: number; max: number }> = { ...defaultRanges };
  if (o.rankPriceRanges && typeof o.rankPriceRanges === "object") {
    const rr = o.rankPriceRanges as Record<string, unknown>;
    for (const r of ranks) {
      const v = rr[r.id];
      if (v && typeof v === "object") {
        const b = v as Record<string, unknown>;
        const min = typeof b.min === "number" && Number.isFinite(b.min) ? Math.max(0, Math.round(b.min)) : defaultRanges[r.id].min;
        const max = typeof b.max === "number" && Number.isFinite(b.max) ? Math.max(0, Math.round(b.max)) : defaultRanges[r.id].max;
        rankPriceRanges[r.id] = { min: Math.min(min, max), max: Math.max(min, max) };
      }
    }
  }

  let selectedShopTypeId: string | null =
    typeof o.selectedShopTypeId === "string" ? o.selectedShopTypeId : null;
  if (!selectedShopTypeId || !shopTypes.some((t) => t.id === selectedShopTypeId)) {
    selectedShopTypeId = shopTypes[0]?.id ?? null;
  }

  return {
    shopTypes,
    wealthLevel,
    itemCount,
    rankPriceRanges,
    selectedShopTypeId,
  };
}
