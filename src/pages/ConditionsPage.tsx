import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, X, Timer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useCampaignSystem } from "@/lib/cardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Conditions live on the fight's combatants (the same `statuses` the tracker toggles), so this page and
 * the tracker never disagree. Conditions with no one to carry them (fog, a burning hall) stay on the fight.
 */
export default function ConditionsPage() {
  const { combatants, setCombatants, conditions, setConditions } = useApp();
  const [system] = useCampaignSystem();
  const [customName, setCustomName] = useState("");
  const names = system.conditions.map((c) => c.name);

  const toggleStatus = (id: string, status: string) =>
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, statuses: c.statuses.includes(status) ? c.statuses.filter((s) => s !== status) : [...c.statuses, status] } : c));

  const removeCondition = (id: string) => setConditions((prev) => prev.filter((c) => c.id !== id));
  const updateRounds = (id: string, delta: number) =>
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, rounds: Math.max(0, (c.rounds ?? 0) + delta) } : c));
  const handleCustomAdd = () => {
    const name = customName.trim();
    if (!name || conditions.some((c) => c.name === name)) return;
    setConditions((prev) => [...prev, { id: crypto.randomUUID(), name, severity: "medium" }]);
    setCustomName("");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section>
        <label className="field-label mb-1.5 block">Uczestnicy walki</label>
        {names.length === 0 && (
          <p className="mb-2 text-sm text-muted-foreground">
            Kampania nie ma jeszcze listy stanów.{" "}
            <Link to="/settings?tab=stany" className="font-medium text-primary underline underline-offset-2">Dodaj stany w ustawieniach kampanii</Link>.
          </p>
        )}
        {combatants.length === 0 ? (
          <p className="rounded-[--radius] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            W walce nikogo nie ma.{" "}
            <Link to="/combat" className="font-medium text-primary underline underline-offset-2">Dodaj uczestników w trackerze</Link>.
          </p>
        ) : (
          <ul className="surface divide-y divide-border border border-border">
            {combatants.map((c) => (
              <li key={c.id} className="space-y-1.5 px-4 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className={cn("font-display text-[length:--fs-section] font-medium", c.isEnemy && "text-destructive")}>{c.name}</span>
                  {c.statuses.length === 0 && <span className="text-sm text-muted-foreground">bez stanów</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...names, ...c.statuses])].map((s) => {
                    const on = c.statuses.includes(s);
                    return (
                      <Button key={s} size="sm" variant={on ? "default" : "outline"} aria-pressed={on}
                        className={cn(!on && "text-muted-foreground")} onClick={() => toggleStatus(c.id, s)}>
                        {s}
                      </Button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <label className="field-label mb-1.5 block">Stany całej walki (teren, pogoda, zaklęcia obszarowe)</label>
        {conditions.length > 0 && (
          <ul className="surface mb-2 divide-y divide-border border border-border">
            {conditions.map((c) => (
              <li key={c.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
                <span className="min-w-0 flex-1 truncate font-display text-[length:--fs-section] font-medium">{c.name}</span>
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
        <div className="flex gap-2">
          <Input value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
            placeholder="np. Gęsta mgła" className="flex-1" />
          <Button onClick={handleCustomAdd}><Plus />Dodaj</Button>
        </div>
      </section>
    </div>
  );
}
