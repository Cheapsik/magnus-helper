import { Check } from "lucide-react";
import type { Card } from "@/lib/cardSchema";
import { secretName, type Knowledge, type Secret } from "@/lib/secrets";

/** Heroes in rows, secrets in columns; click a cell to toggle whether the hero knows it. */
export function KnowledgeMatrix({
  heroes, secrets, knowledge, onToggle,
}: {
  heroes: Card[];
  secrets: Secret[];
  knowledge: Knowledge;
  onToggle: (secretId: string, heroId: string, known: boolean) => void;
}) {
  if (!heroes.length || !secrets.length) {
    return <p className="text-sm text-muted-foreground">Dodaj bohaterów i sekrety, aby zobaczyć tablicę wiedzy.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left">Bohater</th>
            {secrets.map((s) => (
              <th key={s.id} className="p-2 text-left font-medium max-w-[10rem] align-bottom">{secretName(s)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heroes.map((h) => (
            <tr key={h.id} className="border-t">
              <td className="p-2 font-medium whitespace-nowrap">{h.name}</td>
              {secrets.map((s) => {
                const entry = knowledge[s.id]?.[h.id];
                return (
                  <td key={s.id} className="p-1 text-center">
                    <button
                      type="button"
                      aria-pressed={!!entry}
                      aria-label={`${h.name}: ${secretName(s)} — ${entry ? "zna" : "nie zna"}`}
                      title={entry ? `${new Date(entry.at).toLocaleString("pl-PL")}${entry.how ? ` — ${entry.how}` : ""}` : "Nieznany"}
                      onClick={() => onToggle(s.id, h.id, !entry)}
                      className={`h-8 w-8 rounded border inline-flex items-center justify-center ${entry ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {entry ? <Check className="h-4 w-4" /> : "?"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
