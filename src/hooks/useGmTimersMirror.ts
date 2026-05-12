import { useCallback, useEffect, useState } from "react";
import {
  type TimerRuntime,
  loadTimersFromStorage,
  saveTimersToStorage,
  dataToRuntime,
  applyTimerGmTick,
} from "@/lib/rpgTimersStorage";

export function useGmTimersMirror() {
  const [timers, setTimers] = useState<TimerRuntime[]>(() => loadTimersFromStorage().map(dataToRuntime));

  useEffect(() => {
    saveTimersToStorage(timers);
  }, [timers]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.running || !t.startedAt) return t;
          const elapsed = t.accumulatedMs + (now - t.startedAt);
          if (t.mode === "stopwatch") {
            changed = true;
            return { ...t, displayMs: elapsed };
          }
          const totalMs = t.countdownSet * 1000;
          const remaining = totalMs - elapsed;
          if (remaining <= 0) {
            changed = true;
            return {
              ...t,
              displayMs: 0,
              running: false,
              finished: true,
              startedAt: null,
              accumulatedMs: totalMs,
            };
          }
          changed = true;
          return { ...t, displayMs: remaining };
        });
        return changed ? next : prev;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const gmTick = useCallback((id: string) => {
    setTimers((prev) => prev.map((t) => (t.id === id ? applyTimerGmTick(t) : t)));
  }, []);

  const addTimer = useCallback((partial: { label: string; mode: "stopwatch" | "countdown"; countdownSec: number }) => {
    const sec = Math.max(0, partial.countdownSec);
    const t: TimerRuntime = {
      id: crypto.randomUUID(),
      label: partial.label.trim(),
      mode: partial.mode,
      countdownSet: partial.mode === "countdown" ? Math.max(1, sec) : sec,
      running: false,
      displayMs: partial.mode === "countdown" ? Math.max(1, sec) * 1000 : 0,
      startedAt: null,
      accumulatedMs: 0,
      finished: false,
    };
    setTimers((prev) => [...prev, t]);
  }, []);

  return { timers, gmTick, addTimer };
}
