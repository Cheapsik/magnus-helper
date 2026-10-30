import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Dices, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { isDiceNotation } from "@/lib/diceNotation";
import { entryLabel, parseTableText, randomTablesFileSchema, rollTable, tableDice, type EntryMeta, type RandomTable, type TableRoll } from "@/lib/randomTables";
import { mergeById, readJsonFile } from "@/lib/jsonImport";
import TableConditionEditor from "@/components/tables/TableConditionEditor";
import { useTableContext } from "@/components/tables/useTableContext";
import { confirmDialog } from "@/components/ui/dialogs";

type HistoryItem = TableRoll & { id: string; at: number };

const HISTORY_LIMIT = 50;

export default function RandomTablesPage() {
  const [tables, setTables] = useLocalStorage<RandomTable[]>("rpg_random_tables", []);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>("rpg_random_tables_history", []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { context } = useTableContext();

  const selected = tables.find((t) => t.id === selectedId) ?? tables[0] ?? null;
  const parsed = selected ? parseTableText(selected.text) : null;
  const lastRoll = selected ? history.find((h) => h.tableName === selected.name) : undefined;

  const folders = [...new Set(tables.map((t) => t.folder.trim()))].sort((a, b) => a.localeCompare(b, "pl"));

  const importFileRef = useRef<HTMLInputElement>(null);
  const importTables = async (file: File) => {
    try {
      const imported = await readJsonFile(file, randomTablesFileSchema);
      setTables((prev) => mergeById(prev, imported));
      toast.success(`Zaimportowano tabele: ${imported.length}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zaimportować pliku");
    }
  };

  const addTable = () => {
    const table: RandomTable = { id: crypto.randomUUID(), name: `Tabela ${tables.length + 1}`, folder: selected?.folder ?? "", dice: "", text: "" };
    setTables((prev) => [...prev, table]);
    setSelectedId(table.id);
  };

  const update = (patch: Partial<RandomTable>) => {
    if (!selected) return;
    setTables((prev) => prev.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));
  };

  const remove = async () => {
    if (!selected || !(await confirmDialog(`Usunąć tabelę „${selected.name}”?`, { confirmLabel: "Usuń", destructive: true }))) return;
    setTables((prev) => prev.filter((t) => t.id !== selected.id));
    setSelectedId(null);
  };

  const roll = () => {
    if (!selected) return;
    const result = rollTable(selected, tables, undefined, context);
    if (!result) return;
    setHistory((prev) => [{ ...result, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, HISTORY_LIMIT));
  };

  const updateMeta = (text: string, patch: Partial<EntryMeta>) => {
    if (!selected) return;
    const merged = { ...selected.entryMeta?.[text], ...patch };
    const meta = { ...selected.entryMeta };
    if (merged.weight === undefined && !merged.conditions) delete meta[text];
    else meta[text] = merged;
    update({ entryMeta: meta });
  };

  const diceInvalid = !!selected && selected.dice.trim() !== "" && !isDiceNotation(selected.dice);

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="space-y-3">
        <Button onClick={addTable} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Nowa tabela
        </Button>
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importTables(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => importFileRef.current?.click()}
          title="Dodaje tabele z pliku JSON; tabele o tym samym id zastępuje"
        >
          <Upload className="h-4 w-4 mr-1" /> Importuj JSON
        </Button>
        {folders.map((folder) => (
          <div key={folder} className="space-y-1">
            {folder && <h3 className="text-xs font-medium text-muted-foreground uppercase">{folder}</h3>}
            {tables
              .filter((t) => t.folder.trim() === folder)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent truncate",
                    t.id === selected?.id && "bg-accent font-medium",
                  )}
                >
                  {t.name || "(bez nazwy)"}
                </button>
              ))}
          </div>
        ))}
      </div>

      {!selected || !parsed ? (
        <p className="text-muted-foreground text-center py-12">Brak tabel. Dodaj pierwszą przyciskiem obok.</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_160px_120px]">
                <Input value={selected.name} onChange={(e) => update({ name: e.target.value })} placeholder="Nazwa tabeli" aria-label="Nazwa tabeli" className="font-medium" />
                <Input value={selected.folder} onChange={(e) => update({ folder: e.target.value })} placeholder="Folder" aria-label="Folder" />
                <Input
                  value={selected.dice}
                  onChange={(e) => update({ dice: e.target.value })}
                  placeholder={tableDice({ ...selected, dice: "" }, parsed.entries)}
                  aria-label="Kość"
                  className={cn(diceInvalid && "border-destructive")}
                />
              </div>
              <Textarea
                value={selected.text}
                onChange={(e) => update({ text: e.target.value })}
                placeholder={"Jeden wpis na linię. Można wkleić gotową tabelę:\n01-05 Wilki\n06-10 Bandyci\n11. Kupiec z [[Towary]]"}
                aria-label="Wpisy"
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {parsed.entries.length} wpisów · <code>[[Nazwa tabeli]]</code> losuje z innej tabeli
              </p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cała tabela losuje się tylko, gdy:</p>
                <TableConditionEditor value={selected.conditions} onChange={(conditions) => update({ conditions })} context={context} />
              </div>
              {(diceInvalid || parsed.issues.length > 0) && (
                <ul className="text-xs text-destructive space-y-0.5">
                  {diceInvalid && <li>Nieprawidłowy zapis kości: {selected.dice}</li>}
                  {parsed.issues.map((issue, i) => (
                    <li key={i} className="flex gap-1 items-start">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> {issue}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button onClick={roll} disabled={diceInvalid || parsed.entries.length === 0} className="flex-1">
                  <Dices className="h-4 w-4 mr-1" /> Losuj{parsed.entries.length > 0 && ` (${tableDice(selected, parsed.entries)})`}
                </Button>
                <Button onClick={remove} variant="outline" size="icon" aria-label="Usuń tabelę" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {lastRoll && <RollView roll={lastRoll} highlight />}
            </CardContent>
          </Card>

          <details className="group">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
              Wpisy ({parsed.entries.length})
            </summary>
            <ol className="mt-2 text-sm space-y-2">
              {parsed.entries.map((e, i) => {
                const meta = selected.entryMeta?.[e.text];
                return (
                  <li key={i} className="space-y-1">
                    <div className="flex gap-3 items-center">
                      <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">{entryLabel(e)}</span>
                      <span className="flex-1">{e.text}</span>
                      <Input
                        type="number"
                        min={1}
                        aria-label={`Waga: ${e.text}`}
                        title="Waga (puste = zwykłe losowanie)"
                        placeholder="waga"
                        className="h-7 w-20 text-xs"
                        value={meta?.weight ?? ""}
                        onChange={(ev) => updateMeta(e.text, { weight: ev.target.value === "" ? undefined : Math.max(1, Number(ev.target.value)) })}
                      />
                    </div>
                    <div className="pl-[68px]">
                      <TableConditionEditor value={meta?.conditions} onChange={(conditions) => updateMeta(e.text, { conditions })} context={context} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </details>

          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Historia rzutów</h3>
                <Button variant="ghost" size="sm" onClick={() => setHistory([])}>Wyczyść</Button>
              </div>
              {history.map((h) => <RollView key={h.id} roll={h} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RollView({ roll, highlight }: { roll: TableRoll; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md border border-border px-3 py-2", highlight && "bg-muted/50")}>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-bold tabular-nums", highlight ? "text-2xl text-primary" : "text-sm")}>{roll.roll}</span>
        <span className={cn(highlight ? "text-base" : "text-sm")}>{roll.text}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {roll.tableName}
        {roll.nested.map((n, i) => <span key={i}> · {n.tableName}: {n.roll}</span>)}
      </p>
    </div>
  );
}
