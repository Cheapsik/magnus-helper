import { describe, expect, it } from "vitest";
import { DEFAULT_DUNGEON_OPTIONS } from "@/lib/dungeonGenerator";
import { fromSaved } from "./DungeonGeneratorPage";

describe("fromSaved", () => {
  it("keeps offered choices and drops options the page no longer shows", () => {
    const o = fromSaved({ seed: "7", floors: 2, map_style: "Parchment", remove_deadends: "All", dungeon_size: "Custom", cell_size: "70" });
    expect(o).toMatchObject({ seed: "7", floors: 2, map_style: "Parchment" });
    expect(o.remove_deadends).toBe(DEFAULT_DUNGEON_OPTIONS.remove_deadends);
    expect(o.dungeon_size).toBe(DEFAULT_DUNGEON_OPTIONS.dungeon_size);
    expect(o.cell_size).toBe("");
  });
});
