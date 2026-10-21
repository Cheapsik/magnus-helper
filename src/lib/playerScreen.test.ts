import { describe, expect, it } from "vitest";
import type { Combatant } from "@/context/AppContext";
import type { CombatFight } from "./combatSessions";
import { DEFAULT_PLAYER_SCREEN, revivePlayerScreen, toPlayerInitiative } from "./playerScreen";

function combatant(over: Partial<Combatant>): Combatant {
  return {
    id: over.name ?? "x",
    name: "x",
    initiative: 0,
    resource: { current: 10, max: 10 },
    stats: [{ label: "Obrona", value: 3 }],
    statuses: ["ukryty"],
    notes: "sekret MG",
    isEnemy: false,
    ...over,
  };
}

const fight: CombatFight = {
  id: "f",
  name: "Zasadzka",
  combatRound: 3,
  combatTurn: 1,
  conditions: [],
  status: "active",
  combatants: [
    combatant({ name: "Ork", initiative: 5, isEnemy: true, resource: { current: 0, max: 8 } }),
    combatant({ name: "Ala", initiative: 12, resourceLabel: "Zdrowie" }),
  ],
};

describe("toPlayerInitiative", () => {
  it("sorts by initiative and marks whose turn it is", () => {
    const view = toPlayerInitiative(fight, true);
    expect(view.round).toBe(3);
    expect(view.rows.map((r) => r.name)).toEqual(["Ala", "Ork"]);
    expect(view.rows.map((r) => r.active)).toEqual([false, true]);
    expect(view.rows[1].out).toBe(true);
  });

  it("never carries notes, stats or statuses", () => {
    const json = JSON.stringify(toPlayerInitiative(fight, false));
    expect(json).not.toContain("sekret MG");
    expect(json).not.toContain("Obrona");
    expect(json).not.toContain("ukryty");
  });

  it("hides enemy resources only when asked", () => {
    expect(toPlayerInitiative(fight, true).rows[1].resource).toBeUndefined();
    expect(toPlayerInitiative(fight, true).rows[0].resource).toEqual({ current: 10, max: 10, label: "Zdrowie" });
    expect(toPlayerInitiative(fight, false).rows[1].resource).toEqual({ current: 0, max: 8, label: undefined });
  });
});

describe("revivePlayerScreen", () => {
  it("falls back to the default for garbage", () => {
    expect(revivePlayerScreen(null)).toBe(DEFAULT_PLAYER_SCREEN);
    expect(revivePlayerScreen({ handout: { title: "" } }).handout).toBeNull();
  });

  it("keeps a handout with only an image", () => {
    expect(revivePlayerScreen({ blank: false, handout: { image: "data:x" } })).toMatchObject({
      blank: false,
      handout: { title: "", text: "", image: "data:x" },
    });
  });
});
