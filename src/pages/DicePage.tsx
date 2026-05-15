import { useState, useEffect, useRef, useCallback } from "react";
import { Dice5, Plus, Minus, Trash2, Zap, Box } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { rollDice, formatDice, DEFAULT_PRESETS } from "@/lib/dice";
import type { DiceRoll } from "@/lib/dice";
import { buildDiceBoxRollNotation } from "@/lib/diceBoxNotation";
import {
  dice3DVisualConfigKey,
  loadDice3DVisualSettings,
  saveDice3DVisualSettings,
  type Dice3DVisualConfig,
} from "@/lib/dice3dVisualSettings";
import DiceBox3D, { type DiceBox3DHandle } from "@/components/dice/DiceBox3D";
import { Dice3DSettingsPopover } from "@/components/dice/Dice3DSettingsPopover";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function useRollingAnimation(duration = 800) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number>(0);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const startRoll = useCallback(
    (sides: number, finalValue: number) => {
      if (prefersReduced.current) {
        setDisplayValue(finalValue);
        setSettled(true);
        return;
      }

      setIsRolling(true);
      setSettled(false);
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed >= duration) {
          setDisplayValue(finalValue);
          setIsRolling(false);
          setSettled(true);
          return;
        }
        const progress = elapsed / duration;
        const interval = 40 + progress * 120;
        setDisplayValue(Math.floor(Math.random() * sides) + 1);
        rafRef.current = requestAnimationFrame((next) => {
          if (next - now >= interval) tick(next);
          else {
            const wait = () => {
              rafRef.current = requestAnimationFrame((t) => {
                if (t - now >= interval) tick(t);
                else wait();
              });
            };
            wait();
          }
        });
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [duration]
  );

  const showResultImmediate = useCallback((finalValue: number) => {
    cancelAnimationFrame(rafRef.current);
    setDisplayValue(finalValue);
    setIsRolling(false);
    setSettled(true);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { isRolling, displayValue, settled, startRoll, showResultImmediate };
}

const PRIMARY_DICE_SIDES = [4, 6, 8, 12, 20, 100] as const;
const ALL_DICE_SIDES = [3, 4, 6, 8, 10, 12, 20, 100] as const;

export default function DicePage() {
  const { rollHistory, addRoll, clearRollHistory } = useApp();
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [lastResult, setLastResult] = useState<DiceRoll | null>(null);
  const [show3D, setShow3D] = useState(true);
  const [dice3DVisual, setDice3DVisual] = useState<Dice3DVisualConfig>(() => loadDice3DVisualSettings());
  const [dice3DReady, setDice3DReady] = useState(false);
  const [physicsRolling, setPhysicsRolling] = useState(false);
  const diceBoxRef = useRef<DiceBox3DHandle>(null);
  const pending3DRollRef = useRef<DiceRoll | null>(null);
  const { isRolling, displayValue, settled, startRoll, showResultImmediate } = useRollingAnimation(800);

  const dice3DVisualSignature = dice3DVisualConfigKey(dice3DVisual);

  useEffect(() => {
    saveDice3DVisualSettings(dice3DVisual);
  }, [dice3DVisual]);

  useEffect(() => {
    setDice3DReady(false);
  }, [show3D, dice3DVisualSignature]);

  const rollBlocked = isRolling || physicsRolling || (show3D && !dice3DReady);

  const rollPrimaryLabel =
    physicsRolling || isRolling
      ? "Rzucam…"
      : show3D && !dice3DReady
        ? "Ładowanie 3D…"
        : `Rzuć ${formatDice(count, sides, modifier)}`;

  const finalizeRollFrom3D = useCallback(
    (diceValues: number[]) => {
      const pending = pending3DRollRef.current;
      if (!pending) return;
      pending3DRollRef.current = null;
      setPhysicsRolling(false);
      const total = diceValues.reduce((a, b) => a + b, 0) + pending.modifier;
      const roll: DiceRoll = { ...pending, total, results: diceValues };
      setLastResult(roll);
      addRoll(roll);
      showResultImmediate(total);
    },
    [addRoll, showResultImmediate],
  );

  const handleRoll = (c = count, s = sides, m = modifier, label?: string) => {
    const results = rollDice(c, s);
    const total = results.reduce((a, b) => a + b, 0) + m;
    const roll: DiceRoll = {
      id: crypto.randomUUID(),
      label: label || formatDice(c, s, m),
      count: c,
      sides: s,
      modifier: m,
      results,
      total,
      timestamp: Date.now(),
    };

    if (show3D && dice3DReady && diceBoxRef.current) {
      try {
        const { notation } = buildDiceBoxRollNotation(c, s, results);
        pending3DRollRef.current = roll;
        setPhysicsRolling(true);
        void diceBoxRef.current.rollDice3D(notation, results).catch(() => {
          pending3DRollRef.current = null;
          setPhysicsRolling(false);
          setLastResult(roll);
          addRoll(roll);
          startRoll(s * c + Math.abs(m), total);
          toast.error("Nie udało się zakończyć animacji 3D — pokazuję wynik liczony.");
        });
      } catch {
        pending3DRollRef.current = null;
        setPhysicsRolling(false);
        setLastResult(roll);
        addRoll(roll);
        startRoll(s * c + Math.abs(m), total);
      }
      return;
    }

    setLastResult(roll);
    addRoll(roll);
    startRoll(s * c + Math.abs(m), total);
  };

  const handle3DInitFailed = useCallback((message: string) => {
    toast.error(message, { duration: 6000 });
    setDice3DReady(false);
  }, []);

  const breakdownLine =
    lastResult && !isRolling && lastResult.results.length > 1
      ? `(${lastResult.results.join(", ")})`
      : null;

  return (
    <div className="animate-fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Mobile: najpierw stół 3D (order-1), potem panel (order-2). Desktop: grid jak wcześniej. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-0">
        {/* Prawa kolumna — 3D, wynik, historia (na mobile na górze) */}
        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:order-2 lg:h-full lg:min-h-0">
          {show3D ? (
            <div className="flex min-h-[min(36svh,260px)] flex-[1.2] flex-col lg:min-h-0 lg:flex-1">
              <DiceBox3D
                key={dice3DVisualSignature}
                ref={diceBoxRef}
                isVisible={show3D}
                visualConfig={dice3DVisual}
                onRollComplete={finalizeRollFrom3D}
                onClose={() => {
                  setShow3D(false);
                  setDice3DReady(false);
                  setPhysicsRolling(false);
                  pending3DRollRef.current = null;
                }}
                onInitFailed={handle3DInitFailed}
                onReady={() => setDice3DReady(true)}
              />
            </div>
          ) : (
            <Card className="shrink-0 rounded-none border-0 border-b border-dashed border-border/80 bg-card/30">
              <CardContent className="flex min-h-[min(32svh,220px)] flex-col items-center justify-center gap-3 p-6 text-center md:min-h-[280px] md:p-8">
                <Box className="h-9 w-9 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground max-w-xs">
                  Włącz widok 3D, żeby zobaczyć animację rzutu na stole karczmy.
                </p>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShow3D(true)}>
                  Włącz widok 3D
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Karta wyniku */}
          {(lastResult || displayValue !== null) && (
            <Card className="shrink-0 overflow-hidden rounded-none border-x-0 border-b border-primary/30 border-t-0 bg-card/50">
              <CardContent className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div
                    key={lastResult?.id}
                    className={`text-4xl font-bold text-primary tabular-nums transition-transform duration-200 sm:text-5xl md:text-6xl ${
                      isRolling ? "animate-dice-shake scale-110" : settled ? "animate-dice-settle" : ""
                    }`}
                  >
                    {isRolling ? displayValue : lastResult?.total}
                  </div>
                  {!isRolling && lastResult && (
                    <div className="w-full min-w-0 space-y-0.5 text-center sm:flex-1 sm:text-right">
                      <p className="text-sm font-medium text-foreground/80 truncate">{lastResult.label}</p>
                      {breakdownLine && (
                        <p className="text-xs text-muted-foreground tabular-nums">{breakdownLine}</p>
                      )}
                      {lastResult.modifier !== 0 && (
                        <p className="text-xs text-muted-foreground">
                          mod {lastResult.modifier > 0 ? "+" : ""}{lastResult.modifier}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historia — na mobile mniejszy udział wysokości (basis-0 + max-h), na lg pełna elastyczność */}
          <div className="flex min-h-[5rem] max-h-[38dvh] flex-[0.85] flex-col overflow-hidden bg-card/30 basis-0 border-t border-border/40 lg:max-h-none lg:min-h-0 lg:flex-1 lg:border-t-0">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                Historia rzutów
              </span>
              {rollHistory.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1 px-2" onClick={clearRollHistory}>
                  <Trash2 className="h-3 w-3" />
                  Wyczyść
                </Button>
              )}
            </div>
            {rollHistory.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Jeszcze brak rzutów w tej sesji.</p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
                {rollHistory.slice(0, 30).map((roll) => (
                  <li
                    key={roll.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/35 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground truncate text-xs">{roll.label}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {roll.results.length > 1 && (
                        <span className="text-xs text-muted-foreground/70 tabular-nums">({roll.results.join(", ")})</span>
                      )}
                      <span className="font-bold text-primary tabular-nums min-w-[2ch] text-right">{roll.total}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel konfiguracji — na mobile pod stołem, przewijany; na desktopie lewa kolumna */}
        <aside className="order-2 flex max-h-[min(48dvh,24rem)] w-full shrink-0 flex-col overflow-y-auto border-t border-border/60 bg-card/35 p-4 pb-5 safe-area-pb lg:order-1 lg:max-h-none lg:h-full lg:min-h-0 lg:max-w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:pb-4">
          <div className="border-b border-border/50 pb-3 mb-3 lg:mb-4">
            <h1 className="font-app-brand mt-0.5 text-base font-bold tracking-tight sm:text-lg">Rzut kośćmi</h1>
          </div>

          <div className="mb-3 lg:mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Typ kości
            </label>
            <div className="grid grid-cols-4 gap-2 sm:gap-1.5">
              {ALL_DICE_SIDES.map((d) => {
                const selected = sides === d;
                const isPrimary = (PRIMARY_DICE_SIDES as readonly number[]).includes(d);
                return (
                  <Button
                    key={d}
                    type="button"
                    variant="secondary"
                    onClick={() => setSides(d)}
                    className={`flex min-h-[2.75rem] items-center justify-center rounded-lg border-2 p-1.5 text-xs font-bold tabular-nums leading-none transition-colors active:scale-[0.98] sm:aspect-square sm:min-h-0 sm:text-[11px] ${
                      selected
                        ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/30"
                        : isPrimary
                          ? "border-border/60 bg-background/50 text-foreground hover:border-primary/40 hover:bg-background/80"
                          : "border-border/40 bg-background/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    k{d}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:mb-4">
            <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
              <label className="text-[10px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Ilość</label>
              <div className="flex items-center justify-between gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 touch-manipulation sm:h-8 sm:w-8"
                  onClick={() => setCount(Math.max(1, count - 1))}
                >
                  <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </Button>
                <span className="text-lg font-bold tabular-nums w-8 text-center">{count}</span>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 touch-manipulation sm:h-8 sm:w-8"
                  onClick={() => setCount(Math.min(20, count + 1))}
                >
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
              <label className="text-[10px] text-muted-foreground mb-1.5 block font-medium uppercase tracking-wide">Modyfikator</label>
              <div className="flex items-center justify-between gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 touch-manipulation sm:h-8 sm:w-8"
                  onClick={() => setModifier(modifier - 1)}
                >
                  <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </Button>
                <span className="text-lg font-bold tabular-nums w-8 text-center">
                  {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 touch-manipulation sm:h-8 sm:w-8"
                  onClick={() => setModifier(modifier + 1)}
                >
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => handleRoll()}
            disabled={rollBlocked}
            className="mb-3 h-12 w-full touch-manipulation gap-2 rounded-xl text-sm font-semibold shadow-md sm:mb-4"
          >
            <Dice5 className={`h-5 w-5 shrink-0 ${physicsRolling || isRolling ? "animate-spin" : ""}`} />
            <span className="truncate">{rollPrimaryLabel}</span>
          </Button>

          <div className="mb-3 lg:mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Szybkie presety
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
              {DEFAULT_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 touch-manipulation rounded-lg px-2 text-xs font-medium gap-1 sm:h-8 sm:px-2.5"
                  disabled={rollBlocked}
                  onClick={() => handleRoll(p.count, p.sides, p.modifier, p.label)}
                >
                  <Zap className="h-3 w-3 shrink-0 opacity-60" />
                  <span className="truncate">{p.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
            <span className="text-xs text-muted-foreground">Ustawienia 3D</span>
            <Dice3DSettingsPopover
              value={dice3DVisual}
              onChange={setDice3DVisual}
              disabled={isRolling || physicsRolling}
              triggerClassName="h-9 w-9 shrink-0 touch-manipulation md:h-10 md:w-10"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
