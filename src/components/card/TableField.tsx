import { Trash2 } from "lucide-react";
import type { CellValue, ColumnDef, FieldDef, TableValue } from "@/lib/cardSchema";
import { newId } from "@/lib/cardSchema";
import { DiceInput } from "@/components/card/DiceInput";

/**
 * The one table renderer: a fixed grid (rows from the structure) or a
 * free-form entry list (rows added on the card) — the difference is data.
 */
export function TableField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: FieldDef;
  value: TableValue;
  onChange: (next: TableValue) => void;
  readOnly?: boolean;
}) {
  const columns = field.columns ?? [];
  const mode = field.rowMode ?? { kind: "dynamic" as const };
  const isFixed = mode.kind === "fixed";

  const rowLabel = (rowId: string): string | null =>
    isFixed ? (mode.rows.find((row) => row.id === rowId)?.label ?? rowId) : null;

  // A fixed table always shows the rows the structure declares, even if the
  // card was saved before that row existed.
  const rows = isFixed
    ? mode.rows.map(
        (row) => value.rows.find((existing) => existing.id === row.id) ?? { id: row.id, cells: {} },
      )
    : value.rows;

  const setCell = (rowId: string, columnId: string, cell: CellValue) => {
    const next = rows.map((row) =>
      row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: cell } } : row,
    );
    onChange({ rows: next });
  };

  const addRow = () => onChange({ rows: [...rows, { id: newId(), cells: {} }] });
  const removeRow = (rowId: string) => onChange({ rows: rows.filter((row) => row.id !== rowId) });

  const showActions = !isFixed && !readOnly;

  return (
    <div className="paper-table-wrap">
      <table className="paper-table">
        <thead>
          <tr>
            {isFixed && <th />}
            {columns.map((column) => (
              <th key={column.id} className={column.type === "checkbox" ? "col-check" : undefined}>
                {column.name}
              </th>
            ))}
            {showActions && <th className="w-12" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="paper-empty">
                Brak wpisów
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              {isFixed && <th className="paper-row-head">{rowLabel(row.id)}</th>}
              {columns.map((column) => (
                <td key={column.id} className={column.type === "checkbox" ? "col-check" : undefined}>
                  <CellInput
                    column={column}
                    value={row.cells[column.id]}
                    onChange={(cell) => setCell(row.id, column.id, cell)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
              {showActions && (
                <td>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="paper-icon-btn"
                    aria-label="Usuń wiersz"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!isFixed && !readOnly && (
        <button type="button" onClick={addRow} className="paper-add-btn">
          {mode.kind === "dynamic" ? (mode.addLabel ?? "Dodaj wiersz") : "Dodaj wiersz"}
        </button>
      )}
    </div>
  );
}

function CellInput({
  column,
  value,
  onChange,
  readOnly,
}: {
  column: ColumnDef;
  value: CellValue | undefined;
  onChange: (next: CellValue) => void;
  readOnly?: boolean;
}) {
  if (column.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
        className="paper-checkbox"
        aria-label={column.name}
      />
    );
  }

  if (column.type === "select") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="paper-input paper-input-cell"
        aria-label={column.name}
      >
        <option value="" />
        {(column.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "dice") {
    return (
      <DiceInput
        label={column.name}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        readOnly={readOnly}
        className="paper-input paper-input-cell"
      />
    );
  }

  const isNumber = column.type === "number";
  return (
    <input
      type={isNumber ? "number" : "text"}
      inputMode={isNumber ? "numeric" : undefined}
      value={value === undefined || typeof value === "boolean" ? "" : String(value)}
      readOnly={readOnly}
      onChange={(e) => onChange(isNumber && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
      className="paper-input paper-input-cell"
      aria-label={column.name}
    />
  );
}
