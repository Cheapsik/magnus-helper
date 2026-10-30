import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { newRelation, RELATION_LABELS, type FactionRelation, type RelationKind } from "@/lib/factionRelations";
import type { Faction } from "@/lib/factions";

type Props = {
  factions: Faction[];
  relations: FactionRelation[];
  onChange: (next: FactionRelation[]) => void;
};

const SELECT_CLASS = "h-8 rounded-md border border-input bg-background px-2 text-sm";
const EDGE_COLOR: Record<RelationKind, string> = { ally: "hsl(var(--success))", enemy: "hsl(var(--destructive))", neutral: "hsl(var(--muted-foreground))" };
const SIZE = 300;

export function FactionRelationsGraph({ factions, relations, onChange }: Props) {
  const name = (id: string) => factions.find((f) => f.id === id)?.name || "Bez nazwy";
  const pos = new Map(
    factions.map((f, i) => {
      const a = (2 * Math.PI * i) / factions.length - Math.PI / 2;
      return [f.id, { x: SIZE / 2 + Math.cos(a) * 110, y: SIZE / 2 + Math.sin(a) * 110 }] as const;
    }),
  );
  const valid = relations.filter((r) => pos.has(r.aId) && pos.has(r.bId));
  const update = (id: string, patch: Partial<FactionRelation>) => onChange(relations.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  if (factions.length < 2) return <p className="text-sm text-muted-foreground">Potrzebne są co najmniej dwie frakcje.</p>;
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Graf relacji między frakcjami">
        {valid.map((r) => {
          const a = pos.get(r.aId)!;
          const b = pos.get(r.bId)!;
          return (
            <line
              key={r.id}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              style={{ stroke: EDGE_COLOR[r.kind] }}
              strokeWidth={1 + Math.min(Math.abs(r.factor), 1) * 3}
              strokeDasharray={r.kind === "neutral" ? "4 4" : undefined}
            />
          );
        })}
        {factions.map((f) => {
          const p = pos.get(f.id)!;
          return (
            <g key={f.id}>
              <circle cx={p.x} cy={p.y} r={12} fill={f.color} />
              <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize={11} fill="currentColor">{f.name || "Bez nazwy"}</text>
            </g>
          );
        })}
      </svg>

      <div className="space-y-1.5">
        {valid.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
            <select className={SELECT_CLASS} aria-label="Pierwsza frakcja" value={r.aId} onChange={(e) => update(r.id, { aId: e.target.value })}>
              {factions.filter((f) => f.id !== r.bId).map((f) => <option key={f.id} value={f.id}>{name(f.id)}</option>)}
            </select>
            <select className={SELECT_CLASS} aria-label="Rodzaj relacji" value={r.kind} onChange={(e) => update(r.id, { kind: e.target.value as RelationKind })}>
              {(Object.keys(RELATION_LABELS) as RelationKind[]).map((k) => <option key={k} value={k}>{RELATION_LABELS[k]}</option>)}
            </select>
            <select className={SELECT_CLASS} aria-label="Druga frakcja" value={r.bId} onChange={(e) => update(r.id, { bId: e.target.value })}>
              {factions.filter((f) => f.id !== r.aId).map((f) => <option key={f.id} value={f.id}>{name(f.id)}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              przenosi
              <NumberInput className="h-8 w-16" aria-label="Współczynnik przenoszenia reputacji" value={r.factor} onChange={(v) => update(r.id, { factor: v })} />
              ×
            </label>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Usuń relację" onClick={() => onChange(relations.filter((x) => x.id !== r.id))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="gap-1" onClick={() => onChange([...relations, newRelation(factions[0].id, factions[1].id)])}>
          <Plus className="h-3.5 w-3.5" />Dodaj relację
        </Button>
      </div>
    </div>
  );
}
