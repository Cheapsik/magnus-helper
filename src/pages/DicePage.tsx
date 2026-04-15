import { useState, useEffect, useRef, useCallback } from "react";
import { Dice5, Plus, Minus, Trash2, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { rollDice, formatDice, DICE_TYPES, DEFAULT_PRESETS } from "@/lib/dice";
import type { DiceRoll } from "@/lib/dice";
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
        // slow down towards the end
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

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { isRolling, displayValue, settled, startRoll };
}

export default function DicePage() {
  const { rollHistory, addRoll, clearRollHistory } = useApp();
  const [sides, setSides] = useState(100);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [lastResult, setLastResult] = useState<DiceRoll | null>(null);
  const { isRolling, displayValue, settled, startRoll } = useRollingAnimation(800);

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
    setLastResult(roll);
    addRoll(roll);
    startRoll(s * c + Math.abs(m), total);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold">Rzut kośćmi</h1>

      {/* Typ kości */}
      <section>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Typ kości
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DICE_TYPES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={sides === d ? "default" : "secondary"}
              onClick={() => setSides(d)}
              className="text-xs px-3"
            >
              d{d}
            </Button>
          ))}
        </div>
      </section>

      {/* Ilość i modyfikator */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <label className="text-xs text-muted-foreground block mb-1.5">Ilość</label>
            <div className="flex items-center justify-between">
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setCount(Math.max(1, count - 1))}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-lg font-bold min-w-[2ch] text-center">{count}</span>
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setCount(Math.min(20, count + 1))}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <label className="text-xs text-muted-foreground block mb-1.5">Modyfikator</label>
            <div className="flex items-center justify-between">
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setModifier(modifier - 1)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-lg font-bold min-w-[3ch] text-center">
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setModifier(modifier + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Przycisk rzutu */}
      <Button
        onClick={() => handleRoll()}
        disabled={isRolling}
        className="w-full h-12 text-base font-semibold gap-2"
      >
        <Dice5 className={`h-5 w-5 ${isRolling ? "animate-spin" : ""}`} />
        {isRolling ? "Rzucam…" : `Rzuć ${formatDice(count, sides, modifier)}`}
      </Button>

      {/* Wynik */}
      {(lastResult || displayValue !== null) && (
        <Card className="border-primary/30 overflow-hidden">
          <CardContent className="p-4 text-center">
            <div
              key={lastResult?.id}
              className={`text-4xl font-bold text-primary transition-transform duration-200 ${
                isRolling
                  ? "animate-dice-shake scale-110"
                  : settled
                  ? "animate-dice-settle"
                  : ""
              }`}
            >
              {isRolling ? displayValue : lastResult?.total}
            </div>
            {!isRolling && lastResult && (
              <>
                <div className="text-sm text-muted-foreground mt-1">
                  {lastResult.label}
                </div>
                {lastResult.results.length > 1 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Pojedyncze: [{lastResult.results.join(", ")}]
                    {lastResult.modifier !== 0 && (
                      <span>
                        {" "}{lastResult.modifier > 0 ? "+" : ""}{lastResult.modifier}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Presety */}
      <section>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          <Star className="h-3 w-3 inline mr-1" />
          Gotowe zestawy
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={isRolling}
              onClick={() => handleRoll(p.count, p.sides, p.modifier, p.label)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Historia */}
      {rollHistory.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historia rzutów
            </label>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearRollHistory}>
              <Trash2 className="h-3 w-3" />
              Wyczyść
            </Button>
          </div>
          <div className="space-y-1">
            {rollHistory.slice(0, 15).map((roll) => (
              <div key={roll.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-card border">
                <span className="text-muted-foreground">{roll.label}</span>
                <div className="flex items-center gap-2">
                  {roll.results.length > 1 && (
                    <span className="text-xs text-muted-foreground">[{roll.results.join(",")}]</span>
                  )}
                  <span className="font-bold text-foreground min-w-[2ch] text-right">{roll.total}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}