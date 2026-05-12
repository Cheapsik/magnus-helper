/** Shared timer persistence + helpers for Timers page and GM dashboard widget. */

export interface TimerData {
  id: string;
  label: string;
  mode: "stopwatch" | "countdown";
  countdownSet: number;
  running?: boolean;
  displayMs?: number;
  startedAt?: number | null;
  accumulatedMs?: number;
  finished?: boolean;
}

export interface TimerRuntime extends TimerData {
  running: boolean;
  displayMs: number;
  startedAt: number | null;
  accumulatedMs: number;
  finished: boolean;
}

export const RPG_TIMERS_STORAGE_KEY = "rpg_timers";

export function formatTimerMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function loadTimersFromStorage(): TimerData[] {
  try {
    const raw = localStorage.getItem(RPG_TIMERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimerData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTimersToStorage(timers: TimerRuntime[]): void {
  try {
    localStorage.setItem(
      RPG_TIMERS_STORAGE_KEY,
      JSON.stringify(
        timers.map((t) => ({
          id: t.id,
          label: t.label,
          mode: t.mode,
          countdownSet: t.countdownSet,
          running: t.running,
          displayMs: t.displayMs,
          startedAt: t.startedAt,
          accumulatedMs: t.accumulatedMs,
          finished: t.finished,
        })),
      ),
    );
  } catch {
    /* ignore */
  }
}

/** Restore runtime; folds wall-clock gap when `running` + `startedAt` were persisted. */
export function dataToRuntime(d: TimerData): TimerRuntime {
  const accumulatedMs = typeof d.accumulatedMs === "number" ? d.accumulatedMs : 0;
  const startedAt = d.startedAt ?? null;
  const finished = !!d.finished;
  const running = !!d.running && !finished;

  if (running && startedAt !== null) {
    const now = Date.now();
    const foldedAcc = accumulatedMs + (now - startedAt);
    if (d.mode === "countdown") {
      const totalMs = d.countdownSet * 1000;
      if (foldedAcc >= totalMs) {
        return {
          ...d,
          running: false,
          finished: true,
          displayMs: 0,
          startedAt: null,
          accumulatedMs: totalMs,
        };
      }
      return {
        ...d,
        running: true,
        finished: false,
        startedAt: now,
        accumulatedMs: foldedAcc,
        displayMs: totalMs - foldedAcc,
      };
    }
    return {
      ...d,
      running: true,
      finished: false,
      startedAt: now,
      accumulatedMs: foldedAcc,
      displayMs: foldedAcc,
    };
  }

  const displayMs =
    typeof d.displayMs === "number"
      ? d.displayMs
      : d.mode === "countdown"
        ? d.countdownSet * 1000
        : 0;

  return {
    ...d,
    running: false,
    finished,
    startedAt: null,
    displayMs,
    accumulatedMs,
  };
}

/**
 * GM dashboard “Tick”: advance countdown by ~10 s of in-world time (or add elapsed on stopwatch).
 * Works for running and paused timers.
 */
export function applyTimerGmTick(t: TimerRuntime, deltaMs = 10_000): TimerRuntime {
  if (t.finished) return t;

  if (t.mode === "countdown") {
    const totalMs = t.countdownSet * 1000;
    let acc = t.accumulatedMs;
    if (t.running && t.startedAt) {
      acc += Date.now() - t.startedAt;
    }
    const newAcc = Math.min(totalMs, acc + deltaMs);
    const remaining = totalMs - newAcc;
    const stillRunning = t.running && remaining > 0;
    return {
      ...t,
      accumulatedMs: newAcc,
      startedAt: stillRunning ? Date.now() : null,
      running: stillRunning,
      displayMs: remaining,
      finished: remaining <= 0,
    };
  }

  let acc = t.accumulatedMs;
  if (t.running && t.startedAt) {
    acc += Date.now() - t.startedAt;
  }
  const newAcc = acc + deltaMs;
  return {
    ...t,
    accumulatedMs: newAcc,
    startedAt: t.running ? Date.now() : null,
    displayMs: newAcc,
  };
}
