import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, X, Timer, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useCampaignSystem } from "@/lib/cardStore";
import type { ActiveCondition } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Severity reads in the tag beside the name; the row itself stays a plain line of the list. */
const SEVERITY_TAG = {
  low: "text-muted-foreground",
  medium: "text-primary",
  high: "text-destructive",
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
          <p className="rounded-[--radius] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">Nikt nie ma teraz żadnego stanu.</p>
        ) : (
          <ul className="surface divide-y divide-border border border-border">
            {conditions.map((c) => (
              <li key={c.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
                <span className="min-w-0 flex-1 truncate font-display text-[length:--fs-section] font-medium">{c.name}</span>
                <button
                  type="button"
                  className={`flex items-center gap-1 rounded-[--radius] px-1.5 py-0.5 font-caps text-[length:--fs-sm] hover:bg-secondary ${SEVERITY_TAG[c.severity]}`}
                  onClick={() => cycleSeverity(c.id)}
                  title="Kliknij, aby zmienić wagę"
                >
                  {c.severity === "high" && <AlertTriangle className="h-3.5 w-3.5" />}
                  {SEVERITY_LABELS[c.severity].toLowerCase()}
                </button>
                {c.rounds !== undefined ? (
                  <div className="flex items-center gap-1" title="Pozostałe rundy">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <Button size="icon-sm" variant="ghost" onClick={() => updateRounds(c.id, -1)} aria-label="Odejmij rundę"><Minus /></Button>
                    <span className="readout min-w-[2ch] text-center">{c.rounds}</span>
                    <Button size="icon-sm" variant="ghost" onClick={() => updateRounds(c.id, 1)} aria-label="Dodaj rundę"><Plus /></Button>
                  </div>
                ) : (
                  <Button size="icon-sm" variant="ghost" onClick={() => updateRounds(c.id, 0)} title="Dodaj licznik rund" aria-label="Dodaj licznik rund">
                    <Timer />
                  </Button>
                )}
                <Button size="icon-sm" variant="ghost" className="hover:text-destructive" onClick={() => removeCondition(c.id)} aria-label={`Zdejmij stan ${c.name}`}><X /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <label className="field-label mb-1.5 block">Szybkie dodawanie</label>
        {system.conditions.length === 0 ? (
          <p className="rounded-[--radius] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
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
                <Button key={c.id} size="sm" variant={active ? "default" : "outline"} aria-pressed={!!active}
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
          <Input value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            placeholder="Nazwa stanu…" className="flex-1" />
          <Button onClick={handleCustomAdd}><Plus />Dodaj</Button>
        </div>
      </section>
    </div>
  );
}