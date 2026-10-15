import { describe, expect, it } from "vitest";
import type { TestType } from "./campaignSystem";
import { resolveTest } from "./testEngine";

/** Hands out the given faces in order and fails loudly if the engine rolls more. */
function faces(...values: number[]) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("rolled more dice than expected");
    return values[i++];
  };
}

function testType(patch: Partial<TestType>): TestType {
  return {
    id: "t",
    name: "Próba",
    mode: "rollUnder",
    dice: "1k100",
    difficulties: [],
    sources: { hero: [], npc: [], monster: [] },
    ...patch,
  };
}

describe("resolveTest — rollUnder", () => {
  it("succeeds when the roll is at or under the value plus the difficulty", () => {
    const type = testType({
      mode: "rollUnder",
      difficulties: [{ id: "trudny", name: "Trudny", value: -10 }],
    });
    const outcome = resolveTest(type, { value: 50, difficultyId: "trudny" }, faces(40));
    expect(outcome).toMatchObject({ kind: "rollUnder", roll: 40, target: 40, success: true });
  });

  it("fails over the target and reports how far off the roll was", () => {
    const outcome = resolveTest(testType({ mode: "rollUnder" }), { value: 35 }, faces(62));
    expect(outcome).toMatchObject({ success: false, target: 35, margin: 27 });
  });

  it("reports the margin of a success as the distance under the target", () => {
    const outcome = resolveTest(testType({ mode: "rollUnder" }), { value: 35 }, faces(12));
    expect(outcome).toMatchObject({ success: true, margin: 23 });
  });

  it("adds an extra modifier to the target", () => {
    const outcome = resolveTest(testType({ mode: "rollUnder" }), { value: 35, modifier: 5 }, faces(39));
    expect(outcome).toMatchObject({ success: true, target: 40, modifier: 5 });
  });

  it("counts degrees as whole multiples of the margin divisor", () => {
    const type = testType({ mode: "rollUnder", margin: { divisor: 10, label: "Stopnie" } });
    expect(resolveTest(type, { value: 45 }, faces(17))).toMatchObject({ margin: 28, degrees: 2 });
    expect(resolveTest(type, { value: 45 }, faces(54))).toMatchObject({ success: false, margin: 9, degrees: 0 });
  });

  it("reports no degrees when the test type has no margin", () => {
    const outcome = resolveTest(testType({ mode: "rollUnder" }), { value: 45 }, faces(17));
    expect(outcome).toMatchObject({ degrees: null });
  });

  describe("criticals", () => {
    const type = testType({ mode: "rollUnder", critical: { successAtMost: 5, failureAtLeast: 96 } });

    it("marks a low natural roll as a critical success, even over the target", () => {
      expect(resolveTest(type, { value: 3 }, faces(4))).toMatchObject({ critical: "success", success: true });
    });

    it("marks a high natural roll as a critical failure, even under the target", () => {
      expect(resolveTest(type, { value: 99 }, faces(97))).toMatchObject({ critical: "failure", success: false });
    });

    it("leaves ordinary rolls uncritical", () => {
      expect(resolveTest(type, { value: 50 }, faces(50))).toMatchObject({ critical: null, success: true });
    });

    it("ignores thresholds the test type leaves unset", () => {
      const lowOnly = testType({ mode: "rollUnder", critical: { successAtMost: 1 } });
      expect(resolveTest(lowOnly, { value: 50 }, faces(100))).toMatchObject({ critical: null });
    });
  });
});

describe("resolveTest — difficulty", () => {
  const ladder = testType({
    mode: "rollUnder",
    difficulties: [
      { id: "latwy", name: "Łatwy", value: 20 },
      { id: "zwykly", name: "Zwykły", value: 0 },
      { id: "trudny", name: "Trudny", value: -20 },
    ],
    defaultDifficultyId: "trudny",
  });

  it("uses the test type's default difficulty when none is chosen", () => {
    const outcome = resolveTest(ladder, { value: 50 }, faces(10));
    expect(outcome).toMatchObject({ target: 30, difficulty: { id: "trudny", name: "Trudny" } });
  });

  it("falls back to the default when the chosen difficulty no longer exists", () => {
    const outcome = resolveTest(ladder, { value: 50, difficultyId: "usuniety" }, faces(10));
    expect(outcome).toMatchObject({ target: 30 });
  });

  it("uses the first step of the ladder when there is no default", () => {
    const outcome = resolveTest({ ...ladder, defaultDifficultyId: undefined }, { value: 50 }, faces(10));
    expect(outcome).toMatchObject({ target: 70, difficulty: { id: "latwy" } });
  });

  it("rolls with no difficulty at all when the ladder is empty", () => {
    const outcome = resolveTest(testType({ mode: "rollUnder" }), { value: 50 }, faces(10));
    expect(outcome).toMatchObject({ target: 50, difficulty: null });
  });
});

