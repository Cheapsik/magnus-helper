import type { StatRow, StatRow2 } from "../types";

export function StatTable<T extends StatRow | StatRow2>({
  cols,
  rows,
  onChange,
}: {
  cols: { key: keyof T; label: string }[];
  rows: { p: T; s: T; a: T };
  onChange: (rowKey: "p" | "s" | "a", colKey: keyof T, val: string) => void;
}) {
  const rowDefs: { key: "p" | "s" | "a"; label: string; bold?: boolean }[] = [
    { key: "p", label: "Początkowa" },
    { key: "s", label: "Schemat rozwoju" },
    { key: "a", label: "Aktualna", bold: true },
  ];
  return (
    <div className="paper-table-wrap">
      <table className="paper-table">
        <thead>
          <tr>
            <th></th>
            {cols.map((c) => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((r) => (
            <tr key={r.key}>
              <th className="paper-row-head">{r.label}</th>
              {cols.map((c) => (
                <td key={String(c.key)}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={(rows[r.key][c.key] as unknown as string) ?? ""}
                    onChange={(e) => onChange(r.key, c.key, e.target.value)}
                    className={"paper-input paper-input-cell " + (r.bold ? "font-bold" : "")}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
