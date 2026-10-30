import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X, Timer, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useCampaignSystem } from "@/lib/cardStore";
import type { ActiveCondition } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SEVERITY_STYLES = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-primary/10 text-primary border-primary/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

const SEVERITY_ORDER: ActiveCondition["severity"][] = ["low", "medium", "high"];

const SEVERITY_LABELS: Record<ActiveCondition["severity"], string> = {
  low: "Niska",
  medium: "Średnia",
  high: "Wysoka",
};

export default function ConditionsPage() {
  const { conditions, setConditions } = useApp();
  const [system] = useCampaignSystem();
  const [customName, setCustomName] = useState("");

  const addCondition = (name: string, severity: ActiveCondition["severity"] = "medium") => {
    if (conditions.some((c) => c.name === name)) return;
    setConditions((prev) => [...prev, { id: crypto.randomUUID(), name, severity }]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const cycleSeverity = (id: string) =>
    setConditions((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, severity: SEVERITY_ORDER[(SEVERITY_ORDER.indexOf(c.severity) + 1) % SEVERITY_ORDER.length] } : c,
      ),
    );

  const updateRounds = (id: string, delta: number) =>
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, rounds: Math.max(0, (c.rounds ?? 0) + delta) } : c));

  const handleCustomAdd = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    addCondition(trimmed, "medium");
    setCustomName("");
  };

  return (
    <div className="space-y-5 animate-fade-in">

      <section>
        <label className="field-label mb-1.5 block">
          Aktywne ({conditions.length})
        </label>
        {conditions.length === 0 ? (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Brak aktywnych stanów</CardContent></Card>
        ) : (
          <div className="space-y-1.5">
            {conditions.map((c) => (
              <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 rounded-md border ${SEVERITY_STYLES[c.severity]}`}>
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => cycleSeverity(c.id)}
                  title={`Waga: ${SEVERITY_LABELS[c.severity]} — kliknij, aby zmienić`}
                >
                  {c.severity === "high" && <AlertTriangle className="h-3.5 w-3.5" />}
                  <span className="text-sm font-medium">{c.name}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {c.rounds !== undefined ? (
                    <div className="flex items-center gap-1 mr-1">
                      <Timer className="h-3 w-3 text-muted-foreground" />
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateRounds(c.id, -1)}><span className="text-[10px]">-</span></Button>
                      <span className="text-xs font-bold min-w-[1.5ch] text-center">{c.rounds}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateRounds(c.id, 1)}><span className="text-[10px]">+</span></Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateRounds(c.id, 0)} title="Dodaj licznik rund">
                      <Timer className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCondition(c.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <label className="field-label mb-1.5 block">Szybkie dodawanie</label>
        {system.conditions.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
            Kampania nie ma jeszcze listy stanów.{" "}
            <Link to="/settings?tab=stany" className="font-medium text-primary underline underline-offset-2">
              Dodaj stany w ustawieniach kampanii
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {system.conditions.map((c) => {
              const active = conditions.find((a) => a.name === c.name);
              return (
                <Button key={c.id} size="sm" variant={active ? "default" : "outline"} className="text-xs"
                  onClick={() => active ? removeCondition(active.id) : addCondition(c.name)}>
                  {c.name}
                </Button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <label className="field-label mb-1.5 block">Własny stan</label>
        <div className="flex gap-2">
          <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            placeholder="Nazwa stanu…" className="flex-1 h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <Button size="sm" onClick={handleCustomAdd} className="gap-1"><Plus className="h-3.5 w-3.5" />Dodaj</Button>
        </div>
      </section>
    </div>
  );
}