import { describe, expect, it } from "vitest";
import {
  eventDayIndex, eventsOn, formatDate, fromDayIndex, moonPhase, realCalendar, toDayIndex, weekdayName,
  type CalendarDefinition, type CalendarEvent,
} from "./campaignCalendar";

const small: CalendarDefinition = {
  weekdays: ["A", "B", "C"],
  months: [{ name: "Pierwszy", days: 10 }, { name: "Drugi", days: 5 }],
  era: "E.N.",
  startYear: 100,
  moons: [],
};

const event = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e", title: "T", description: "", yearly: false, date: { year: 100, month: 1, day: 3 }, ...over,
});

describe("campaignCalendar", () => {
  it("round-trips across month and year rollover", () => {
    expect(fromDayIndex(small, 0)).toEqual({ year: 100, month: 0, day: 1 });
    expect(fromDayIndex(small, 9)).toEqual({ year: 100, month: 0, day: 10 });
    expect(fromDayIndex(small, 10)).toEqual({ year: 100, month: 1, day: 1 });
    expect(fromDayIndex(small, 15)).toEqual({ year: 101, month: 0, day: 1 });
    for (let i = -40; i < 40; i++) expect(toDayIndex(small, fromDayIndex(small, i)!)).toBe(i);
  });

  it("handles days before the starting year", () => {
    expect(fromDayIndex(small, -1)).toEqual({ year: 99, month: 1, day: 5 });
    expect(toDayIndex(small, { year: 99, month: 0, day: 1 })).toBe(-15);
  });

  it("rejects invalid input", () => {
    expect(toDayIndex(small, { year: 100, month: 2, day: 1 })).toBeNull();
    expect(toDayIndex(small, { year: 100, month: -1, day: 1 })).toBeNull();
    expect(toDayIndex(small, { year: 100, month: 1, day: 6 })).toBeNull();
    expect(toDayIndex(small, { year: 100, month: 0, day: 0 })).toBeNull();
    expect(toDayIndex(small, { year: 100.5, month: 0, day: 1 })).toBeNull();
    expect(fromDayIndex(small, 1.5)).toBeNull();
    expect(fromDayIndex(small, NaN)).toBeNull();
    expect(fromDayIndex({ ...small, months: [] }, 0)).toBeNull();
  });

  it("cycles weekdays, also backwards", () => {
    expect(weekdayName(small, 0)).toBe("A");
    expect(weekdayName(small, 4)).toBe("B");
    expect(weekdayName(small, -1)).toBe("C");
    expect(weekdayName({ ...small, weekdays: [] }, 3)).toBe("");
  });

  it("approximates moon phases", () => {
    const moon = { name: "M", cycle: 28, offset: 0 };
    expect(moonPhase(moon, 0)).toBe("Nów");
    expect(moonPhase(moon, 7)).toBe("Pierwsza kwadra");
    expect(moonPhase(moon, 14)).toBe("Pełnia");
    expect(moonPhase(moon, 21)).toBe("Ostatnia kwadra");
    expect(moonPhase(moon, 27)).toBe("Nów");
    expect(moonPhase({ ...moon, offset: 14 }, 0)).toBe("Pełnia");
    expect(moonPhase(moon, -14)).toBe("Pełnia");
    expect(moonPhase({ ...moon, cycle: 0 }, 0)).toBeNull();
  });

  it("formats with weekday and era", () => {
    expect(formatDate(small, 10)).toBe("B, 1 Drugi 100 E.N.");
    expect(formatDate(realCalendar(2026), 0)).toBe("Poniedziałek, 1 Styczeń 2026");
    expect(realCalendar(2026).months.reduce((s, m) => s + m.days, 0)).toBe(365);
  });

  it("finds the next occurrence of yearly events", () => {
    const yearly = event({ yearly: true, date: { year: 0, month: 0, day: 5 } });
    expect(eventDayIndex(small, yearly, 2)).toBe(4);
    expect(eventDayIndex(small, yearly, 4)).toBe(4);
    expect(eventDayIndex(small, yearly, 5)).toBe(19);
    expect(eventDayIndex(small, event({}), 50)).toBe(12);
    expect(eventDayIndex(small, event({ date: { year: 100, month: 5, day: 1 } }), 0)).toBeNull();
  });

  it("lists events on a day", () => {
    const once = event({ id: "once" });
    const yearly = event({ id: "yearly", yearly: true, date: { year: 1, month: 1, day: 3 } });
    expect(eventsOn(small, [once, yearly], { year: 100, month: 1, day: 3 }).map((e) => e.id)).toEqual(["once", "yearly"]);
    expect(eventsOn(small, [once, yearly], { year: 101, month: 1, day: 3 }).map((e) => e.id)).toEqual(["yearly"]);
  });
});
