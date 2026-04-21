import { Trash2 } from "lucide-react";
import type { Umiejetnosc } from "../types";
import { newId } from "../factory";

export function SkillsTable({
  rows,
  onChange,
  allowAdd,
}: {
  rows: Umiejetnosc[];
  onChange: (rows: Umiejetnosc[]) => void;
  allowAdd: boolean;
}) {
  const update = (id: string, patch: Partial<Umiejetnosc>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const add = () =>
    onChange([
      ...rows,
      { id: newId(), nazwa: "", wykupione: false, plus10: false, plus20: false, zdolnosci: "" },
    ]);

  return (
    <div className="paper-table-wrap">
      <table className="paper-table paper-table-skills">
        <thead>
          <tr>
            <th className="text-left">Umiejętność</th>
            <th className="col-check" title="Wykupione">
              W
            </th>
            <th className="col-check">+10</th>
            <th className="col-check">+20</th>
            <th className="text-left">Zdolności pokrewne</th>
            {allowAdd && <th className="col-check"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={allowAdd ? 6 : 5} className="paper-empty">
                Brak umiejętności
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="text"
                  value={r.nazwa}
                  onChange={(e) => update(r.id, { nazwa: e.target.value })}
                  className="paper-input paper-input-cell text-left"
                />
              </td>
              <td className="col-check">
                <input
                  type="checkbox"
                  checked={r.wykupione}
                  onChange={(e) => update(r.id, { wykupione: e.target.checked })}
                  className="paper-checkbox"
                />
              </td>
              <td className="col-check">
                <input
                  type="checkbox"
                  checked={r.plus10}
                  onChange={(e) => update(r.id, { plus10: e.target.checked })}
                  className="paper-checkbox"
                />
              </td>
              <td className="col-check">
                <input
                  type="checkbox"
                  checked={r.plus20}
                  onChange={(e) => update(r.id, { plus20: e.target.checked })}
                  className="paper-checkbox"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={r.zdolnosci}
                  onChange={(e) => update(r.id, { zdolnosci: e.target.value })}
                  className="paper-input paper-input-cell text-left"
                />
              </td>
              {allowAdd && (
                <td>
                  <button type="button" onClick={() => remove(r.id)} className="paper-icon-btn" aria-label="Usuń">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {allowAdd && (
        <button type="button" onClick={add} className="paper-add-btn min-h-[44px]">
          + Dodaj umiejętność
        </button>
      )}
    </div>
  );
}
