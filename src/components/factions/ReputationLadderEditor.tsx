import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { newId } from "@/lib/cardSchema";
import type { ReputationTier } from "@/lib/factions";

type Props = {
  ladder: ReputationTier[];
  onChange: (next: ReputationTier[]) => void;
};

export function ReputationLadderEditor({ ladder, onChange }: Props) {
  const update = (id: string, patch: Partial<ReputationTier>) =>
    onChange(ladder.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-1.5">
      {[...ladder].sort((a, b) => a.min - b.min).map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <Input className="h-8 flex-1" value={t.name} placeholder="Nazwa progu" onChange={(e) => update(t.id, { name: e.target.value })} />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            od
            <NumberInput className="h-8 w-16" value={t.min} onChange={(v) => update(t.id, { min: Math.round(v) })} />
          </label>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Usuń próg" onClick={() => onChange(ladder.filter((x) => x.id !== t.id))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => onChange([...ladder, { id: newId(), name: "", min: Math.max(0, ...ladder.map((t) => t.min)) + 1 }])}
      >
        <Plus className="h-3.5 w-3.5" />Dodaj próg
      </Button>
    </div>
  );
}
