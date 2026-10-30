import { isDone, type Clock } from "@/lib/clocks";
import { fromDayIndex, type CalendarState } from "@/lib/campaignCalendar";
import { reputationValue, type Faction } from "@/lib/factions";

export const TIMES_OF_DAY = ["świt", "dzień", "zmierzch", "noc"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];
export const SEASONS = ["wiosna", "lato", "jesień", "zima"] as const;
export type Season = (typeof SEASONS)[number];

export const TIME_OF_DAY_KEY = "rpg_time_of_day";
export const LOCATION_KEY = "rpg_current_location";

export type ClockCondition = { type: "clock"; clockId: string; op: "full" | "not_full" | "min"; value?: number };
export type FactionCondition = { type: "faction"; factionId: string; op: ">=" | "<=" | "="; value: number };
/** Empty / missing lists mean "any". Within a list any match is enough. */
export type TimeCondition = { type: "time"; timesOfDay?: TimeOfDay[]; seasons?: Season[] };
export type LocationCondition = { type: "location"; value: string };
export type TableCondition = ClockCondition | FactionCondition | TimeCondition | LocationCondition;

/** World state passed down through [[references]] so sub-tables filter on the same facts. */
export type TableContext = {
  clocks: Clock[];
  factions: Faction[];
  timeOfDay?: TimeOfDay;
  season?: Season;
  location?: string;
};

export const EMPTY_CONTEXT: TableContext = { clocks: [], factions: [] };

/** A missing clock or faction (deleted) never matches. */
export function evaluateCondition(c: TableCondition, ctx: TableContext): boolean {
  switch (c.type) {
    case "clock": {
      const clock = ctx.clocks.find((k) => k.id === c.clockId);
      if (!clock) return false;
      if (c.op === "full") return isDone(clock);
      if (c.op === "not_full") return !isDone(clock);
      return clock.filled >= (c.value ?? 0);
    }
    case "faction": {
      const faction = ctx.factions.find((f) => f.id === c.factionId);
      if (!faction) return false;
      const rep = reputationValue(faction.log);
      return c.op === ">=" ? rep >= c.value : c.op === "<=" ? rep <= c.value : rep === c.value;
    }
    case "time":
      return (
        (!c.timesOfDay?.length || (!!ctx.timeOfDay && c.timesOfDay.includes(ctx.timeOfDay))) &&
        (!c.seasons?.length || (!!ctx.season && c.seasons.includes(ctx.season)))
      );
    case "location":
      return !!ctx.location && ctx.location.trim().toLowerCase() === c.value.trim().toLowerCase();
  }
}

/** All conditions in the list must hold; no list means always. */
export const conditionsHold = (list: TableCondition[] | undefined, ctx: TableContext) =>
  !list || list.every((c) => evaluateCondition(c, ctx));

/**
 * shortcut: northern-hemisphere quarters of the year (winter around the turn of the year);
 * custom calendars get an even split. Upgrade if a setting needs its own seasons.
 */
export function seasonOf({ definition, today }: CalendarState): Season | undefined {
  const date = fromDayIndex(definition, today);
  if (!date) return undefined;
  const total = definition.months.reduce((s, m) => s + m.days, 0);
  const dayOfYear = definition.months.slice(0, date.month).reduce((s, m) => s + m.days, 0) + date.day - 1;
  const quarter = Math.floor(((dayOfYear / total + 1 / 12) % 1) * 4); // 0 = winter
  return (["zima", "wiosna", "lato", "jesień"] as const)[quarter];
}

export function describeCondition(c: TableCondition, ctx: TableContext): string {
  switch (c.type) {
    case "clock": {
      const name = ctx.clocks.find((k) => k.id === c.clockId)?.name || "(usunięte koło)";
      return c.op === "full" ? `koło postępu „${name}” pełne` : c.op === "not_full" ? `koło postępu „${name}” niepełne` : `koło postępu „${name}” ≥ ${c.value ?? 0}`;
    }
    case "faction":
      return `reputacja „${ctx.factions.find((f) => f.id === c.factionId)?.name || "(usunięta frakcja)"}” ${c.op} ${c.value}`;
    case "time":
      return [c.timesOfDay?.join("/"), c.seasons?.join("/")].filter(Boolean).join(", ") || "dowolny czas";
    case "location":
      return `miejsce: ${c.value}`;
  }
}
