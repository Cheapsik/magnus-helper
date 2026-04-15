import { useState } from "react";
import { Target, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { rollPercentile } from "@/lib/dice";
import type { TestResult } from "@/lib/dice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

export default function TestsPage() {
  const { addTestResult, testHistory, clearTestHistory, difficultyPresets } = useApp();
  const [baseValue, setBaseValue] = useState(40);
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);

  const target = Math.max(1, Math.min(99, baseValue + modifier));

  const handleTest = () => {
    const roll = rollPercentile();
    const success = roll <= target;
    const margin = Math.abs(roll - target);
    const tr: TestResult = {
      roll, target, success, margin,
      label: label || "Test",
      timestamp: Date.now(),
    };
    setResult(tr);
    addTestResult(tr);
  };

  const handleClear = () => {
    setResult(null);
    clearTestHistory();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold">Test procentowy</h1>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Wartość bazowa</label>
          <NumberInput value={baseValue} onChange={setBaseValue} min={1} max={99} className="text-center text-lg font-bold h-12" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Modyfikator</label>
          <NumberInput value={modifier} onChange={setModifier} className="text-center text-lg font-bold h-12" />
        </div>
      </div>

      <Input placeholder="Nazwa testu (np. Walka wręcz, Skradanie, Spostrzegawczość)" value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm" />

      <Card className="border-primary/30">
        <CardContent className="p-3 text-center">
          <div className="text-xs text-muted-foreground">Liczba docelowa</div>
          <div className="text-3xl font-bold text-primary">{target}</div>
        </CardContent>
      </Card>

      <section>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Poziom trudności</label>
        <div className="flex flex-wrap gap-1.5">
          {difficultyPresets.map((d) => (
            <Button key={d.label} size="sm" variant={modifier === d.modifier ? "default" : "outline"} className="text-xs" onClick={() => setModifier(d.modifier)}>
              {d.labelPl || d.label} ({d.modifier >= 0 ? `+${d.modifier}` : d.modifier})
            </Button>
          ))}
        </div>
      </section>

      <Button onClick={handleTest} className="w-full h-12 text-base font-semibold gap-2">
        <Target className="h-5 w-5" /> Wykonaj test procentowy
      </Button>

      {result && (
        <Card key={result.timestamp} className={cn("border-2 animate-fade-in", result.success ? "border-success" : "border-destructive")}
          style={{ animation: result.success ? "pulse-success 0.6s ease-out, fade-in 0.3s ease-out" : "pulse-fail 0.6s ease-out, fade-in 0.3s ease-out" }}>
          <CardContent className="p-4 text-center">
            <div className={cn("text-sm font-bold uppercase tracking-wider mb-1", result.success ? "text-success" : "text-destructive")}>
              {result.success ? "Sukces" : "Porażka"}
            </div>
            <div className="text-4xl font-bold animate-dice-bounce">{result.roll}</div>
            <div className="text-sm text-muted-foreground mt-1">vs cel {result.target} · Margines {result.success ? "sukcesu" : "porażki"}: {result.margin}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Stopnie {result.success ? "sukcesu" : "porażki"}: {Math.floor(result.margin / 10)}</div>
          </CardContent>
        </Card>
      )}

      {testHistory.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ostatnie testy</label>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={handleClear}>
              <Trash2 className="h-3 w-3" /> Wyczyść
            </Button>
          </div>
          <div className="space-y-1">
            {testHistory.slice(0, 10).map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-card border">
                <div>
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">(cel {t.target})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", t.success ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                    {t.success ? "Tak" : "Nie"}
                  </span>
                  <span className="font-bold min-w-[2ch] text-right">{t.roll}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}