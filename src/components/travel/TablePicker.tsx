import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RandomTable } from "@/lib/randomTables";

const NONE = "__none__";

/** Random table chooser; "Brak" means nothing is rolled. */
export function TablePicker({ id, tables, value, onChange, noneLabel = "Brak (nie losuj)" }: {
  id?: string;
  tables: RandomTable[];
  value: string | null;
  onChange: (id: string | null) => void;
  noneLabel?: string;
}) {
  return (
    <Select value={value && tables.some((t) => t.id === value) ? value : NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {tables.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.folder ? `${t.folder} / ` : ""}{t.name || "Bez nazwy"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
