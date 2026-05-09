import type { LootRank } from "@/context/AppContext";

export type ShopWealthLevel = "poor" | "average" | "rich";

export interface ShopCurrencyConfig {
  goldLabel: string;
  silverLabel: string;
  copperLabel: string;
  silverPerGold: number;
  copperPerSilver: number;
}

export interface ShopTypeEntry {
  id: string;
  name: string;
  preferredTypes: string[];
}

export interface ShopConfigStored {
  shopTypes: ShopTypeEntry[];
  wealthLevel: ShopWealthLevel;
  itemCount: number;
  currency: ShopCurrencyConfig;
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
  priceCopper: number;
}

export interface ShopSnapshot {
  id: string;
  snapshotName: string;
  savedAt: number;
  shopTitle: string;
  lines: ShopStockLine[];
}

const DEFAULT_CURRENCY: ShopCurrencyConfig = {
  goldLabel: "zł",
  silverLabel: "sz",
  copperLabel: "mk",
  silverPerGold: 10,
  copperPerSilver: 10,
};

const DEFAULT_SHOP_TYPES: ShopTypeEntry[] = [
  { id: "st-armory", name: "Zbrojownia", preferredTypes: ["broń", "zbroja"] },
  { id: "st-apothecary", name: "Apteka / Zielarz", preferredTypes: ["mikstura"] },
  { id: "st-market", name: "Targowisko", preferredTypes: [] },
  { id: "st-tavern", name: "Karczma", preferredTypes: ["mikstura", "gadżet"] },
  { id: "st-general", name: "Sklep ogólny", preferredTypes: [] },
];

export function defaultPriceRangeForRankName(rankName: string): { min: number; max: number } {
  const m: Record<string, { min: number; max: number }> = {
    Zniszczony: { min: 1, max: 5 },
    Pospolity: { min: 5, max: 30 },
    Rzadki: { min: 30, max: 150 },
    Ciekawy: { min: 100, max: 400 },
    Wyjątkowy: { min: 300, max: 1000 },
  };
  return m[rankName] ?? { min: 5, max: 30 };
}

function buildDefaultRankRanges(ranks: LootRank[]): Record<string, { min: number; max: number }> {
  const out: Record<string, { min: number; max: number }> = {};
  for (const r of ranks) {
    out[r.id] = defaultPriceRangeForRankName(r.name);
  }
  return out;
}

export const DEFAULT_SHOP_CONFIG_BASE: Omit<ShopConfigStored, "rankPriceRanges" | "selectedShopTypeId"> = {
  shopTypes: DEFAULT_SHOP_TYPES,
  wealthLevel: "average",
  itemCount: 8,
  currency: DEFAULT_CURRENCY,
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

  let currency: ShopCurrencyConfig = { ...DEFAULT_CURRENCY };
  if (o.currency && typeof o.currency === "object") {
    const c = o.currency as Record<string, unknown>;
    currency = {
      goldLabel: typeof c.goldLabel === "string" && c.goldLabel ? c.goldLabel : DEFAULT_CURRENCY.goldLabel,
      silverLabel: typeof c.silverLabel === "string" && c.silverLabel ? c.silverLabel : DEFAULT_CURRENCY.silverLabel,
      copperLabel: typeof c.copperLabel === "string" && c.copperLabel ? c.copperLabel : DEFAULT_CURRENCY.copperLabel,
      silverPerGold:
        typeof c.silverPerGold === "number" && c.silverPerGold > 0 ? c.silverPerGold : DEFAULT_CURRENCY.silverPerGold,
      copperPerSilver:
        typeof c.copperPerSilver === "number" && c.copperPerSilver > 0
          ? c.copperPerSilver
          : DEFAULT_CURRENCY.copperPerSilver,
    };
  }

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
    currency,
    rankPriceRanges,
    selectedShopTypeId,
  };
}
