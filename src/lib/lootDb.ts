import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getStorageKey } from "@/lib/campaignStorage";
import { writeJson } from "@/lib/storage";

/**
 * The campaign's item base and loot generator settings. Every price and coin
 * amount is a whole number of the campaign's smallest denomination ("Waluta
 * kampanii", CONTEXT.md) and is shown with `formatMoney`.
 */

const RPG_ITEMS_KEY = "rpg_items_db";
const LOOT_CONFIG_KEY = "rpg_loot_settings";

export interface LootDbItem {
  id: string;
  name: string;
  type: string;
  rankName: string;
  description: string;
  /** In the smallest denomination. */
  price: number;
  /** @deprecated Prices are in the campaign's smallest denomination; nothing reads this. */
}

export interface LootRank {
  id: string;
  name: string;
  chance: number;
}

export interface CoinRange {
  min: number;
  max: number;
}

export interface LootConfig {
  ranks: LootRank[];
  /** How many coins of each denomination a loot roll yields, keyed by denomination id. */
  coinRanges: Record<string, CoinRange>;
  itemCount: { min: number; max: number };
}

export const DEFAULT_LOOT_CONFIG: LootConfig = {
  ranks: [
    { id: "r1", name: "Zniszczony", chance: 35 },
    { id: "r2", name: "Pospolity", chance: 30 },
    { id: "r3", name: "Rzadki", chance: 20 },
    { id: "r4", name: "Ciekawy", chance: 10 },
    { id: "r5", name: "Wyjątkowy", chance: 5 },
  ],
  coinRanges: {},
  itemCount: { min: 1, max: 4 },
};

export const NO_COINS: CoinRange = { min: 0, max: 0 };

/** Generic examples so a fresh base is not empty; prices are in the smallest denomination. */
export const DEFAULT_LOOT_DB_ITEMS: LootDbItem[] = [
  { id: "def-1", name: "Wyszczerbiony nóż", type: "broń", rankName: "Zniszczony", description: "Ledwo trzyma się w całości", price: 5 },
  { id: "def-2", name: "Pałka", type: "broń", rankName: "Pospolity", description: "", price: 20 },
  { id: "def-3", name: "Zdobiony sztylet", type: "broń", rankName: "Rzadki", description: "Rękojeść z wyrytym wzorem", price: 400 },
  { id: "def-4", name: "Połatana kurtka", type: "odzież", rankName: "Zniszczony", description: "Pełna dziur", price: 8 },
  { id: "def-5", name: "Gruby płaszcz", type: "odzież", rankName: "Pospolity", description: "", price: 60 },
  { id: "def-6", name: "Lina (10 m)", type: "wyposażenie", rankName: "Pospolity", description: "", price: 15 },
  { id: "def-7", name: "Latarnia", type: "wyposażenie", rankName: "Rzadki", description: "Szczelna, nie gaśnie na wietrze", price: 120 },
  { id: "def-8", name: "Stara mapa", type: "drobiazg", rankName: "Ciekawy", description: "Prowadzi gdzieś... ale gdzie?", price: 150 },
  { id: "def-9", name: "Sygnet z herbem", type: "drobiazg", rankName: "Ciekawy", description: "Czyj to ród?", price: 350 },
];

export function useLootItems(): [LootDbItem[], (next: LootDbItem[] | ((prev: LootDbItem[]) => LootDbItem[])) => void] {
  return useLocalStorage<LootDbItem[]>(RPG_ITEMS_KEY, []);
}

export function useLootConfig(): [LootConfig, (next: LootConfig | ((prev: LootConfig) => LootConfig)) => void] {
  return useLocalStorage<LootConfig>(LOOT_CONFIG_KEY, DEFAULT_LOOT_CONFIG);
}

function seedDefaultLootItemsIfEmpty(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(getStorageKey(RPG_ITEMS_KEY));
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
  writeJson(RPG_ITEMS_KEY, DEFAULT_LOOT_DB_ITEMS);
}

export function initLootStorage(): void {
  if (typeof window === "undefined") return;
  seedDefaultLootItemsIfEmpty();
}
