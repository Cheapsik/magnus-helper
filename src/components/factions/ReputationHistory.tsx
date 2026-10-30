import { X } from "lucide-react";
import { cardTitle, type Card as GameCard } from "@/lib/cardSchema";
import type { ReputationChange } from "@/lib/factions";
import type { NamedNoteSession } from "@/lib/sessionNoteModel";

type Props = {
  log: ReputationChange[];
  heroes: GameCard[];
  sessions: NamedNoteSession[];
  onRemove: (id: string) => void;
};

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function ReputationHistory({ log, heroes, sessions, onRemove }: Props) {
  if (log.length === 0) return null;
  const heroName = (id: string) => {
    const h = heroes.find((c) => c.id === id);
    return h ? cardTitle(h) : "(usunięta karta)";
  };
  return (
    <section className="space-y-1">
      <label className="field-label block">Historia</label>
      {[...log].sort((a, b) => b.timestamp - a.timestamp).map((c) => (
        <div key={c.id} className="flex items-baseline gap-2 text-xs">
          <span className={`w-8 shrink-0 font-bold ${c.delta > 0 ? "text-primary" : "text-destructive"}`}>{signed(c.delta)}</span>
          <span className="flex-1">
            {c.heroId ? heroName(c.heroId) : "Drużyna"}
            {c.reason && ` — ${c.reason}`}
          </span>
          <span className="shrink-0 text-muted-foreground">
            {sessions.find((s) => s.id === c.sessionId)?.name ?? ""} {new Date(c.timestamp).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
          </span>
          <button type="button" aria-label="Usuń wpis" onClick={() => onRemove(c.id)}>
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ))}
    </section>
  );
}
