import { useState } from "react";
import { ChevronDown, EyeOff, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CardTypeDef,
  type ColumnType,
  type FieldDef,
  type FieldType,
  FIELD_TYPE_LABELS,
} from "@/lib/cardSchema";
import {
  addColumn,
  addFixedRow,
  moveColumn,
  moveFixedRow,
  removeColumn,
  removeFixedRow,
  renameFixedRow,
  setRowMode,
  updateColumn,
  updateField,
} from "@/lib/structureOps";
import {
  Labeled,
  MoveButtons,
  OptionsEditor,
  RandomRuleEditor,
  iconBtn,
  inputCls,
} from "@/components/system/controls";
import { formulaRefTargets } from "@/lib/formulaEngine";

const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: "Tekst",
  number: "Liczba",
  checkbox: "Pole wyboru",
  select: "Wybór z listy",
  dice: "Notacja kości",
};

/** Field types the generator can fill directly (tables are randomised per column). */
const RANDOMISABLE: FieldType[] = ["text", "number", "currentMax", "select", "dice", "track"];

export function FieldEditor({
  type,
  field,
  first,
  last,
  onChange,
  onMove,
  onHide,
}: {
  type: CardTypeDef;
  field: FieldDef;
  first: boolean;
  last: boolean;
  onChange: (next: CardTypeDef) => void;
  onMove: (direction: -1 | 1) => void;
  onHide: () => void;
}) {
  const [open, setOpen] = useState(false);
  const patch = (next: Partial<Omit<FieldDef, "id">>) => onChange(updateField(type, field.id, next));

  return (
    <li className="rounded-md border border-border bg-white/[0.02]">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <input
          className={cn(inputCls, "flex-1 field-inline")}
          value={field.name}
          onChange={(e) => patch({ name: e.target.value })}
          aria-label="Nazwa pola"
        />
        <select
          className={cn(inputCls, "w-40 shrink-0")}
          value={field.type}
          onChange={(e) => {
            const nextType = e.target.value as FieldType;
            const extra: Partial<FieldDef> =
              nextType === "table" && !field.columns
                ? { columns: [{ id: "nazwa", name: "Nazwa", type: "text" }], rowMode: { kind: "dynamic", addLabel: "Dodaj wpis" } }
                : nextType === "track" && !field.trackMax
                  ? { trackMax: 5 }
                  : {};
            patch({ type: nextType, ...extra });
          }}
          aria-label="Typ pola"
        >
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((fieldType) => (
            <option key={fieldType} value={fieldType}>
              {FIELD_TYPE_LABELS[fieldType]}
            </option>
          ))}
        </select>
        <MoveButtons onMove={onMove} first={first} last={last} label={field.name} />
        <button
          type="button"
          className={iconBtn}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Ustawienia pola: ${field.name}`}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <button type="button" className={cn(iconBtn, "hover:text-destructive")} onClick={onHide} aria-label={`Ukryj pole: ${field.name}`}>
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {(field.type === "select" || field.type === "multiselect") && (
            <OptionsEditor options={field.options ?? []} onChange={(options) => patch({ options })} />
          )}
          {field.type === "track" && (
            <Labeled label="Liczba punktów" className="w-32">
              <input
                type="number"
                min={1}
                max={30}
                className={inputCls}
                value={field.trackMax ?? 5}
                onChange={(e) => patch({ trackMax: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
              />
            </Labeled>
          )}
          {field.type === "computed" && (
            <FormulaEditor type={type} formula={field.formula ?? ""} onChange={(formula) => patch({ formula })} />
          )}
          {field.type === "table" && <TableStructureEditor type={type} field={field} onChange={onChange} />}
          {RANDOMISABLE.includes(field.type) && (
            <RandomRuleEditor
              value={field.random}
              onChange={(random) => patch({ random })}
              allowList={field.type !== "number" && field.type !== "currentMax" && field.type !== "track"}
            />
          )}
          {field.type !== "table" && !RANDOMISABLE.includes(field.type) && (
            <p className="text-[length:--fs-meta] text-muted-foreground">To pole nie ma dodatkowych ustawień.</p>
          )}
        </div>
      )}
    </li>
  );
}

function TableStructureEditor({
  type,
  field,
  onChange,
}: {
  type: CardTypeDef;
  field: FieldDef;
  onChange: (next: CardTypeDef) => void;
}) {
  const columns = field.columns ?? [];
  const isFixed = field.rowMode?.kind === "fixed";
  const rows = field.rowMode?.kind === "fixed" ? field.rowMode.rows : [];
  const [newColumn, setNewColumn] = useState("");
  const [newRow, setNewRow] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-md bg-background p-0.5 text-[length:--fs-meta]" role="radiogroup" aria-label="Rodzaj tabeli">
        {(
          [
            ["dynamic", "Lista wpisów (wiersze dodaje się na karcie)"],
            ["fixed", "Stałe wiersze (określasz je tutaj)"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={(isFixed ? "fixed" : "dynamic") === kind}
            onClick={() => onChange(setRowMode(type, field.id, kind))}
            className={cn(
              "flex-1 rounded px-2 py-1 transition-colors",
              (isFixed ? "fixed" : "dynamic") === kind ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-[length:--fs-meta] text-muted-foreground">Kolumny</span>
        <ul className="space-y-1.5">
          {columns.map((column, index) => (
            <li key={column.id} className="space-y-1.5 rounded border border-border/70 p-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  className={cn(inputCls, "flex-1")}
                  value={column.name}
                  onChange={(e) => onChange(updateColumn(type, field.id, column.id, { name: e.target.value }))}
                  aria-label="Nazwa kolumny"
                />
                <select
                  className={cn(inputCls, "w-36 shrink-0")}
                  value={column.type}
                  onChange={(e) => onChange(updateColumn(type, field.id, column.id, { type: e.target.value as ColumnType }))}
                  aria-label="Typ kolumny"
                >
                  {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((columnType) => (
                    <option key={columnType} value={columnType}>
                      {COLUMN_TYPE_LABELS[columnType]}
                    </option>
                  ))}
                </select>
                <MoveButtons
                  onMove={(direction) => onChange(moveColumn(type, field.id, column.id, direction))}
                  first={index === 0}
                  last={index === columns.length - 1}
                  label={column.name}
                />
                <button
                  type="button"
                  className={cn(iconBtn, "hover:text-destructive")}
                  onClick={() => onChange(removeColumn(type, field.id, column.id))}
                  aria-label={`Usuń kolumnę: ${column.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {column.type === "select" && (
                <OptionsEditor
                  options={column.options ?? []}
                  onChange={(options) => onChange(updateColumn(type, field.id, column.id, { options }))}
                />
              )}
              {(column.type === "number" || column.type === "text" || column.type === "select" || column.type === "dice") && (
                <RandomRuleEditor
                  value={column.random}
                  onChange={(random) => onChange(updateColumn(type, field.id, column.id, { random }))}
                  allowList={column.type !== "number"}
                />
              )}
            </li>
          ))}
        </ul>
        <AddRow
          placeholder="Nazwa nowej kolumny"
          value={newColumn}
          onValue={setNewColumn}
          onAdd={() => {
            onChange(addColumn(type, field.id, "text", newColumn.trim()));
            setNewColumn("");
          }}
        />
      </div>

      {isFixed ? (
        <div className="space-y-1.5">
          <span className="text-[length:--fs-meta] text-muted-foreground">Wiersze</span>
          <ul className="space-y-1">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-1.5">
                <input
                  className={cn(inputCls, "flex-1")}
                  value={row.label}
                  onChange={(e) => onChange(renameFixedRow(type, field.id, row.id, e.target.value))}
                  aria-label="Nazwa wiersza"
                />
                <MoveButtons
                  onMove={(direction) => onChange(moveFixedRow(type, field.id, row.id, direction))}
                  first={index === 0}
                  last={index === rows.length - 1}
                  label={row.label}
                />
                <button
                  type="button"
                  className={cn(iconBtn, "hover:text-destructive")}
                  onClick={() => onChange(removeFixedRow(type, field.id, row.id))}
                  aria-label={`Usuń wiersz: ${row.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <AddRow
            placeholder="Nazwa nowego wiersza"
            value={newRow}
            onValue={setNewRow}
            onAdd={() => {
              onChange(addFixedRow(type, field.id, newRow.trim()));
              setNewRow("");
            }}
          />
        </div>
      ) : (
        <Labeled label="Napis na przycisku dodawania" className="max-w-xs">
          <input
            className={inputCls}
            value={field.rowMode?.kind === "dynamic" ? (field.rowMode.addLabel ?? "") : ""}
            onChange={(e) => onChange(updateField(type, field.id, { rowMode: { kind: "dynamic", addLabel: e.target.value } }))}
          />
        </Labeled>
      )}
    </div>
  );
}

function FormulaEditor({
  type,
  formula,
  onChange,
}: {
  type: CardTypeDef;
  formula: string;
  onChange: (formula: string) => void;
}) {
  const refs = formulaRefTargets(type);
  return (
    <div className="space-y-1.5">
      <Labeled label="Formuła" className="w-full">
        <input
          className={cn(inputCls, "font-mono")}
          value={formula}
          onChange={(e) => onChange(e.target.value)}
          placeholder="np. {zdrowie.max} * 2 + {ochrona}"
        />
      </Labeled>
      <p className="text-[length:--fs-meta] text-muted-foreground">
        Wstaw pole w nawiasach klamrowych. Operatory: + − * / i nawiasy. Funkcje: floor(), ceil(), abs().
      </p>
      {refs.length > 0 && (
        <details className="text-[length:--fs-meta]">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Dostępne pola</summary>
          <ul className="mt-1 space-y-0.5 pl-2">
            {refs.map((r) => (
              <li key={r.token}>
                <button
                  type="button"
                  className="font-mono text-primary hover:underline"
                  onClick={() => onChange(formula + r.token)}
                >
                  {r.token}
                </button>
                <span className="ml-1.5 text-muted-foreground">{r.label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function AddRow({
  placeholder,
  value,
  onValue,
  onAdd,
  children,
}: {
  placeholder: string;
  value: string;
  onValue: (next: string) => void;
  onAdd: () => void;
  children?: React.ReactNode;
}) {
  const disabled = !value.trim();
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onAdd();
      }}
    >
      <input className={cn(inputCls, "flex-1")} value={value} placeholder={placeholder} onChange={(e) => onValue(e.target.value)} />
      {children}
      <button type="submit" disabled={disabled} className={cn(iconBtn, "h-8 w-8 border border-input")} aria-label={placeholder}>
        <Plus className="h-4 w-4" />
      </button>
    </form>
  );
}
