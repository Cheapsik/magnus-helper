/**
 * In-world calendar defined by the GM. Magnus knows no setting, so the only
 * preset is the real-world one (12 months, 7 days, no leap years).
 *
 * Dates are counted as an absolute day index: 0 is the first day of the first
 * month of `startYear`; negative indices are earlier years.
 */

export interface CalendarMonth { name: string; days: number }
export interface CalendarMoon { name: string; cycle: number; offset: number }

export interface CalendarDefinition {
  weekdays: string[];
  months: CalendarMonth[];
  era: string;
  startYear: number;
  moons: CalendarMoon[];
}

/** `month` is 0-based, `day` is 1-based. */
export interface CalendarDate { year: number; month: number; day: number }

export interface CalendarEvent {
  id: string;
  title: string;
  date: CalendarDate;
  description: string;
  yearly: boolean;
}

export interface CalendarState {
  definition: CalendarDefinition;
  today: number;
  events: CalendarEvent[];
}

export const CALENDAR_STORAGE_KEY = "rpg_calendar";

export function realCalendar(startYear: number): CalendarDefinition {
  const names = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return {
    weekdays: ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
    months: names.map((name, i) => ({ name, days: days[i] })),
    era: "",
    startYear,
    moons: [],
  };
}

export const DEFAULT_CALENDAR_STATE: CalendarState = {
  definition: realCalendar(new Date().getFullYear()),
  today: 0,
  events: [],
};

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function yearLength(def: CalendarDefinition): number {
  return def.months.reduce((sum, m) => sum + m.days, 0);
}

export function isValidDate(def: CalendarDefinition, date: CalendarDate): boolean {
  const { year, month, day } = date;
  return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
    && month >= 0 && month < def.months.length
    && day >= 1 && day <= def.months[month].days;
}

/** Null for a date that does not exist in this calendar. */
export function toDayIndex(def: CalendarDefinition, date: CalendarDate): number | null {
  if (!isValidDate(def, date)) return null;
  let index = (date.year - def.startYear) * yearLength(def);
  for (let m = 0; m < date.month; m++) index += def.months[m].days;
  return index + date.day - 1;
}

/** Null when the calendar has no days or the index is not an integer. */
export function fromDayIndex(def: CalendarDefinition, index: number): CalendarDate | null {
  const len = yearLength(def);
  if (len <= 0 || !Number.isInteger(index)) return null;
  const year = def.startYear + Math.floor(index / len);
  let rest = mod(index, len);
  let month = 0;
  while (rest >= def.months[month].days) rest -= def.months[month++].days;
  return { year, month, day: rest + 1 };
}

export function weekdayName(def: CalendarDefinition, index: number): string {
  return def.weekdays.length ? def.weekdays[mod(index, def.weekdays.length)] : "";
}

export const MOON_PHASES = ["Nów", "Pierwsza kwadra", "Pełnia", "Ostatnia kwadra"] as const;
export type MoonPhase = (typeof MOON_PHASES)[number];

/** Nearest of the four main phases; `offset` is the moon's age in days at index 0 (0 = new moon). */
export function moonPhase(moon: CalendarMoon, index: number): MoonPhase | null {
  if (!(moon.cycle > 0)) return null;
  const fraction = mod(index + moon.offset, moon.cycle) / moon.cycle;
  return MOON_PHASES[Math.round(fraction * 4) % 4];
}

export function formatDate(def: CalendarDefinition, index: number): string {
  const date = fromDayIndex(def, index);
  if (!date) return "";
  const weekday = weekdayName(def, index);
  const text = `${date.day} ${def.months[date.month].name} ${date.year}${def.era ? ` ${def.era}` : ""}`;
  return weekday ? `${weekday}, ${text}` : text;
}

/**
 * Day index of the event's next occurrence on or after `today`; a yearly event
 * always has one, a one-off event in the past returns its own (earlier) index.
 * Null when the date no longer exists in an edited calendar.
 */
export function eventDayIndex(def: CalendarDefinition, event: CalendarEvent, today: number): number | null {
  if (!event.yearly) return toDayIndex(def, event.date);
  const now = fromDayIndex(def, today);
  if (!now) return null;
  const thisYear = toDayIndex(def, { ...event.date, year: now.year });
  if (thisYear === null) return null;
  return thisYear >= today ? thisYear : thisYear + yearLength(def);
}

export function eventsOn(def: CalendarDefinition, events: CalendarEvent[], date: CalendarDate): CalendarEvent[] {
  return events.filter((e) =>
    isValidDate(def, e.date) && e.date.month === date.month && e.date.day === date.day
    && (e.yearly || e.date.year === date.year));
}
