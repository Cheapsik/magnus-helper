import type { DrawerEntityType } from "@/context/DrawerContext";
import { readJson } from "@/lib/storage";
import { readCampaignSystem, readCards } from "@/lib/cardStore";
import { CARD_KIND_LABELS, type CardKind, cardSubtitle, cardTitle } from "@/lib/cardSchema";

export interface SearchResultItem {
  id: string;
  type: DrawerEntityType;
  typeLabel: string;
  icon: string;
  title: string;
  description: string;
  keywords: string;
}

export interface SearchGroup {
  key: DrawerEntityType;
  label: string;
  items: SearchResultItem[];
  total: number;
}

function parseJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return readJson(key, fallback);
}

/** Campaign cards of one kind; keywords cover name, subtitle and notes. */
function cardSearchItems(kind: CardKind, icon: string): SearchResultItem[] {
  if (typeof window === "undefined") return [];
  const cardType = readCampaignSystem().cards[kind];
  return readCards(kind).map((card) => {
    const title = cardTitle(card, CARD_KIND_LABELS[kind]);
    const subtitle = cardSubtitle(cardType, card);
    return {
      id: card.id,
      type: kind,
      typeLabel: CARD_KIND_LABELS[kind],
      icon,
      title,
      description: subtitle,
      keywords: `${title} ${subtitle} ${card.notes ?? ""}`.toLowerCase(),
    };
  });
}

export function buildSearchIndex(): SearchResultItem[] {
  const npcs = cardSearchItems("npc", "👤");
  const monsters = cardSearchItems("monster", "💀");

  const items = parseJson<Array<Record<string, unknown>>>("rpg_items_db", []).map((item) => ({
    id: String(item.id ?? ""),
    type: "item" as const,
    typeLabel: "Przedmiot",
    icon: "⚔️",
    title: String(item.name ?? "Przedmiot"),
    description: `${String(item.type ?? "")} · ${String(item.rankName ?? "")}`,
    keywords: `${String(item.name ?? "")} ${String(item.type ?? "")} ${String(item.rankName ?? "")}`.toLowerCase(),
  }));

  const questStorage = parseJson<{ quests?: Array<Record<string, unknown>> }>("rpg_quests", { quests: [] });
  const quests = (questStorage.quests ?? []).map((quest) => ({
    id: String(quest.id ?? ""),
    type: "quest" as const,
    typeLabel: "Watek",
    icon: "📌",
    title: String(quest.title ?? "Watek"),
    description: String(quest.notes ?? ""),
    keywords: `${String(quest.title ?? "")} ${String(quest.notes ?? "")}`.toLowerCase(),
  }));

  const rumors = parseJson<{ templates?: Array<Record<string, unknown>> }>("rpg_rumors_config", { templates: [] }).templates?.map((tpl) => ({
    id: String(tpl.id ?? ""),
    type: "rumorTemplate" as const,
    typeLabel: "Szablon plotki",
    icon: "💬",
    title: String(tpl.name ?? "Szablon plotki"),
    description: "Konfiguracja plotek",
    keywords: String(tpl.name ?? "").toLowerCase(),
  })) ?? [];

  const shops = parseJson<Array<Record<string, unknown>>>("rpg_shop_history", []).map((shop) => ({
    id: String(shop.id ?? ""),
    type: "shopSnapshot" as const,
    typeLabel: "Sklep",
    icon: "🏪",
    title: String(shop.label ?? shop.name ?? "Snapshot"),
    description: String(shop.savedAt ?? ""),
    keywords: `${String(shop.label ?? "")} ${String(shop.name ?? "")}`.toLowerCase(),
  }));

  const heroes = cardSearchItems("hero", "🛡️");

  return [...npcs, ...monsters, ...items, ...quests, ...rumors, ...shops, ...heroes].filter((item) => item.id);
}

export function searchIndex(index: SearchResultItem[], query: string): SearchGroup[] {
  const normalized = query.trim().toLowerCase();
  const matched = !normalized
    ? index
    : index.filter((item) => item.keywords.includes(normalized) || item.title.toLowerCase().includes(normalized));

  const order: DrawerEntityType[] = ["npc", "monster", "item", "quest", "rumorTemplate", "shopSnapshot", "hero"];

  return order
    .map((type) => {
      const items = matched.filter((item) => item.type === type);
      return {
        key: type,
        label: items[0]?.typeLabel ?? type,
        items: items.slice(0, 5),
        total: items.length,
      };
    })
    .filter((group) => group.total > 0);
}
