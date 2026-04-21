import { Trash2 } from "lucide-react";

export function DynTable<T extends { id: string }>({
  headers,
  rows,
  fields,
  onChange,
  addLabel,
  createRow,
}: {
  headers: string[];
  rows: T[];
  fields: (keyof T)[];
  onChange: (rows: T[]) => void;
  addLabel: string;
  createRow: () => T;
}) {
  const updateCell = (id: string, field: keyof T, val: string) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };
  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const addRow = () => onChange([...rows, createRow()]);

  return (
    <div className="paper-table-wrap">
      <table className="paper-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length + 1} className="paper-empty">
                Brak wpisów
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              {fields.map((f) => (
                <td key={String(f)}>
                  <input
                    type="text"
                    value={(r[f] as unknown as string) ?? ""}
                    onChange={(e) => updateCell(r.id, f, e.target.value)}
                    className="paper-input paper-input-cell"
                  />
                </td>
              ))}
              <td>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="paper-icon-btn"
                  aria-label="Usuń wiersz"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addRow} className="paper-add-btn min-h-[44px]">
        {addLabel}
      </button>
    </div>
  );
}
