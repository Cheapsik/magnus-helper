import { describe, expect, it } from "vitest";
import { reputationTier, reputationValue, type ReputationChange, type ReputationTier } from "./factions";

const ladder: ReputationTier[] = [
  { id: "ally", name: "Sojusz", min: 3 },
  { id: "hostile", name: "Wrogość", min: -3 },
  { id: "neutral", name: "Obojętność", min: 0 },
];

describe("reputationTier", () => {
  it("picks the highest tier reached, regardless of ladder order", () => {
    expect(reputationTier(1, ladder)?.id).toBe("neutral");
    expect(reputationTier(10, ladder)?.id).toBe("ally");
  });

  it("treats a minimum as inclusive", () => {
    expect(reputationTier(0, ladder)?.id).toBe("neutral");
    expect(reputationTier(-1, ladder)?.id).toBe("hostile");
    expect(reputationTier(3, ladder)?.id).toBe("ally");
    expect(reputationTier(2, ladder)?.id).toBe("neutral");
  });

  it("falls back to the lowest tier below every minimum", () => {
    expect(reputationTier(-9, ladder)?.id).toBe("hostile");
  });

  it("has no tier on an empty ladder", () => {
    expect(reputationTier(0, [])).toBeUndefined();
  });
});

describe("reputationValue", () => {
  const log: ReputationChange[] = [
    { id: "1", delta: 2, reason: "", timestamp: 1 },
    { id: "2", delta: -1, reason: "", timestamp: 2 },
    { id: "3", delta: 5, reason: "", heroId: "h1", timestamp: 3 },
  ];

  it("sums party changes separately from hero changes", () => {
    expect(reputationValue(log)).toBe(1);
    expect(reputationValue(log, "h1")).toBe(5);
    expect(reputationValue(log, "h2")).toBe(0);
  });
});
