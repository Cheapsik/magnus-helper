import { describe, expect, it } from "vitest";
import { isDone, moveClock, normalizeClock, reviveClocks, segmentPath, tick } from "@/lib/clocks";

const clock = (over = {}) => normalizeClock({ id: "a", name: "Zaraza", segments: 4, ...over });

describe("clocks", () => {
  it("clamps segments and filled when reviving", () => {
    expect(normalizeClock({ segments: 99, filled: 50 })).toMatchObject({ segments: 24, filled: 24 });
    expect(normalizeClock({ segments: 1, filled: -3 })).toMatchObject({ segments: 2, filled: 0 });
    expect(reviveClocks("junk")).toEqual([]);
    expect(reviveClocks([null])[0]).toMatchObject({ segments: 4, filled: 0, questId: null, visibleToPlayers: false });
  });

  it("ticks within bounds and reports done", () => {
    expect(tick(clock(), -1).filled).toBe(0);
    const full = tick(clock({ filled: 3 }), 1);
    expect(full.filled).toBe(4);
    expect(isDone(full)).toBe(true);
    expect(tick(full, 1).filled).toBe(4);
  });

  it("moves clocks and ignores moves past the ends", () => {
    const list = ["a", "b", "c"].map((id) => clock({ id }));
    expect(moveClock(list, "c", -1).map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(moveClock(list, "a", -1)).toBe(list);
  });

  it("draws the first quarter from 12 to 3 o'clock", () => {
    expect(segmentPath(0, 4, 10)).toBe("M 10 10 L 10 0 A 10 10 0 0 1 20 10 Z");
  });
});