describe("resolveTest — rollOver", () => {
  const type = testType({
    mode: "rollOver",
    dice: "1k20",
    difficulties: [
      { id: "przecietny", name: "Przeciętny", value: 12 },
      { id: "trudny", name: "Trudny", value: 16 },
    ],
  });

  it("adds the value to the roll and succeeds at or over the difficulty's target number", () => {
    const outcome = resolveTest(type, { value: 3, difficultyId: "trudny" }, faces(13));
    expect(outcome).toMatchObject({ kind: "rollOver", natural: 13, total: 16, target: 16, success: true, margin: 0 });
  });

  it("fails under the target number", () => {
    const outcome = resolveTest(type, { value: 2, modifier: 1 }, faces(7));
    expect(outcome).toMatchObject({ total: 10, target: 12, success: false, margin: 2 });
  });

  it("counts degrees over the target number too", () => {
    const withMargin = { ...type, margin: { divisor: 5, label: "Przewaga" } };
    const outcome = resolveTest(withMargin, { value: 5 }, faces(18));
    expect(outcome).toMatchObject({ total: 23, target: 12, margin: 11, degrees: 2, degreesLabel: "Przewaga" });
  });
});

describe("resolveTest — criticals where a high roll is good", () => {
  const type = testType({
    mode: "rollOver",
    dice: "1k20+2",
    difficulties: [{ id: "cel", name: "Cel", value: 15 }],
    critical: { successAtLeast: 20, failureAtMost: 1 },
  });

  it("reads the natural roll without the notation's flat bonus", () => {
    const outcome = resolveTest(type, { value: 0 }, faces(19));
    expect(outcome).toMatchObject({ natural: 19, total: 21, critical: null, success: true });
  });

  it("marks a natural roll at or over the threshold as a critical success", () => {
    const outcome = resolveTest(type, { value: -10 }, faces(20));
    expect(outcome).toMatchObject({ total: 12, critical: "success", success: true });
  });

  it("marks a natural roll at or under the threshold as a critical failure", () => {
    const outcome = resolveTest(type, { value: 20 }, faces(1));
    expect(outcome).toMatchObject({ total: 23, critical: "failure", success: false });
  });
});

describe("resolveTest — pool", () => {
  const pool = (settings: NonNullable<TestType["pool"]>) =>
    testType({
      mode: "pool",
      dice: "1k10",
      difficulties: [
        { id: "zwykly", name: "Zwykły", value: 0 },
        { id: "latwy", name: "Łatwy", value: 1 },
      ],
      pool: settings,
    });

  it("rolls value plus difficulty dice and counts each die at or over the threshold", () => {
    const sides: number[] = [];
    const roll = faces(8, 3, 10, 7);
    const outcome = resolveTest(
      pool({ successAt: 8, required: 2 }),
      { value: 3, difficultyId: "latwy" },
      (s) => {
        sides.push(s);
        return roll();
      },
    );
    expect(sides).toEqual([10, 10, 10, 10]);
    expect(outcome).toMatchObject({ kind: "pool", diceCount: 4, faces: [8, 3, 10, 7], successes: 2, success: true });
  });

  it("fails with fewer successes than required", () => {
    const outcome = resolveTest(pool({ successAt: 8, required: 2 }), { value: 2 }, faces(9, 4));
    expect(outcome).toMatchObject({ successes: 1, required: 2, success: false });
  });

  it("adds the extra modifier to the number of dice", () => {
    const outcome = resolveTest(pool({ successAt: 6, required: 1 }), { value: 1, modifier: 2 }, faces(1, 2, 6));
    expect(outcome).toMatchObject({ diceCount: 3, successes: 1 });
  });

  it("rolls nothing and fails when the pool is empty or negative", () => {
    const outcome = resolveTest(pool({ successAt: 6, required: 1 }), { value: 1, modifier: -3 }, faces());
    expect(outcome).toMatchObject({ diceCount: 0, faces: [], successes: 0, success: false });
  });

  it("rolls another die for each die at or over the explode threshold, chaining", () => {
    const outcome = resolveTest(pool({ successAt: 8, explodeAt: 10, required: 3 }), { value: 2 }, faces(10, 5, 10, 8));
    expect(outcome).toMatchObject({ diceCount: 2, faces: [10, 5, 10, 8], successes: 3, success: true });
  });

  it("lets each 1 cancel one success, never going below zero", () => {
    const type = pool({ successAt: 7, onesCancel: true, required: 1 });
    expect(resolveTest(type, { value: 4 }, faces(9, 1, 8, 3))).toMatchObject({ successes: 1, ones: 1, success: true });
    expect(resolveTest(type, { value: 3 }, faces(1, 1, 7))).toMatchObject({ successes: 0, ones: 2, success: false });
  });

  it("does not cancel successes with ones unless the test type says so", () => {
    const outcome = resolveTest(pool({ successAt: 7, required: 1 }), { value: 2 }, faces(1, 7));
    expect(outcome).toMatchObject({ successes: 1 });
  });
});

