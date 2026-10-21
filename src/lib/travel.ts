import { useLocalStorage } from "@/hooks/useLocalStorage";

/**
 * Journeys planned and run by the GM. Magnus knows no travel rules: stage
 * lengths, supplies and their daily use are whatever the GM types in.
 */

export type JourneyStatus = "planned" | "travelling" | "done";

export const STATUS_LABELS: Record<JourneyStatus, string> = {
  planned: "planowana",
  travelling: "w drodze",
  done: "zakończona",
};

export interface Stage { id: string; from: string; to: string; days: number; note: string }

/** A GM-defined counter used up while travelling, e.g. "Racje: 12, −4/dzień". */
export interface Supply { id: string; name: string; amount: number; perDay: number }

export interface TravelDay {
  id: string;
  /** 1-based day of the whole journey. */
  day: number;
  stage: string;
  /** Formatted in-world date, as it was on that day. */
  date: string;
  weather: string;
  event: string;
  note: string;
}

export interface Journey {
  id: string;
  name: string;
  stages: Stage[];
  stageIndex: number;
  /** Days already travelled in the current stage. */
  dayInStage: number;
  status: JourneyStatus;
  supplies: Supply[];
  eventTableId: string | null;
  weatherTableId: string | null;
  /** Month index (0-based) → weather table id; overrides `weatherTableId`. */
  weatherByMonth: Record<string, string>;
  log: TravelDay[];
}

export const JOURNEYS_STORAGE_KEY = "rpg_journeys";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, min = 0) => Math.max(min, Math.round(Number(v) || 0));
const id = (v: unknown) => (typeof v === "string" && v ? v : crypto.randomUUID());
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map((x) => x ?? {}) : []);

export const newStage = (): Stage => ({ id: crypto.randomUUID(), from: "", to: "", days: 1, note: "" });
export const newSupply = (): Supply => ({ id: crypto.randomUUID(), name: "", amount: 0, perDay: 1 });

/** Repairs anything read from storage so the UI never sees an impossible journey. */
export function normalizeJourney(raw: Partial<Record<keyof Journey, unknown>>): Journey {
  const stages = arr(raw.stages).map((s) => ({ id: id(s.id), from: str(s.from), to: str(s.to), days: num(s.days, 1), note: str(s.note) }));
  const stageIndex = Math.min(num(raw.stageIndex), Math.max(0, stages.length - 1));
  const status: JourneyStatus = raw.status === "travelling" || raw.status === "done" ? raw.status : "planned";
  return {
    id: id(raw.id),
    name: str(raw.name),
    stages,
    stageIndex,
    dayInStage: Math.min(num(raw.dayInStage), stages[stageIndex]?.days ?? 0),
    status,
    supplies: arr(raw.supplies).map((s) => ({ id: id(s.id), name: str(s.name), amount: num(s.amount), perDay: num(s.perDay) })),
    eventTableId: str(raw.eventTableId) || null,
    weatherTableId: str(raw.weatherTableId) || null,
    weatherByMonth: raw.weatherByMonth && typeof raw.weatherByMonth === "object"
      ? Object.fromEntries(Object.entries(raw.weatherByMonth).filter(([, v]) => typeof v === "string" && v))
      : {},
    log: arr(raw.log).map((d) => ({
      id: id(d.id), day: num(d.day, 1), stage: str(d.stage), date: str(d.date), weather: str(d.weather), event: str(d.event), note: str(d.note),
    })),
  };
}

export function reviveJourneys(parsed: unknown): Journey[] {
  return arr(parsed).map((j) => normalizeJourney(j));
}

export function useJourneys() {
  return useLocalStorage<Journey[]>(JOURNEYS_STORAGE_KEY, [], { revive: reviveJourneys });
}

export const stageLabel = (s: Stage | undefined) => (s ? `${s.from || "?"} → ${s.to || "?"}` : "");

export const totalDays = (j: Journey) => j.stages.reduce((sum, s) => sum + s.days, 0);

export const daysTravelled = (j: Journey) =>
  j.status === "done" ? totalDays(j) : j.stages.slice(0, j.stageIndex).reduce((sum, s) => sum + s.days, 0) + j.dayInStage;

export const canAdvance = (j: Journey) => j.status !== "done" && j.stages.length > 0;

export function weatherTableFor(j: Journey, month: number | undefined): string | null {
  return (month !== undefined && j.weatherByMonth[month]) || j.weatherTableId;
}

/** Supplies that hit zero after the day's consumption. */
export const depletedSupplies = (j: Journey) => j.supplies.filter((s) => s.amount <= 0 && s.name.trim());

/**
 * One day on the road: consumes supplies, moves through the stages, finishes
 * the journey after the last day of the last stage, and records the day.
 */
export function advanceDay(j: Journey, day: Pick<TravelDay, "date" | "weather" | "event" | "note">, dayId: string): Journey {
  if (!canAdvance(j)) return j;
  const stage = j.stages[j.stageIndex];
  const dayInStage = j.dayInStage + 1;
  const stageDone = dayInStage >= stage.days;
  const last = j.stageIndex >= j.stages.length - 1;
  return {
    ...j,
    status: stageDone && last ? "done" : "travelling",
    stageIndex: stageDone && !last ? j.stageIndex + 1 : j.stageIndex,
    dayInStage: stageDone && !last ? 0 : dayInStage,
    supplies: j.supplies.map((s) => ({ ...s, amount: Math.max(0, s.amount - s.perDay) })),
    log: [...j.log, { ...day, id: dayId, day: daysTravelled(j) + 1, stage: stageLabel(stage) }],
  };
}

/** One line for the campaign chronicle. */
export function chronicleText(j: Journey, d: TravelDay): string {
  const parts = [`Podróż „${j.name || "bez nazwy"}”, dzień ${d.day}${d.date ? ` (${d.date})` : ""}: ${d.stage}`];
  if (d.weather) parts.push(`Pogoda: ${d.weather}`);
  if (d.event) parts.push(`Zdarzenie: ${d.event}`);
  if (d.note) parts.push(d.note);
  const out = depletedSupplies(j).map((s) => s.name);
  if (out.length) parts.push(`Wyczerpane: ${out.join(", ")}`);
  if (j.status === "done") parts.push("Cel osiągnięty");
  return parts.join(". ") + ".";
}
