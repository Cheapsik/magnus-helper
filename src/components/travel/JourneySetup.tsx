import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarMonth } from "@/lib/campaignCalendar";
import type { RandomTable } from "@/lib/randomTables";
import { newStage, newSupply, type Journey, type Stage, type Supply } from "@/lib/travel";
import { TablePicker } from "./TablePicker";

/** Route, supplies and the tables rolled each day. Edits apply immediately. */
export function JourneySetup({ journey, tables, months, onChange }: {
  journey: Journey;
  tables: RandomTable[];
  months: CalendarMonth[];
  onChange: (fn: (j: Journey) => Journey) => void;
}) {
  const setStage = (id: string, patch: Partial<Stage>) =>
    onChange((j) => ({ ...j, stages: j.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const setSupply = (id: string, patch: Partial<Supply>) =>
    onChange((j) => ({ ...j, supplies: j.supplies.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const setMonthTable = (month: number, id: string | null) =>
    onChange((j) => {
      const weatherByMonth = { ...j.weatherByMonth };
      if (id) weatherByMonth[month] = id;
      else delete weatherByMonth[month];
      return { ...j, weatherByMonth };
    });
  const removeStage = (id: string) =>
    onChange((j) => {
      const stages = j.stages.filter((s) => s.id !== id);
      return { ...j, stages, stageIndex: Math.min(j.stageIndex, Math.max(0, stages.length - 1)) };
    });
  const lastTo = journey.stages.at(-1)?.to ?? "";

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="journey-name">Nazwa podróży</Label>
        <Input id="journey-name" value={journey.name} onChange={(e) => onChange((j) => ({ ...j, name: e.target.value }))} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Etapy</h3>
        {journey.stages.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[1fr_1fr_5rem_auto] gap-2 items-end">
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Skąd</Label>}
              <Input aria-label="Skąd" value={s.from} onChange={(e) => setStage(s.id, { from: e.target.value })} />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Dokąd</Label>}
              <Input aria-label="Dokąd" value={s.to} onChange={(e) => setStage(s.id, { to: e.target.value })} />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Dni</Label>}
              <Input aria-label="Dni" type="number" min={1} value={s.days} onChange={(e) => setStage(s.id, { days: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" aria-label="Usuń etap" onClick={() => removeStage(s.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Input
              className="field-sm col-span-3"
              placeholder="Notatka do etapu (opcjonalnie)"
              aria-label="Notatka do etapu"
              value={s.note}
              onChange={(e) => setStage(s.id, { note: e.target.value })}
            />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange((j) => ({ ...j, stages: [...j.stages, { ...newStage(), from: lastTo }] }))}>
          <Plus className="h-4 w-4 mr-1" /> Dodaj etap
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Zapasy</h3>
        <p className="text-xs text-muted-foreground">Dowolne liczniki zużywane każdego dnia drogi, np. racje, woda, pasza.</p>
        {journey.supplies.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-end">
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Nazwa</Label>}
              <Input aria-label="Nazwa zapasu" value={s.name} onChange={(e) => setSupply(s.id, { name: e.target.value })} />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Ilość</Label>}
              <Input aria-label="Ilość" type="number" min={0} value={s.amount} onChange={(e) => setSupply(s.id, { amount: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs">Na dzień</Label>}
              <Input aria-label="Zużycie na dzień" type="number" min={0} value={s.perDay} onChange={(e) => setSupply(s.id, { perDay: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" aria-label="Usuń zapas" onClick={() => onChange((j) => ({ ...j, supplies: j.supplies.filter((x) => x.id !== s.id) }))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange((j) => ({ ...j, supplies: [...j.supplies, newSupply()] }))}>
          <Plus className="h-4 w-4 mr-1" /> Dodaj zapas
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Losowanie każdego dnia</h3>
        {tables.length === 0 && <p className="text-xs text-muted-foreground">Brak tabel losowych. Dodaj je w module „Tabele losowe”.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="journey-event">Tabela zdarzeń</Label>
            <TablePicker id="journey-event" tables={tables} value={journey.eventTableId} onChange={(id) => onChange((j) => ({ ...j, eventTableId: id }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="journey-weather">Tabela pogody</Label>
            <TablePicker id="journey-weather" tables={tables} value={journey.weatherTableId} onChange={(id) => onChange((j) => ({ ...j, weatherTableId: id }))} />
          </div>
        </div>
        {months.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Inna tabela pogody w wybranych miesiącach</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {months.map((m, i) => (
                <div key={i} className="grid grid-cols-[7rem_1fr] items-center gap-2">
                  <Label className="text-xs truncate">{m.name}</Label>
                  <TablePicker tables={tables} value={journey.weatherByMonth[i] ?? null} onChange={(id) => setMonthTable(i, id)} noneLabel="Domyślna" />
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
