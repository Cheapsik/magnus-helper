import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { newThreshold, type ReputationThreshold } from "@/lib/factionRelations";
import type { Faction } from "@/lib/factions";

type Props = {
  factions: Faction[];
  thresholds: ReputationThreshold[];
  onChange: (next: ReputationThreshold[]) => void;
};

export function ReputationThresholdEditor({ factions, thresholds, onChange }: Props) {
  const update = (id: string, patch: Partial<ReputationThreshold>) =>
    onChange(thresholds.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  if (factions.length === 0) return <p className="text-sm text-muted-foreground">Najpierw dodaj frakcję.</p>;
  return (
    <div className="space-y-1.5">
      {thresholds.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Frakcja"
            value={t.factionId}
            onChange={(e) => update(t.id, { factionId: e.target.value })}
          >
            {factions.map((f) => <option key={f.id} value={f.id}>{f.name || "Bez nazwy"}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            od
            <NumberInput className="h-8 w-16" value={t.min} onChange={(v) => update(t.id, { min: Math.round(v) })} />
          </label>
          <Input className="h-8 min-w-40 flex-1" value={t.effect} placeholder="Efekt, np. kupcy dają 10% zniżki" onChange={(e) => update(t.id, { effect: e.target.value })} />
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Usuń próg efektu" onClick={() => onChange(thresholds.filter((x) => x.id !== t.id))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1" onClick={() => onChange([...thresholds, newThreshold(factions[0].id)])}>
        <Plus className="h-3.5 w-3.5" />Dodaj efekt progu
      </Button>
    </div>
  );
}
