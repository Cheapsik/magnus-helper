import { describe, expect, it } from "vitest";
import { rollDiceNotation } from "./diceNotation";

const always = (face: number) => () => face;

describe("rollDiceNotation", () => {
  it("rolls dice and adds a flat modifier", () => {
    const result = rollDiceNotation("2k6+3", always(4));
    expect(result?.total).toBe(11);
  });

  it("accepts the English 'd', a negative modifier and an implicit single die", () => {
    expect(rollDiceNotation("1d8-1", always(5))?.total).toBe(4);
    expect(rollDiceNotation("k100", always(37))?.total).toBe(37);
  });

  it("sums several dice terms and ignores spaces and case", () => {
    expect(rollDiceNotation("3K6 + 1k4 + 2", always(2))?.total).toBe(10);
  });

  it("reports each die rolled so a result can be shown in full", () => {
    const faces = [6, 1, 3];
    let i = 0;
    const result = rollDiceNotation("2k6+1k4", () => faces[i++]);
    expect(result?.dice).toEqual([
      { sides: 6, results: [6, 1] },
      { sides: 4, results: [3] },
    ]);
    expect(result?.modifier).toBe(0);
  });

  it("returns null for anything that is not dice notation", () => {
    expect(rollDiceNotation("", always(1))).toBeNull();
    expect(rollDiceNotation("miecz", always(1))).toBeNull();
    expect(rollDiceNotation("2k", always(1))).toBeNull();
    expect(rollDiceNotation("0k6", always(1))).toBeNull();
  });

  it("treats a plain number as a fixed result", () => {
    expect(rollDiceNotation("5", always(1))?.total).toBe(5);
  });
});
