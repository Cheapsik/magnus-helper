import { describe, expect, it } from "vitest";
import { advanceDay, chronicleText, daysTravelled, normalizeJourney, reviveJourneys, weatherTableFor, type Journey } from "@/lib/travel";

const blank = { date: "", weather: "", event: "", note: "" };

const journey = (over: Partial<Journey> = {}) =>
  normalizeJourney({
    id: "j",
    name: "Na północ",
    stages: [
      { id: "a", from: "Gród", to: "Bród", days: 2, note: "" },
      { id: "b", from: "Bród", to: "Przełęcz", days: 1, note: "" },
    ],
    supplies: [{ id: "r", name: "Racje", amount: 5, perDay: 2 }],
    ...over,
  });

const run = (j: Journey, days: number) => {
  for (let i = 0; i < days; i++) j = advanceDay(j, blank, `d${i}`);
  return j;
};

describe("travel", () => {
  it("advances within a stage, then into the next one", () => {
    const one = run(journey(), 1);
    expect(one).toMatchObject({ status: "travelling", stageIndex: 0, dayInStage: 1 });
    const two = run(journey(), 2);
    expect(two).toMatchObject({ stageIndex: 1, dayInStage: 0 });
    expect(daysTravelled(two)).toBe(2);
    expect(two.log.map((d) => [d.day, d.stage])).toEqual([[1, "Gród → Bród"], [2, "Gród → Bród"]]);
  });

  it("finishes after the last day of the last stage and stops advancing", () => {
    const done = run(journey(), 3);
    expect(done.status).toBe("done");
    expect(done.log.at(-1)).toMatchObject({ day: 3, stage: "Bród → Przełęcz" });
    expect(daysTravelled(done)).toBe(3);
    expect(advanceDay(done, blank, "x")).toBe(done);
    expect(advanceDay(journey({ stages: [] }), blank, "x").log).toEqual([]);
  });

  it("consumes supplies down to zero and reports them in the chronicle", () => {
    const j = run(journey(), 3);
    expect(j.supplies[0].amount).toBe(0);
    expect(chronicleText(j, j.log[2])).toBe("Podróż „Na północ”, dzień 3: Bród → Przełęcz. Wyczerpane: Racje. Cel osiągnięty.");
  });

  it("picks the month's weather table before the default one", () => {
    const j = journey({ weatherTableId: "def", weatherByMonth: { 0: "winter" } });
    expect(weatherTableFor(j, 0)).toBe("winter");
    expect(weatherTableFor(j, 5)).toBe("def");
    expect(weatherTableFor(j, undefined)).toBe("def");
  });

  it("repairs junk from storage", () => {
    expect(reviveJourneys("junk")).toEqual([]);
    expect(reviveJourneys([null])[0]).toMatchObject({ stages: [], status: "planned", stageIndex: 0, eventTableId: null, log: [] });
    expect(normalizeJourney({ stages: [{ days: -3 }], stageIndex: 9, dayInStage: 9 })).toMatchObject({ stageIndex: 0, dayInStage: 1 });
  });
});
