import type { LootRank } from "@/context/AppContext";
import type { LootDbItem } from "@/lib/lootDb";
import type { ShopConfigStored, ShopCurrencyConfig, ShopStockLine, ShopWealthLevel, ShopTypeEntry } from "@/lib/shopTypes";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function weightedRandom(ranks: LootRank[]): LootRank | null {
  const total = ranks.reduce((s, r) => s + r.chance, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const r of ranks) {
    roll -= r.chance;
    if (roll <= 0) return r;
  }
  return ranks[ranks.length - 1] ?? null;
}

function normalizeWeights(ranks: LootRank[]): LootRank[] {
  const total = ranks.reduce((s, r) => s + r.chance, 0);
  if (total <= 0) return ranks.map((r) => ({ ...r, chance: 100 / ranks.length }));
  const scale = 100 / total;
  return ranks.map((r) => ({ ...r, chance: r.chance * scale }));
}

function wealthAdjustedRanks(ranks: LootRank[], wealth: ShopWealthLevel): LootRank[] {
  if (wealth === "average") return normalizeWeights([...ranks]);

  const n = ranks.length;
  const idxRzadki = ranks.findIndex((r) => r.name === "Rzadki");
  const idxPospolity = ranks.findIndex((r) => r.name === "Pospolity");
  const rareFrom = idxRzadki >= 0 ? idxRzadki : Math.max(0, n - 2);
  const commonTo = idxPospolity >= 0 ? idxPospolity : Math.min(1, Math.max(0, n - 1));

  const adjusted = ranks.map((r, i) => {
    let mult = 1;
    if (wealth === "poor" && i >= rareFrom) mult = 0.2;
    if (wealth === "rich" && i <= commonTo) mult = 0.2;
    return { ...r, chance: r.chance * mult };
  });
  return normalizeWeights(adjusted);
}

/** Sąsiedztwo: najpierw w dół, potem w górę, max 3 indeksy rang */
function rankIndicesToTry(pickedIndex: number, rankCount: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i < 0 || i >= rankCount || seen.has(i)) return;
    seen.add(i);
    out.push(i);
  };
  push(pickedIndex);
  for (let d = 1; d < rankCount && out.length < 3; d++) {
    push(pickedIndex - d);
    if (out.length >= 3) break;
    push(pickedIndex + d);
  }
  return out.slice(0, 3);
}

function itemMatchesPreferredTypes(item: LootDbItem, preferred: string[]): boolean {
  if (preferred.length === 0) return true;
  const t = item.type.trim().toLowerCase();
  return preferred.some((p) => p.trim().toLowerCase() === t);
}

export function filterPoolByShopType(items: LootDbItem[], shopType: ShopTypeEntry | null): LootDbItem[] {
  if (!shopType) return items;
  return items.filter((it) => itemMatchesPreferredTypes(it, shopType.preferredTypes));
}

function priceLabelToTier(
  currency: string,
  cfg: ShopCurrencyConfig,
): "gold" | "silver" | "copper" {
  const c = currency.trim().toLowerCase();
  if (c === cfg.goldLabel.trim().toLowerCase()) return "gold";
  if (c === cfg.copperLabel.trim().toLowerCase()) return "copper";
  if (c === cfg.silverLabel.trim().toLowerCase()) return "silver";
  if (c === "zł" || c === "zl" || c === "gold") return "gold";
  if (c === "mk" || c === "pn" || c === "cp" || c === "miedź" || c === "miedz") return "copper";
  if (c === "sz" || c === "ss" || c === "silver") return "silver";
  return "silver";
}

/** Cena przedmiotu w „miedzi” (mk) wg przelicznika sklepu */
export function itemPriceToCopper(price: number, itemCurrency: string, cfg: ShopCurrencyConfig): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const g = Math.max(1, cfg.silverPerGold);
  const s = Math.max(1, cfg.copperPerSilver);
  const tier = priceLabelToTier(itemCurrency || cfg.silverLabel, cfg);
  if (tier === "gold") return Math.round(price * g * s);
  if (tier === "silver") return Math.round(price * s);
  return Math.round(price);
}

