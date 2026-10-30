import { useLocalStorage } from "@/hooks/useLocalStorage";

export const TILE_TYPES = ["initiative", "clocks", "table", "dice", "codex", "note", "scene", "date", "players"] as const;
export type TileType = (typeof TILE_TYPES)[number];
export type TileSize = "s" | "m" | "l";

/**
 * One tile of the GM screen. `config` holds what the tile needs to remember:
 * `refId` (random table or codex entry id) or `text` (GM note).
 */
export interface GmTile {
  id: string;
  type: TileType;
  size: TileSize;
  config: { refId?: string; text?: string };
}

export const GM_SCREEN_STORAGE_KEY = "rpg_gm_screen_layout";
const SIZES: TileSize[] = ["s", "m", "l"];

export const newTile = (type: TileType, size: TileSize = type === "players" ? "l" : "m"): GmTile => ({
  id: crypto.randomUUID(),
  type,
  size,
  config: {},
});

export const defaultLayout = (): GmTile[] => [
  newTile("initiative", "l"),
  newTile("dice", "s"),
  newTile("date", "s"),
  newTile("scene", "m"),
  newTile("clocks", "m"),
  newTile("note", "m"),
];

/** Repairs anything read from storage; unknown tile types are dropped. */
export function reviveLayout(parsed: unknown): GmTile[] {
  if (!Array.isArray(parsed)) return defaultLayout();
  return parsed.flatMap((raw): GmTile[] => {
    if (!raw || typeof raw !== "object") return [];
    const t = raw as Partial<GmTile>;
    if (!TILE_TYPES.includes(t.type as TileType)) return [];
    const c = (t.config && typeof t.config === "object" ? t.config : {}) as GmTile["config"];
    return [
      {
        id: typeof t.id === "string" && t.id ? t.id : crypto.randomUUID(),
        type: t.type as TileType,
        size: SIZES.includes(t.size as TileSize) ? (t.size as TileSize) : "m",
        config: {
          ...(typeof c.refId === "string" ? { refId: c.refId } : {}),
          ...(typeof c.text === "string" ? { text: c.text } : {}),
        },
      },
    ];
  });
}

export const addTile = (list: GmTile[], tile: GmTile) => [...list, tile];
export const removeTile = (list: GmTile[], id: string) => list.filter((t) => t.id !== id);
export const resizeTile = (list: GmTile[], id: string, size: TileSize) => list.map((t) => (t.id === id ? { ...t, size } : t));
export const updateTileConfig = (list: GmTile[], id: string, patch: GmTile["config"]) =>
  list.map((t) => (t.id === id ? { ...t, config: { ...t.config, ...patch } } : t));

/** Moves a tile one place earlier (-1) or later (+1); no-op at the ends. */
export function moveTile(list: GmTile[], id: string, dir: -1 | 1): GmTile[] {
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Turn advance as in the combat tracker: last participant wraps to the next round. */
export function advanceTurn(turn: number, round: number, count: number): { turn: number; round: number } {
  if (count === 0) return { turn, round };
  return turn >= count - 1 ? { turn: 0, round: round + 1 } : { turn: turn + 1, round };
}

export function useGmScreenLayout() {
  return useLocalStorage<GmTile[]>(GM_SCREEN_STORAGE_KEY, defaultLayout(), { revive: reviveLayout });
}
