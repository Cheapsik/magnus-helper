import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { rollTable, type RandomTable, type TableRoll } from "@/lib/randomTables";
import { RefPicker } from "./RefPicker";

/** Compact roller for one random table picked in the tile config. */
export function TableRollTile({ refId, editing, onPick }: { refId?: string; editing: boolean; onPick: (id: string) => void }) {
  const [tables] = useLocalStorage<RandomTable[]>("rpg_random_tables", []);
  const [result, setResult] = useState<TableRoll | null>(null);
  const table = tables.find((t) => t.id === refId);

  if (tables.length === 0) return <p className="text-sm text-muted-foreground">Brak tabel losowych w kampanii.</p>;
  if (editing || !table)
    return <RefPicker value={table?.id} options={tables.map((t) => ({ id: t.id, label: t.name }))} onPick={onPick} placeholder="Wybierz tabelę" />;

  const roll = () => {
    const r = rollTable(table, tables);
    setResult(r ?? { tableName: table.name, roll: 0, text: "Nieprawidłowa notacja kości tabeli.", nested: [] });
  };

  return (
    <div className="space-y-3">
      <Button className="h-12 w-full text-base" onClick={roll}>
        <Dices className="mr-2 h-5 w-5" /> Losuj: {table.name}
      </Button>
      {result && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <span className="mr-2 font-mono font-bold text-primary">{result.roll}</span>
          {result.text}
        </p>
      )}
    </div>
  );
}