function rollPriceForLine(
  item: LootDbItem,
  rankId: string,
  rankPriceRanges: Record<string, { min: number; max: number }>,
  currencyCfg: ShopCurrencyConfig,
): number {
  const base = item.price > 0 ? itemPriceToCopper(item.price, item.currency, currencyCfg) : 0;
  if (base > 0) {
    return Math.round(base * randFloat(0.8, 1.2));
  }
  const range = rankPriceRanges[rankId] ?? { min: 5, max: 30 };
  return randInt(range.min, range.max);
}

function rankIdByName(ranks: LootRank[], rankName: string): string {
  return ranks.find((r) => r.name === rankName)?.id ?? ranks[0]?.id ?? "";
}

export interface GenerateShopInput {
  lootItems: LootDbItem[];
  ranks: LootRank[];
  shopType: ShopTypeEntry | null;
  wealth: ShopWealthLevel;
  count: number;
  shopConfig: ShopConfigStored;
}

export function generateShopAssortment(input: GenerateShopInput): { lines: ShopStockLine[]; error?: string } {
  const { lootItems, ranks, shopType, wealth, count, shopConfig } = input;
  const pool = filterPoolByShopType(lootItems, shopType);
  if (pool.length === 0) {
    return {
      lines: [],
      error:
        "Brak przedmiotów pasujących do typu sklepu. Dodaj przedmioty w zakładce Przedmioty.",
    };
  }

  const weightedRanks = wealthAdjustedRanks(ranks, wealth);
  const rankByName = new Map(ranks.map((r) => [r.name, r]));
  const lines: ShopStockLine[] = [];

  for (let n = 0; n < count; n++) {
    const picked = weightedRandom(weightedRanks);
    if (!picked) continue;
    const pickedIndex = ranks.findIndex((r) => r.id === picked.id);
    if (pickedIndex < 0) continue;

    const tryIndices = rankIndicesToTry(pickedIndex, ranks.length);
    let chosenItem: LootDbItem | null = null;
    let chosenRank: LootRank | null = null;

    for (const ri of tryIndices) {
      const rank = ranks[ri];
      const sub = pool.filter((it) => it.rankName === rank.name);
      if (sub.length > 0) {
        chosenItem = sub[Math.floor(Math.random() * sub.length)];
        chosenRank = rank;
        break;
      }
    }

    if (!chosenItem || !chosenRank) continue;

    const rankId = chosenRank.id;
    const priceCopper = rollPriceForLine(chosenItem, rankId, shopConfig.rankPriceRanges, shopConfig.currency);

    lines.push({
      lineId: crypto.randomUUID(),
      sourceItemId: chosenItem.id,
      name: chosenItem.name,
      type: chosenItem.type,
      rankName: chosenItem.rankName,
      description: chosenItem.description,
      priceCopper,
    });
  }

  return { lines };
}

/** Cena dla ręcznego dodania: jak przy generacji (los z bazy lub z zakresu rangi) */
export function rollPriceForManualItem(
  item: LootDbItem,
  ranks: LootRank[],
  shopConfig: ShopConfigStored,
): number {
  const rankId = rankIdByName(ranks, item.rankName);
  return rollPriceForLine(item, rankId, shopConfig.rankPriceRanges, shopConfig.currency);
}

export function copperToGoldDecimal(priceCopper: number, cfg: ShopCurrencyConfig): number {
  const g = Math.max(1, cfg.silverPerGold);
  const s = Math.max(1, cfg.copperPerSilver);
  const perGold = g * s;
  return priceCopper / perGold;
}

export function formatPriceInGold(priceCopper: number, cfg: ShopCurrencyConfig, fractionDigits = 2): string {
  const v = copperToGoldDecimal(priceCopper, cfg);
  const label = cfg.goldLabel || "zł";
  return `${v.toFixed(fractionDigits)} ${label}`;
}
