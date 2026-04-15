import { Link } from "react-router-dom";
import { Dice5, Target, BookOpen, User, Swords, BarChart3, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { rollPercentile, formatDice } from "@/lib/dice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const QUICK_LINKS = [
  { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
  { path: "/tests", label: "Test", icon: Target },
  { path: "/codex", label: "Kodeks", icon: BookOpen },
  { path: "/character", label: "Postać", icon: User },
  { path: "/combat", label: "Walka", icon: Swords },
  { path: "/simulations", label: "Symulacje", icon: BarChart3 },
];

export default function Index() {
  const { rollHistory, character, addRoll } = useApp();
  const [quickResult, setQuickResult] = useState<number | null>(null);
  const lastRoll = rollHistory[0];

  const handleQuickD100 = () => {
    const result = rollPercentile();
    setQuickResult(result);
    addRoll({
      id: crypto.randomUUID(),
      label: "Szybki d100",
      count: 1,
      sides: 100,
      modifier: 0,
      results: [result],
      total: result,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Szybkie akcje */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Szybkie akcje
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_LINKS.map((link) => (
            <Link key={link.path} to={link.path}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center gap-1.5 p-3">
                  <link.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {link.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Szybki d100 */}
      <section>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Szybki d100</h3>
                <p className="text-xs text-muted-foreground">Rzut procentowy</p>
              </div>
              <div className="flex items-center gap-3">
                {quickResult !== null && (
                  <span
                    key={quickResult + "-" + Date.now()}
                    className="text-2xl font-bold text-primary animate-dice-bounce"
                  >
                    {quickResult}
                  </span>
                )}
                <Button size="sm" onClick={handleQuickD100} className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Rzuć
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Ostatni rzut */}
      {lastRoll && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Ostatni rzut
          </h2>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">
                  {lastRoll.label || formatDice(lastRoll.count, lastRoll.sides, lastRoll.modifier)}
                </span>
                <div className="text-xs text-muted-foreground mt-0.5">
                  [{lastRoll.results.join(", ")}]
                  {lastRoll.modifier !== 0 && (
                    <span>
                      {" "}
                      {lastRoll.modifier > 0 ? "+" : ""}
                      {lastRoll.modifier}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{lastRoll.total}</span>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Podsumowanie postaci */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Aktywna postać
        </h2>
        <Link to="/character">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{character.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {character.race} · {character.career}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Żywotność</div>
                  <div className="text-sm font-bold">
                    <span className={character.wounds.current <= 3 ? "text-destructive" : "text-foreground"}>
                      {character.wounds.current}
                    </span>
                    <span className="text-muted-foreground">/{character.wounds.max}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {character.stats.slice(0, 4).map((stat) => (
                  <span
                    key={stat.abbr}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium"
                  >
                    {stat.abbr} {stat.value}
                  </span>
                ))}
                <span className="text-[10px] text-muted-foreground px-1">…</span>
              </div>
              {character.conditions.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {character.conditions.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}