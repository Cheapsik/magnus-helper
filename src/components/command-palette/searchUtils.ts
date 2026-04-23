import type { DrawerEntityType } from "@/context/DrawerContext";

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
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function buildSearchIndex(): SearchResultItem[] {
  const npcs = parseJson<Array<Record<string, unknown>>>("rpg_saved_npcs", []).map((npc) => ({
    id: String(npc.id ?? ""),
    type: "npc" as const,
    typeLabel: "NPC",
    icon: "👤",
    title: String((npc.daneOgolne as Record<string, unknown> | undefined)?.imie ?? "NPC"),
    description: String((npc.daneOgolne as Record<string, unknown> | undefined)?.obecnaProfesja ?? ""),
    keywords: `${String((npc.daneOgolne as Record<string, unknown> | undefined)?.imie ?? "")} ${String((npc.daneOgolne as Record<string, unknown> | undefined)?.obecnaProfesja ?? "")} ${String(npc.notatkiMG ?? "")}`.toLowerCase(),
  }));

  const monsters = parseJson<Array<Record<string, unknown>>>("rpg_gm_enemies", []).map((monster) => ({
    id: String(monster.id ?? ""),
    type: "monster" as const,
    typeLabel: "Potwor",
    icon: "💀",
    title: String(monster.name ?? "Potwor"),
    description: String(monster.weapon ?? ""),
    keywords: `${String(monster.name ?? "")} ${String(monster.weapon ?? "")}`.toLowerCase(),
  }));

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

  const heroesRaw = parseJson<Array<Record<string, unknown>>>("rpg_characters", []);
  const heroesFromSingle = heroesRaw.length
    ? []
    : [parseJson<Record<string, unknown>>("rpg_character", {})].filter((hero) => typeof hero.name === "string");
  const heroes = [...heroesRaw, ...heroesFromSingle].map((hero, index) => ({
    id: String(hero.id ?? `single-hero-${index}`),
    type: "hero" as const,
    typeLabel: "Bohater",
    icon: "🛡️",
    title: String(hero.name ?? "Bohater"),
    description: `${String(hero.race ?? "")} ${String(hero.career ?? hero.profession ?? "")}`.trim(),
    keywords: `${String(hero.name ?? "")} ${String(hero.race ?? "")} ${String(hero.career ?? hero.profession ?? "")}`.toLowerCase(),
  }));

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
