import { describe, expect, it } from "vitest";
import {
  addTile,
  advanceTurn,
  defaultLayout,
  moveTile,
  newTile,
  removeTile,
  resizeTile,
  reviveLayout,
  updateTileConfig,
  type GmTile,
} from "@/lib/gmScreen";

const tile = (id: string, over: Partial<GmTile> = {}): GmTile => ({ id, type: "note", size: "m", config: {}, ...over });

describe("gmScreen layout", () => {
  it("adds, removes, resizes and configures tiles", () => {
    const list = addTile([tile("a")], tile("b"));
    expect(list.map((t) => t.id)).toEqual(["a", "b"]);
    expect(removeTile(list, "a").map((t) => t.id)).toEqual(["b"]);
    expect(resizeTile(list, "b", "l")[1].size).toBe("l");
    expect(updateTileConfig(list, "a", { text: "x" })[0].config).toEqual({ text: "x" });
  });

  it("moves within bounds", () => {
    const list = [tile("a"), tile("b"), tile("c")];
    expect(moveTile(list, "b", -1).map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(moveTile(list, "c", 1)).toBe(list);
    expect(moveTile(list, "a", -1)).toBe(list);
  });

  it("revives stored data", () => {
    expect(reviveLayout("junk")).toHaveLength(defaultLayout().length);
    expect(reviveLayout([])).toEqual([]);
    const [t] = reviveLayout([null, { type: "nope" }, { id: "x", type: "codex", size: "xl", config: { refId: 5, text: "t" } }]);
    expect(t).toEqual({ id: "x", type: "codex", size: "m", config: { text: "t" } });
    expect(newTile("players").size).toBe("l");
  });

  it("advances turns and wraps rounds", () => {
    expect(advanceTurn(0, 1, 3)).toEqual({ turn: 1, round: 1 });
    expect(advanceTurn(2, 1, 3)).toEqual({ turn: 0, round: 2 });
    expect(advanceTurn(0, 1, 0)).toEqual({ turn: 0, round: 1 });
  });
});
