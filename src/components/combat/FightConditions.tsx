import { useState } from "react";
import { Plus, Minus, X, Timer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Conditions with no one to carry them (fog, a burning hall). Per-combatant ones live on the combatants. */
export function FightConditions() {
  const { conditions, setConditions } = useApp();
  const [customName, setCustomName] = useState("");

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
  );
}
