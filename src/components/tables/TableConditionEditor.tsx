import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { describeCondition, SEASONS, TIMES_OF_DAY, type TableCondition, type TableContext } from "@/lib/tableConditions";

const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-xs";

function toggle<T>(list: T[] | undefined, item: T): T[] {
  const l = list ?? [];
  return l.includes(item) ? l.filter((x) => x !== item) : [...l, item];
}

type Props = {
  value: TableCondition[] | undefined;
  onChange: (next: TableCondition[] | undefined) => void;
  /** Clocks and factions to pick from. */
  context: TableContext;
};

/** Edits a list of conditions that must all hold. */
export default function TableConditionEditor({ value, onChange, context }: Props) {
  const list = value ?? [];
  const set = (next: TableCondition[]) => onChange(next.length ? next : undefined);
  const patch = (i: number, c: TableCondition) => set(list.map((x, j) => (j === i ? c : x)));

  const add = (type: string) => {
    if (type === "clock" && context.clocks[0]) set([...list, { type, clockId: context.clocks[0].id, op: "full" }]);
    else if (type === "faction" && context.factions[0]) set([...list, { type, factionId: context.factions[0].id, op: ">=", value: 1 }]);
    else if (type === "time") set([...list, { type, timesOfDay: [], seasons: [] }]);
    else if (type === "location") set([...list, { type, value: "" }]);
  };

  return (
    <div className="space-y-1.5">
      {list.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs">
          {c.type === "clock" && (
            <>
              <select aria-label="Koło postępu" className={selectClass} value={c.clockId} onChange={(e) => patch(i, { ...c, clockId: e.target.value })}>
                {context.clocks.map((k) => <option key={k.id} value={k.id}>{k.name || "(bez nazwy)"}</option>)}
                {!context.clocks.some((k) => k.id === c.clockId) && <option value={c.clockId}>(usunięte koło)</option>}
              </select>
              <select aria-label="Stan koła" className={selectClass} value={c.op} onChange={(e) => patch(i, { ...c, op: e.target.value as typeof c.op })}>
                <option value="full">pełny</option>
                <option value="not_full">niepełny</option>
                <option value="min">wypełnione co najmniej</option>
              </select>
              {c.op === "min" && (
                <Input type="number" min={0} aria-label="Liczba segmentów" className="h-8 w-16 text-xs" value={c.value ?? 0} onChange={(e) => patch(i, { ...c, value: Number(e.target.value) })} />
              )}
            </>
          )}
          {c.type === "faction" && (
            <>
              <span className="text-muted-foreground">Reputacja</span>
              <select aria-label="Frakcja" className={selectClass} value={c.factionId} onChange={(e) => patch(i, { ...c, factionId: e.target.value })}>
                {context.factions.map((f) => <option key={f.id} value={f.id}>{f.name || "(bez nazwy)"}</option>)}
                {!context.factions.some((f) => f.id === c.factionId) && <option value={c.factionId}>(usunięta frakcja)</option>}
              </select>
              <select aria-label="Porównanie" className={selectClass} value={c.op} onChange={(e) => patch(i, { ...c, op: e.target.value as typeof c.op })}>
                <option value=">=">co najmniej</option>
                <option value="<=">co najwyżej</option>
                <option value="=">równa</option>
              </select>
              <Input type="number" aria-label="Wartość reputacji" className="h-8 w-16 text-xs" value={c.value} onChange={(e) => patch(i, { ...c, value: Number(e.target.value) })} />
            </>
          )}
          {c.type === "time" && (
            <div className="flex flex-wrap items-center gap-1">
              {[...TIMES_OF_DAY.map((t) => ["timesOfDay", t] as const), ...SEASONS.map((s) => ["seasons", s] as const)].map(([key, name]) => {
                const on = (c[key] as readonly string[] | undefined)?.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={!!on}
                    onClick={() => patch(i, { ...c, [key]: toggle(c[key] as string[] | undefined, name) })}
                    className={cn("rounded-full border px-2 py-0.5", on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          {c.type === "location" && (
            <Input aria-label="Miejsce" placeholder="Miejsce (jak w panelu losowania)" className="h-8 w-48 text-xs" value={c.value} onChange={(e) => patch(i, { ...c, value: e.target.value })} />
          )}
          <Button type="button" variant="ghost" size="icon" className="ml-auto h-6 w-6" aria-label={`Usuń warunek: ${describeCondition(c, context)}`} onClick={() => set(list.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        <select aria-label="Dodaj warunek" className={selectClass} value="" onChange={(e) => add(e.target.value)}>
          <option value="">Dodaj warunek…</option>
          <option value="clock" disabled={context.clocks.length === 0}>Koło postępu</option>
          <option value="faction" disabled={context.factions.length === 0}>Reputacja frakcji</option>
          <option value="time">Pora dnia / pora roku</option>
          <option value="location">Miejsce</option>
        </select>
      </div>
    </div>
  );
}
