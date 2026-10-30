import { useState } from "react";
import { Dices, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseTableText, rollTable, tableAvailable, type RandomTable, type TableRoll } from "@/lib/randomTables";
import { TIMES_OF_DAY } from "@/lib/tableConditions";
import { useTableContext } from "@/components/tables/useTableContext";

export const TABLES_KEY = "rpg_random_tables";
export const TABLES_HISTORY_KEY = "rpg_random_tables_history";
type HistoryItem = TableRoll & { id: string; at: number };

/** Floating panel: one click rolls any table that fits the current world state. */
export default function QuickRollPanel() {
  const [open, setOpen] = useState(false);
  const [tables] = useLocalStorage<RandomTable[]>(TABLES_KEY, []);
  const [, setHistory] = useLocalStorage<HistoryItem[]>(TABLES_HISTORY_KEY, []);
  const [last, setLast] = useState<TableRoll | null>(null);
  const { context, timeOfDay, setTimeOfDay, location, setLocation } = useTableContext();

  const available = tables.filter((t) => tableAvailable(t, context) && parseTableText(t.text).entries.length > 0);

  const roll = (table: RandomTable) => {
    const result = rollTable(table, tables, undefined, context);
    if (!result) return;
    setLast(result);
    setHistory((prev) => [{ ...result, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, 50));
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="icon" aria-label="Szybkie losowanie" className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg md:bottom-6">
        <Dices className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <aside aria-label="Szybkie losowanie" className="fixed bottom-24 right-4 z-40 flex max-h-[70vh] w-72 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xl md:bottom-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Szybkie losowanie</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Zamknij" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Pora dnia">
          {TIMES_OF_DAY.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={timeOfDay === t}
              onClick={() => setTimeOfDay(timeOfDay === t ? "" : t)}
              className={`rounded-full border px-2 py-0.5 ${timeOfDay === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Input aria-label="Miejsce" placeholder="Miejsce" className="field-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
        <p className="text-muted-foreground">Pora roku z kalendarza: {context.season ?? "brak"}</p>
      </div>
      {last && (
        <div className="rounded-md bg-muted/50 px-2 py-1.5 text-sm">
          <span className="font-bold tabular-nums">{last.roll || "–"}</span> {last.text}
          <p className="text-xs text-muted-foreground">
            {last.tableName}
            {last.nested.map((n, i) => <span key={i}> · {n.tableName}: {n.roll}</span>)}
          </p>
        </div>
      )}
      <div className="min-h-0 space-y-1 overflow-y-auto">
        {available.length === 0 && <p className="text-xs text-muted-foreground">Brak tabel pasujących do obecnej sytuacji.</p>}
        {available.map((t) => (
          <Button key={t.id} variant="outline" size="sm" className="w-full justify-start" onClick={() => roll(t)}>
            <Dices className="mr-1 h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t.name || "(bez nazwy)"}</span>
          </Button>
        ))}
      </div>
    </aside>
  );
}
