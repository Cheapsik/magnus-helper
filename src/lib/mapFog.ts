import { useLocalStorage } from "@/hooks/useLocalStorage";
import { newId } from "@/lib/cardSchema";

export const mapFogKey = (mapId: string) => `rpg_map_fog_${mapId}`;

/** Fog is a GRID x GRID mask over the image (fractions, so it survives resizing). */
export const FOG_GRID = 64;

/** A route between two pins; travelling rolls `tableId` (a random table) for an encounter. */
export type TravelPath = { id: string; name: string; fromPinId: string; toPinId: string; tableId: string | null; lastRoll: string };

export type MapFog = {
  /** GRID*GRID chars, row-major; "1" = revealed to players. Default all hidden. */
  cells: string;
  paths: TravelPath[];
};

export const emptyFog = (): MapFog => ({ cells: "0".repeat(FOG_GRID * FOG_GRID), paths: [] });

export function reviveFog(parsed: unknown): MapFog {
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<MapFog>;
  const cells = typeof p.cells === "string" && p.cells.length === FOG_GRID * FOG_GRID ? p.cells : emptyFog().cells;
  const paths = Array.isArray(p.paths) ? p.paths.filter((t) => t && typeof t.fromPinId === "string" && typeof t.toPinId === "string") : [];
  return { cells, paths: paths.map((t) => ({ ...t, id: t.id || newId(), name: t.name ?? "", tableId: t.tableId ?? null, lastRoll: t.lastRoll ?? "" })) };
}

export function useMapFog(mapId: string) {
  return useLocalStorage<MapFog>(mapFogKey(mapId), emptyFog(), { revive: reviveFog });
}

/** Sets every cell within `radius` cells of the fraction point (fx, fy) to revealed/hidden. */
export function paintCells(cells: string, fx: number, fy: number, radius: number, reveal: boolean): string {
  const cx = fx * FOG_GRID - 0.5;
  const cy = fy * FOG_GRID - 0.5;
  const out = cells.split("");
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(FOG_GRID - 1, Math.ceil(cy + radius)); y++)
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(FOG_GRID - 1, Math.ceil(cx + radius)); x++)
      if (Math.hypot(x - cx, y - cy) <= radius) out[y * FOG_GRID + x] = reveal ? "1" : "0";
  return out.join("");
}

export const fillCells = (reveal: boolean) => (reveal ? "1" : "0").repeat(FOG_GRID * FOG_GRID);

/** Drops paths whose pins no longer exist. */
export const livePaths = (paths: TravelPath[], pinIds: Set<string>) => paths.filter((t) => pinIds.has(t.fromPinId) && pinIds.has(t.toPinId));
