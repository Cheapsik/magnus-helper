import { useLocalStorage } from "@/hooks/useLocalStorage";

/** A progress clock: a circle split into segments that fills as a threat, plan or project advances. */
export interface Clock {
  id: string;
  name: string;
  segments: number;
  filled: number;
  note: string;
  /** Id of a quest in `rpg_quests`, or null. */
  questId: string | null;
  /** Read by the player screen; hidden clocks stay GM-only. */
  visibleToPlayers: boolean;
}

export const CLOCKS_STORAGE_KEY = "rpg_clocks";
export const MIN_SEGMENTS = 2;
export const MAX_SEGMENTS = 24;
export const SEGMENT_PRESETS = [4, 6, 8, 12];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

/** Repairs anything read from storage so the UI never sees an impossible clock. */
export function normalizeClock(raw: Partial<Clock>): Clock {
  const segments = clamp(Number(raw.segments) || 4, MIN_SEGMENTS, MAX_SEGMENTS);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === "string" ? raw.name : "",
    segments,
    filled: clamp(Number(raw.filled) || 0, 0, segments),
    note: typeof raw.note === "string" ? raw.note : "",
    questId: typeof raw.questId === "string" && raw.questId ? raw.questId : null,
    visibleToPlayers: !!raw.visibleToPlayers,
  };
}

export function reviveClocks(parsed: unknown): Clock[] {
  return Array.isArray(parsed) ? parsed.map((c) => normalizeClock(c ?? {})) : [];
}

export const isDone = (c: Clock) => c.filled >= c.segments;

export const tick = (c: Clock, delta: number): Clock => ({ ...c, filled: clamp(c.filled + delta, 0, c.segments) });

/** Moves the clock one place up (-1) or down (+1); no-op at the ends. */
export function moveClock(list: Clock[], id: string, dir: -1 | 1): Clock[] {
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** SVG path of segment `i` (0 = the one starting at 12 o'clock, going clockwise). */
export function segmentPath(i: number, segments: number, r: number, cx = r, cy = r): string {
  const step = (2 * Math.PI) / segments;
  const a0 = -Math.PI / 2 + i * step;
  const a1 = a0 + step;
  const pt = (a: number) => `${+(cx + r * Math.cos(a)).toFixed(3)} ${+(cy + r * Math.sin(a)).toFixed(3)}`;
  return `M ${cx} ${cy} L ${pt(a0)} A ${r} ${r} 0 0 1 ${pt(a1)} Z`;
}

export function useClocks() {
  return useLocalStorage<Clock[]>(CLOCKS_STORAGE_KEY, [], { revive: reviveClocks });
}
