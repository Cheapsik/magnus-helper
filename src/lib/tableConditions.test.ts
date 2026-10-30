import { describe, expect, it } from "vitest";
import { conditionsHold, evaluateCondition, seasonOf, type TableCondition, type TableContext } from "./tableConditions";
import { DEFAULT_CALENDAR_STATE, toDayIndex } from "./campaignCalendar";
import type { Clock } from "./clocks";
import type { Faction } from "./factions";

const clock = (filled: number): Clock => ({ id: "c", name: "Pościg", segments: 4, filled, note: "", questId: null, visibleToPlayers: false });
const faction = (delta: number): Faction => ({
  id: "f", name: "Gildia", description: "", color: "", memberIds: [], relations: {},
  log: [{ id: "1", delta, reason: "", timestamp: 0 }],
});
const ctx = (over: Partial<TableContext> = {}): TableContext => ({ clocks: [clock(4)], factions: [faction(3)], ...over });

describe("evaluateCondition", () => {
  it("checks clocks", () => {
    expect(evaluateCondition({ type: "clock", clockId: "c", op: "full" }, ctx())).toBe(true);
    expect(evaluateCondition({ type: "clock", clockId: "c", op: "full" }, ctx({ clocks: [clock(3)] }))).toBe(false);
    expect(evaluateCondition({ type: "clock", clockId: "c", op: "not_full" }, ctx({ clocks: [clock(3)] }))).toBe(true);
    expect(evaluateCondition({ type: "clock", clockId: "c", op: "min", value: 2 }, ctx({ clocks: [clock(2)] }))).toBe(true);
    expect(evaluateCondition({ type: "clock", clockId: "gone", op: "not_full" }, ctx())).toBe(false);
  });
  it("checks faction reputation", () => {
    expect(evaluateCondition({ type: "faction", factionId: "f", op: ">=", value: 3 }, ctx())).toBe(true);
    expect(evaluateCondition({ type: "faction", factionId: "f", op: ">=", value: 4 }, ctx())).toBe(false);
    expect(evaluateCondition({ type: "faction", factionId: "f", op: "<=", value: 2 }, ctx())).toBe(false);
    expect(evaluateCondition({ type: "faction", factionId: "f", op: "=", value: 3 }, ctx())).toBe(true);
  });
  it("checks time, treating empty lists as any and unknown time as no match", () => {
    expect(evaluateCondition({ type: "time", timesOfDay: ["noc"] }, ctx({ timeOfDay: "noc" }))).toBe(true);
    expect(evaluateCondition({ type: "time", timesOfDay: ["noc"] }, ctx({ timeOfDay: "dzień" }))).toBe(false);
    expect(evaluateCondition({ type: "time", timesOfDay: ["noc"] }, ctx())).toBe(false);
    expect(evaluateCondition({ type: "time", timesOfDay: [], seasons: ["zima"] }, ctx({ season: "zima" }))).toBe(true);
    expect(evaluateCondition({ type: "time", timesOfDay: ["noc"], seasons: ["zima"] }, ctx({ timeOfDay: "noc", season: "lato" }))).toBe(false);
  });
  it("matches location case-insensitively", () => {
    expect(evaluateCondition({ type: "location", value: "Las" }, ctx({ location: " las " }))).toBe(true);
    expect(evaluateCondition({ type: "location", value: "Las" }, ctx())).toBe(false);
  });
  it("requires every condition in a list", () => {
    const list: TableCondition[] = [{ type: "clock", clockId: "c", op: "full" }, { type: "faction", factionId: "f", op: ">=", value: 9 }];
    expect(conditionsHold(list, ctx())).toBe(false);
    expect(conditionsHold(undefined, ctx())).toBe(true);
  });
});

describe("seasonOf", () => {
  it("maps real-calendar months to seasons", () => {
    const def = DEFAULT_CALENDAR_STATE.definition;
    const at = (month: number) => seasonOf({ ...DEFAULT_CALENDAR_STATE, today: toDayIndex(def, { year: def.startYear, month, day: 15 })! });
    expect([0, 3, 6, 9].map(at)).toEqual(["zima", "wiosna", "lato", "jesień"]);
  });
});
