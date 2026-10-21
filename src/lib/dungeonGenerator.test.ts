import { describe, expect, it } from "vitest";
import { DEFAULT_DUNGEON_OPTIONS, floorOptions, stairLabel } from "./dungeonGenerator";

describe("dungeon floors", () => {
  it("derives a seed per floor and keeps the first", () => {
    const floors = floorOptions({ ...DEFAULT_DUNGEON_OPTIONS, seed: "100", floors: 3 });
    expect(floors.map((f) => f.seed)).toEqual(["100", String(100 + 104729), String(100 + 2 * 104729)]);
  });

  it("forces stairs when there is more than one floor", () => {
    expect(floorOptions({ ...DEFAULT_DUNGEON_OPTIONS, add_stairs: "", floors: 2 })[0].add_stairs).toBe("Yes");
    expect(floorOptions({ ...DEFAULT_DUNGEON_OPTIONS, add_stairs: "", floors: 1 })[0].add_stairs).toBe("");
  });

  it("clamps the floor count to 1–5", () => {
    expect(floorOptions({ ...DEFAULT_DUNGEON_OPTIONS, floors: 9 })).toHaveLength(5);
    expect(floorOptions({ ...DEFAULT_DUNGEON_OPTIONS, floors: 0 })).toHaveLength(1);
  });

  it("labels stairs with the floor they lead to", () => {
    expect(stairLabel(true, 0, 3)).toBe("▼2");
    expect(stairLabel(true, 2, 3)).toBe("▼");
    expect(stairLabel(false, 0, 3)).toBe("▲");
    expect(stairLabel(false, 2, 3)).toBe("▲2");
  });
});
