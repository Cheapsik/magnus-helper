import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { cardTitle, newId, type Card as GameCard } from "@/lib/cardSchema";
import type { Clock } from "@/lib/clocks";
import { reputationTier, reputationValue, type Faction, type ReputationTier } from "@/lib/factions";
import type { NamedNoteSession } from "@/lib/sessionNoteModel";

type Props = {
  faction: Faction;
  others: Faction[];
  ladder: ReputationTier[];
  npcs: GameCard[];
  heroes: GameCard[];
  clocks: Clock[];
  sessions: NamedNoteSession[];
  activeSessionId: string;
  onChange: (patch: Partial<Faction>) => void;
  onDelete: () => void;
};

const SELECT_CLASS = "h-8 rounded-md border border-input bg-background px-2 text-sm";
const PARTY = "";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function FactionCard({ faction, others, ladder, npcs, heroes, clocks, sessions, activeSessionId, onChange, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(PARTY);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const [sessionId, setSessionId] = useState(activeSessionId);

  const tierLabel = (value: number) => `${signed(value)} · ${reputationTier(value, ladder)?.name || "—"}`;
  const partyValue = reputationValue(faction.log);
  const trackedHeroes = heroes.filter((h) => faction.log.some((c) => c.heroId === h.id));
  const nameOf = (cards: GameCard[], id: string | undefined) => {
    const card = cards.find((c) => c.id === id);
    return card ? cardTitle(card) : "(usunięta karta)";
  };

  const addChange = () => {
    if (!delta) return;
    const change = {
      id: newId(),
      delta,
      reason: reason.trim(),
      sessionId: sessionId || undefined,
      heroId: target || undefined,
      timestamp: Date.now(),
    };
    onChange({ log: [...faction.log, change] });
    setReason("");
  };

  return (
    <Card style={{ borderLeftColor: faction.color, borderLeftWidth: 4 }}>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={open ? "Zwiń" : "Rozwiń"} onClick={() => setOpen(!open)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <button type="button" className="flex-1 truncate text-left font-medium" onClick={() => setOpen(!open)}>
            {faction.name || "Bez nazwy"}
          </button>
          <span className="shrink-0 text-xs text-muted-foreground">{tierLabel(partyValue)}</span>
        </div>

        {open && (
          <>
            <div className="flex items-center gap-2">
              <Input className="h-8 flex-1" value={faction.name} placeholder="Nazwa frakcji" onChange={(e) => onChange({ name: e.target.value })} />
              <input
                type="color"
                aria-label="Kolor frakcji"
                className="h-8 w-10 cursor-pointer rounded border border-input bg-background p-0"
                value={faction.color}
                onChange={(e) => onChange({ color: e.target.value })}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Usuń frakcję" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea rows={2} value={faction.description} placeholder="Krótki opis" onChange={(e) => onChange({ description: e.target.value })} />
            <Input className="h-8" value={faction.goal ?? ""} placeholder="Cel frakcji (opcjonalnie)" onChange={(e) => onChange({ goal: e.target.value || undefined })} />

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Zegar postępu
              <select
                className={SELECT_CLASS}
                value={faction.clockId ?? ""}
                onChange={(e) => onChange({ clockId: e.target.value || undefined })}
              >
                <option value="">Brak</option>
                {clocks.map((c) => <option key={c.id} value={c.id}>{c.name || "Bez nazwy"} ({c.filled}/{c.segments})</option>)}
              </select>
            </label>

            <section className="space-y-1.5">
              <label className="field-label block">Członkowie</label>
              <div className="flex flex-wrap gap-1.5">
                {faction.memberIds.map((id) => (
                  <span key={id} className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
                    {nameOf(npcs, id)}
                    <button type="button" aria-label="Usuń członka" onClick={() => onChange({ memberIds: faction.memberIds.filter((m) => m !== id) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                className={SELECT_CLASS}
                value=""
                aria-label="Dodaj członka"
                onChange={(e) => e.target.value && onChange({ memberIds: [...faction.memberIds, e.target.value] })}
              >
                <option value="">+ Dodaj NPC…</option>
                {npcs.filter((n) => !faction.memberIds.includes(n.id)).map((n) => (
                  <option key={n.id} value={n.id}>{cardTitle(n)}</option>
                ))}
              </select>
            </section>

            <section className="space-y-1.5">
              <label className="field-label block">Reputacja</label>
              <div className="space-y-0.5 text-sm">
                <div className="flex justify-between"><span>Drużyna</span><span className="font-medium">{tierLabel(partyValue)}</span></div>
                {trackedHeroes.map((h) => (
                  <div key={h.id} className="flex justify-between">
                    <span>{cardTitle(h)}</span>
                    <span className="font-medium">{tierLabel(reputationValue(faction.log, h.id))}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className={SELECT_CLASS} value={target} aria-label="Czyja reputacja" onChange={(e) => setTarget(e.target.value)}>
                  <option value={PARTY}>Drużyna</option>
                  {heroes.map((h) => <option key={h.id} value={h.id}>{cardTitle(h)}</option>)}
                </select>
                <NumberInput className="h-8 w-16" aria-label="Zmiana" value={delta} onChange={(v) => setDelta(Math.round(v))} />
                <select className={SELECT_CLASS} value={sessionId} aria-label="Sesja" onChange={(e) => setSessionId(e.target.value)}>
                  <option value="">Bez sesji</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-8 flex-1"
                  value={reason}
                  placeholder="Powód zmiany"
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChange()}
                />
                <Button size="sm" onClick={addChange} disabled={!delta}>Zapisz</Button>
              </div>
            </section>

            {faction.log.length > 0 && (
              <section className="space-y-1">
                <label className="field-label block">Historia</label>
                {[...faction.log].reverse().map((c) => (
                  <div key={c.id} className="flex items-baseline gap-2 text-xs">
                    <span className={`w-8 shrink-0 font-bold ${c.delta > 0 ? "text-primary" : "text-destructive"}`}>{signed(c.delta)}</span>
                    <span className="flex-1">
                      {c.heroId ? nameOf(heroes, c.heroId) : "Drużyna"}
                      {c.reason && ` — ${c.reason}`}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {sessions.find((s) => s.id === c.sessionId)?.name ?? ""} {new Date(c.timestamp).toLocaleDateString("pl-PL")}
                    </span>
                    <button type="button" aria-label="Usuń wpis" onClick={() => onChange({ log: faction.log.filter((x) => x.id !== c.id) })}>
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </section>
            )}

            {others.length > 0 && (
              <section className="space-y-1">
                <label className="field-label block">Stosunek do innych frakcji</label>
                {others.map((o) => {
                  const value = faction.relations[o.id] ?? 0;
                  return (
                    <div key={o.id} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />
                      <span className="flex-1 truncate">{o.name || "Bez nazwy"}</span>
                      <span className="text-xs text-muted-foreground">{reputationTier(value, ladder)?.name}</span>
                      <NumberInput
                        className="h-8 w-16"
                        aria-label={`Stosunek do: ${o.name}`}
                        value={value}
                        onChange={(v) => onChange({ relations: { ...faction.relations, [o.id]: Math.round(v) } })}
                      />
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
