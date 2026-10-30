/**
 * 2D dungeon maps from the GM's own generator (src/vendor/dungeon, ported from
 * the dungeon-generator project). Only map building, furnishing and drawing
 * are used: no monsters, traps or treasure. The engine and its CC0 art are
 * loaded on demand, they weigh ~1.5 MB.
 */

/** Values are the engine's own option keys; labels live in the page. */
export type DungeonOptions = {
  seed: string;
  floors: number;
  dungeon_size: string;
  map_cols: number;
  map_rows: number;
  dungeon_layout: string;
  peripheral_egress: string;
  room_layout: string;
  room_size: string;
  room_polymorph: string;
  door_set: string;
  corridor_layout: string;
  remove_deadends: string;
  add_stairs: string;
  map_style: string;
  grid: string;
  furnish: string;
  furniture_art: string;
  cell_size: string;
  labels: boolean;
};

export const DEFAULT_DUNGEON_OPTIONS: DungeonOptions = {
  seed: "1",
  floors: 1,
  dungeon_size: "Medium",
  map_cols: 51,
  map_rows: 65,
  dungeon_layout: "Rectangle",
  peripheral_egress: "",
  room_layout: "Scattered",
  room_size: "Medium",
  room_polymorph: "Yes",
  door_set: "Standard",
  corridor_layout: "Errant",
  remove_deadends: "Some",
  add_stairs: "Yes",
  map_style: "Battlemap",
  grid: "Square",
  furnish: "Random",
  furniture_art: "painted",
  cell_size: "",
  labels: true,
};

export const randomSeed = () => String(Math.floor(Math.random() * 2147483646) + 1);

type Stair = { down: boolean; label?: string };
type Map2D = { stairs: Stair[] };
type Furnished = { theme: string | null; artKey?: string };
type Engine = {
  Dungeon: { generate(o: Record<string, unknown>): Map2D };
  DungeonFurnish: { furnish(d: Map2D, o: Record<string, unknown>): Furnished };
  DungeonRender: {
    draw(canvas: HTMLCanvasElement, d: Map2D, s: { corridorFeatures: unknown[] }, opts: Record<string, unknown>): void;
    loadArt(key: string): Promise<unknown>;
    STYLES: Record<string, { battlemap?: boolean }>;
  };
};

let engine: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  // Order matters: each file registers on globalThis what the next one reads.
  engine ??= (async () => {
    await import("@/vendor/dungeon/dungeon.js");
    await import("@/vendor/dungeon/furnish.js");
    await import("@/vendor/dungeon/battlemap.js");
    await import("@/vendor/dungeon/render.js");
    await import("@/vendor/dungeon/assets.js");
    return globalThis as unknown as Engine;
  })();
  return engine;
}

/** Each floor is its own map with a derived seed; stairs are labelled with the floor they lead to. */
export function floorOptions(o: DungeonOptions): Record<string, unknown>[] {
  const floors = Math.max(1, Math.min(5, o.floors || 1));
  return Array.from({ length: floors }, (_, k) => ({
    ...o,
    seed: k ? String((Number(o.seed) + k * 104729) % 2147483647) : o.seed,
    add_stairs: floors > 1 && !o.add_stairs ? "Yes" : o.add_stairs,
  }));
}

export function stairLabel(down: boolean, floor: number, floors: number): string {
  if (down) return floor + 1 < floors ? `▼${floor + 2}` : "▼";
  return floor ? `▲${floor}` : "▲";
}

/** One PNG per floor. The caller owns the blobs. */
export async function renderDungeon(o: DungeonOptions): Promise<Blob[]> {
  const { Dungeon, DungeonFurnish, DungeonRender } = await loadEngine();
  const floors = floorOptions(o);
  const built = floors.map((lo, k) => {
    const d = Dungeon.generate(lo);
    const f = DungeonFurnish.furnish(d, lo);
    if (floors.length > 1) d.stairs.forEach((st) => (st.label = stairLabel(st.down, k, floors.length)));
    return { d, f };
  });
  await DungeonRender.loadArt(built[0].f.artKey || "ink");

  const style = DungeonRender.STYLES[o.map_style];
  return Promise.all(
    built.map(({ d, f }) => {
      // furniture and textures need room to read
      const cell = Number(o.cell_size) || (style?.battlemap ? 48 : f.theme ? 32 : 16);
      const canvas = document.createElement("canvas");
      DungeonRender.draw(canvas, d, { corridorFeatures: [] }, { style: o.map_style, grid: o.grid, furniture: f, cell, labels: o.labels });
      return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Nie udało się zapisać obrazu"))), "image/png"));
    }),
  );
}