describe("resolveTest — bands", () => {
  const type = testType({
    mode: "bands",
    dice: "2k6",
    difficulties: [
      { id: "zwykly", name: "Zwykły", value: 0 },
      { id: "korzystny", name: "Korzystny", value: 1 },
    ],
    bands: [
      { id: "a", label: "Porażka", atMost: 6 },
      { id: "b", label: "Częściowy sukces", atMost: 9 },
      { id: "c", label: "Pełny sukces" },
    ],
  });

  it("reads the band the roll plus value plus difficulty falls into", () => {
    const outcome = resolveTest(type, { value: 1, difficultyId: "korzystny" }, faces(3, 4));
    expect(outcome).toMatchObject({ kind: "bands", natural: 7, total: 9, band: { id: "b", label: "Częściowy sukces" }, bandIndex: 1 });
  });

  it("puts a total at a band's upper bound into that band", () => {
    const outcome = resolveTest(type, { value: 0 }, faces(2, 4));
    expect(outcome).toMatchObject({ total: 6, band: { label: "Porażka" } });
  });

  it("puts anything over every bound into the last, open band", () => {
    const outcome = resolveTest(type, { value: 2, modifier: 1 }, faces(6, 5));
    expect(outcome).toMatchObject({ total: 14, band: { label: "Pełny sukces" }, bandIndex: 2 });
  });

  it("finds no band when the totals run past bands that are all bounded", () => {
    const bounded = { ...type, bands: [{ id: "a", label: "Porażka", atMost: 6 }] };
    expect(resolveTest(bounded, { value: 0 }, faces(5, 5))).toMatchObject({ total: 10, band: null, bandIndex: -1 });
  });
});

describe("resolveTest — invalid test types", () => {
  it("reports unreadable dice notation instead of rolling", () => {
    const outcome = resolveTest(testType({ dice: "rzut" }), { value: 50 }, faces());
    expect(outcome).toMatchObject({ kind: "invalid", summary: "Niepoprawna notacja kości: „rzut”" });
  });

  it("needs a die, not a flat number, for a pool", () => {
    const outcome = resolveTest(testType({ mode: "pool", dice: "6", pool: { successAt: 5, required: 1 } }), { value: 3 }, faces());
    expect(outcome).toMatchObject({ kind: "invalid" });
  });
});

describe("resolveTest — summary", () => {
  it("sums up a roll-under test with its degrees", () => {
    const type = testType({ mode: "rollUnder", margin: { divisor: 10, label: "Stopnie sukcesu" } });
    expect(resolveTest(type, { value: 45 }, faces(17))).toMatchObject({
      summary: "Sukces: rzut 17, cel 45, margines 28, Stopnie sukcesu: 2",
    });
  });

  it("names a critical result", () => {
    const type = testType({ mode: "rollUnder", critical: { failureAtLeast: 96 } });
    expect(resolveTest(type, { value: 99 }, faces(98))).toMatchObject({
      summary: "Krytyczna porażka: rzut 98, cel 99, margines 1",
    });
  });

  it("sums up a roll-over test with the total", () => {
    const type = testType({ mode: "rollOver", dice: "1k20", difficulties: [{ id: "c", name: "Cel", value: 15 }] });
    expect(resolveTest(type, { value: 2 }, faces(9))).toMatchObject({
      summary: "Porażka: wynik 11, cel 15, margines 4",
    });
  });

  it("sums up a pool by its successes", () => {
    const type = testType({ mode: "pool", dice: "1k6", pool: { successAt: 5, required: 2 } });
    expect(resolveTest(type, { value: 3 }, faces(5, 6, 2))).toMatchObject({
      summary: "Sukces: sukcesów 2, wymagane 2",
    });
  });

  it("sums up a bands test by the band it landed in", () => {
    const type = testType({ mode: "bands", dice: "2k6", bands: [{ id: "a", label: "Porażka", atMost: 6 }, { id: "b", label: "Sukces" }] });
    expect(resolveTest(type, { value: 1 }, faces(4, 4))).toMatchObject({ summary: "Sukces: wynik 9" });
    const bounded = { ...type, bands: [{ id: "a", label: "Porażka", atMost: 6 }] };
    expect(resolveTest(bounded, { value: 1 }, faces(4, 4))).toMatchObject({ summary: "Poza przedziałami: wynik 9" });
  });
});
