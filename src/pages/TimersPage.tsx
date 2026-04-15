import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Play, Pause, RotateCcw, Trash2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface TimerData {
  id: string;
  label: string;
  mode: "stopwatch" | "countdown";
  /** countdown target in seconds */
  countdownSet: number;
}

interface TimerRuntime extends TimerData {
  running: boolean;
  /** elapsed ms for stopwatch, remaining ms for countdown */
  displayMs: number;
  startedAt: number | null; // Date.now() when started
  accumulatedMs: number; // ms accumulated before last pause
  finished: boolean;
}

/* ── Persistence ── */

const STORAGE_KEY = "rpg_timers";

function loadTimers(): TimerData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTimers(timers: TimerData[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      timers.map(({ id, label, mode, countdownSet }) => ({
        id,
        label,
        mode,
        countdownSet,
      }))
    )
  );
}

/* ── Audio ── */

function playBeep() {
  try {
    const ctx = new AudioContext();
    const beep = (delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    };
    beep(0);
    beep(0.3);
    beep(0.6);
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

/* ── Helpers ── */

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function dataToRuntime(d: TimerData): TimerRuntime {
  return {
    ...d,
    running: false,
    displayMs: d.mode === "countdown" ? d.countdownSet * 1000 : 0,
    startedAt: null,
    accumulatedMs: 0,
    finished: false,
  };
}

/* ── Timer Card ── */

function TimerCard({
  timer,
  onUpdate,
  onRemove,
}: {
  timer: TimerRuntime;
  onUpdate: (t: TimerRuntime) => void;
  onRemove: (id: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(timer.label);
  const [hhDraft, setHhDraft] = useState(Math.floor(timer.countdownSet / 3600));
  const [mmDraft, setMmDraft] = useState(Math.floor((timer.countdownSet % 3600) / 60));
  const [ssDraft, setSsDraft] = useState(timer.countdownSet % 60);
  const alertedRef = useRef(false);

  // Sync drafts when timer externally changes
  useEffect(() => {
    setLabelDraft(timer.label);
  }, [timer.label]);

  useEffect(() => {
    setHhDraft(Math.floor(timer.countdownSet / 3600));
    setMmDraft(Math.floor((timer.countdownSet % 3600) / 60));
    setSsDraft(timer.countdownSet % 60);
  }, [timer.countdownSet]);

  // Reset alerted flag when timer resets
  useEffect(() => {
    if (!timer.finished) alertedRef.current = false;
  }, [timer.finished]);

  // Countdown finished alert
  useEffect(() => {
    if (timer.finished && !alertedRef.current) {
      alertedRef.current = true;
      const name = timer.label || "Timer";
      toast(`⏰ Timer zakończony: ${name}`);
      playBeep();
    }
  }, [timer.finished, timer.label]);

  const commitLabel = () => {
    setEditingLabel(false);
    if (labelDraft !== timer.label) {
      onUpdate({ ...timer, label: labelDraft });
    }
  };

  const commitCountdown = (hh: number, mm: number, ss: number) => {
    const clamped = {
      hh: Math.max(0, hh),
      mm: Math.min(59, Math.max(0, mm)),
      ss: Math.min(59, Math.max(0, ss)),
    };
    setHhDraft(clamped.hh);
    setMmDraft(clamped.mm);
    setSsDraft(clamped.ss);
    const total = clamped.hh * 3600 + clamped.mm * 60 + clamped.ss;
    onUpdate({
      ...timer,
      countdownSet: total,
      displayMs: total * 1000,
      accumulatedMs: 0,
      startedAt: null,
    });
  };

  const toggleMode = (mode: "stopwatch" | "countdown") => {
    if (timer.running) return;
    const newTimer: TimerRuntime = {
      ...timer,
      mode,
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      finished: false,
      displayMs: mode === "countdown" ? timer.countdownSet * 1000 : 0,
    };
    onUpdate(newTimer);
  };

  const start = () => {
    if (timer.mode === "countdown" && timer.countdownSet === 0) return;
    if (timer.finished) return;
    onUpdate({ ...timer, running: true, startedAt: Date.now() });
  };

  const pause = () => {
    const now = Date.now();
    const elapsed = timer.startedAt ? now - timer.startedAt : 0;
    onUpdate({
      ...timer,
      running: false,
      startedAt: null,
      accumulatedMs: timer.accumulatedMs + elapsed,
    });
  };

  const reset = () => {
    onUpdate({
      ...timer,
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      finished: false,
      displayMs: timer.mode === "countdown" ? timer.countdownSet * 1000 : 0,
    });
  };

  const remainingSec = timer.displayMs / 1000;
  const isLow = timer.mode === "countdown" && timer.running && remainingSec <= 10 && remainingSec > 0;
  const showCountdownInputs = timer.mode === "countdown" && !timer.running && !timer.finished;

  return (
    <Card className="relative">
      <CardContent className="p-4 space-y-3">
        {/* Label */}
        {editingLabel ? (
          <Input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => e.key === "Enter" && commitLabel()}
            placeholder="Nazwa timera..."
            className="text-sm font-medium"
          />
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left w-full truncate min-h-[44px] flex items-center"
          >
            {timer.label || <span className="text-muted-foreground italic">Nazwa timera...</span>}
          </button>
        )}

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => toggleMode("stopwatch")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors min-h-[44px]",
              timer.mode === "stopwatch"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
            disabled={timer.running}
          >
            Stoper
          </button>
          <button
            onClick={() => toggleMode("countdown")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors min-h-[44px]",
              timer.mode === "countdown"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
            disabled={timer.running}
          >
            Minutnik
          </button>
        </div>

        {/* Display */}
        <div
          className={cn(
            "text-center font-mono text-4xl font-bold py-4 select-none",
            isLow && "text-destructive animate-pulse",
            timer.finished && "text-destructive"
          )}
        >
          {formatTime(timer.displayMs)}
        </div>

        {/* Countdown set inputs */}
        {showCountdownInputs && (
          <div className="flex items-center justify-center gap-1">
            <Input
              type="number"
              min={0}
              value={hhDraft}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                setHhDraft(v);
                commitCountdown(v, mmDraft, ssDraft);
              }}
              className="w-16 text-center text-sm"
              placeholder="GG"
            />
            <span className="text-muted-foreground font-bold">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={mmDraft}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                setMmDraft(v);
                commitCountdown(hhDraft, v, ssDraft);
              }}
              className="w-16 text-center text-sm"
              placeholder="MM"
            />
            <span className="text-muted-foreground font-bold">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={ssDraft}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                setSsDraft(v);
                commitCountdown(hhDraft, mmDraft, v);
              }}
              className="w-16 text-center text-sm"
              placeholder="SS"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {timer.running ? (
            <Button onClick={pause} variant="secondary" className="flex-1 min-h-[44px]">
              <Pause className="h-4 w-4 mr-1" /> Pauza
            </Button>
          ) : (
            <Button
              onClick={start}
              className="flex-1 min-h-[44px]"
              disabled={timer.finished || (timer.mode === "countdown" && timer.countdownSet === 0)}
            >
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
          )}
          <Button onClick={reset} variant="outline" className="min-h-[44px] min-w-[44px]">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onRemove(timer.id)}
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page ── */

export default function TimersPage() {
  const [timers, setTimers] = useState<TimerRuntime[]>(() =>
    loadTimers().map(dataToRuntime)
  );
  const timersRef = useRef(timers);
  timersRef.current = timers;

  // Persist on config change
  useEffect(() => {
    saveTimers(timers);
  }, [timers]);

  // Tick loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const now = Date.now();
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (!t.running || !t.startedAt) return t;
          const elapsed = t.accumulatedMs + (now - t.startedAt);

          if (t.mode === "stopwatch") {
            const updated = { ...t, displayMs: elapsed };
            changed = true;
            return updated;
          }

          // countdown
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

  const addTimer = () => {
    const t: TimerRuntime = {
      id: crypto.randomUUID(),
      label: "",
      mode: "stopwatch",
      countdownSet: 60,
      running: false,
      displayMs: 0,
      startedAt: null,
      accumulatedMs: 0,
      finished: false,
    };
    setTimers((prev) => [...prev, t]);
  };

  const updateTimer = useCallback((updated: TimerRuntime) => {
    setTimers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const stopAll = () => {
    const now = Date.now();
    setTimers((prev) =>
      prev.map((t) => {
        if (!t.running) return t;
        const elapsed = t.startedAt ? now - t.startedAt : 0;
        return {
          ...t,
          running: false,
          startedAt: null,
          accumulatedMs: t.accumulatedMs + elapsed,
        };
      })
    );
  };

  const anyRunning = timers.some((t) => t.running);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Timery</h1>
        <Button onClick={addTimer} size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" /> Dodaj timer
        </Button>
      </div>

      {timers.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Brak timerów. Dodaj pierwszy przyciskiem powyżej.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {timers.map((t) => (
            <TimerCard key={t.id} timer={t} onUpdate={updateTimer} onRemove={removeTimer} />
          ))}
        </div>
      )}

      {timers.length > 0 && (
        <div className="sticky bottom-20 z-10">
          <Button
            onClick={stopAll}
            variant="destructive"
            className="w-full min-h-[44px]"
            disabled={!anyRunning}
          >
            <Square className="h-4 w-4 mr-1" /> Zatrzymaj wszystko
          </Button>
        </div>
      )}
    </div>
  );
}