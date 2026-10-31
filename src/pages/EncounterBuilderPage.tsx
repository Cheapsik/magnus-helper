import { type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Minus, Plus, Swords, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cardToCombatant } from "@/lib/cardRoster";
import { MAX_COMBAT_FIGHTS, createEmptyFight } from "@/lib/combatSessions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type Card, cardTitle, newId } from "@/lib/cardSchema";
import { useCampaignSystem, useCards } from "@/lib/cardStore";
import {
  ENCOUNTER_PRESETS_KEY,
  type EncounterPreset,
  type Picks,
  type SideStats,
  calculateEncounterBalance,
} from "@/lib/encounterBuilder";

function Picker({ title, cards, picks, onChange, empty, allLabel }: {
  title: string; cards: Card[]; picks: Picks; onChange: (p: Picks) => void; empty: ReactNode; allLabel?: string;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <label className="field-label block">{title}</label>
        {allLabel && cards.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onChange(Object.fromEntries(cards.map((c) => [c.id, 1])))}>{allLabel}</Button>
        )}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-[--radius] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">Brak kart. {empty}</p>
      ) : (
        <ul className="surface divide-y divide-border border border-border">
          {cards.map((card) => {
            const n = picks[card.id] ?? 0;
            const set = (v: number) => {
              const next = { ...picks };
              if (v > 0) next[card.id] = v;
              else delete next[card.id];
              onChange(next);
            };
            return (
              <li key={card.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
                <span className={cn("min-w-0 flex-1 truncate font-display text-[length:--fs-section] font-medium", !n && "text-muted-foreground")}>{cardTitle(card)}</span>
                <div className="flex items-center gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label={`Mniej: ${cardTitle(card)}`} disabled={!n} onClick={() => set(n - 1)}><Minus /></Button>
                  <span className="readout min-w-[2ch] text-center">{n}</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Więcej: ${cardTitle(card)}`} onClick={() => set(n + 1)}><Plus /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="readout">{value}</span>
    </div>
  );
}

function Side({ title, s }: { title: string; s: SideStats }) {
  return (
    <div className="surface space-y-1 border border-border px-4 py-3">
      <label className="field-label block">{title}</label>
      <Stat label="Uczestnicy" value={s.count} />
      <Stat label="Suma PŻ" value={s.hp} />
      <Stat label="Średni atak" value={s.avgAttack.toFixed(1)} />
    </div>
  );
}

export default function EncounterBuilderPage() {
  const [system] = useCampaignSystem();
  const [heroes] = useCards("hero");
  const [monsters] = useCards("monster");
  const [presets, setPresets] = useLocalStorage<EncounterPreset[]>(ENCOUNTER_PRESETS_KEY, []);
  const [party, setParty] = useState<Picks>({});
  const [enemies, setEnemies] = useState<Picks>({});
  const [name, setName] = useState("");

  const { combatSessions, setCombatSessions } = useApp();
  const navigate = useNavigate();

  // Opens the encounter as a new fight in the tracker; repeated monsters get numbered names.
  const startFight = () => {
    if (combatSessions.fights.length >= MAX_COMBAT_FIGHTS) {
      toast.error(`Można prowadzić najwyżej ${MAX_COMBAT_FIGHTS} walk naraz. Zakończ którąś w trackerze.`);
      return;
    }
    const expand = (cards: Card[], picks: Picks, isEnemy: boolean) =>
      cards.flatMap((card) => {
        const n = picks[card.id] ?? 0;
        return Array.from({ length: n }, (_, i) => {
          const c = cardToCombatant(card, system.cards[isEnemy ? "monster" : "hero"], isEnemy);
          return n > 1 ? { ...c, name: `${c.name} ${i + 1}` } : c;
        });
      });
    const combatants = [...expand(heroes, party, false), ...expand(monsters, enemies, true)];
    setCombatSessions((prev) => createEmptyFight(prev, { id: "", name: name.trim(), combatants }));
    navigate("/combat");
  };

  const b = calculateEncounterBalance(system.cards.hero, system.cards.monster, heroes, monsters, { party, enemies });

  const save = () => {
    setPresets((p) => [...p, { id: newId(), name: name.trim() || "Spotkanie", party, enemies }]);
    setName("");
  };

  const empty = !b.party.count && !b.enemies.count;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid gap-5 md:grid-cols-2">
        <Picker title="Drużyna (bohaterowie)" allLabel="Wszyscy" cards={heroes} picks={party} onChange={setParty} empty={<Link to="/heroes" className="font-medium text-primary underline underline-offset-2">Dodaj bohaterów</Link>} />
        <Picker title="Przeciwnicy (bestiariusz)" cards={monsters} picks={enemies} onChange={setEnemies} empty={<Link to="/monsters" className="font-medium text-primary underline underline-offset-2">Dodaj potwory</Link>} />
      </div>

      <section className="space-y-1.5">
        <label className="field-label block">Ocena spotkania</label>
        <div className="grid gap-3 md:grid-cols-2">
          <Side title="Drużyna" s={b.party} />
          <Side title="Przeciwnicy" s={b.enemies} />
        </div>
        <div className="surface flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 border border-border px-4 py-2">
          <span className="text-sm text-muted-foreground">Akcje wrogów do drużyny</span>
          <span className="readout">{b.actionRatio === null ? "–" : b.actionRatio.toFixed(2)}</span>
          {b.verdict ? (
            <Badge className="text-base">{b.verdict}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Wybierz obie strony, aby ocenić spotkanie.</span>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa spotkania" className="min-w-48 flex-1" />
        <Button variant="outline" onClick={save} disabled={empty}>Zapisz spotkanie</Button>
        <Button onClick={startFight} disabled={empty}><Swords /> Rozpocznij walkę</Button>
      </div>

      {presets.length > 0 && (
        <section className="space-y-1.5">
          <label className="field-label block">Zapisane spotkania</label>
          <ul className="surface divide-y divide-border border border-border">
            {presets.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
                <span className="min-w-0 flex-1 truncate font-display text-[length:--fs-section] font-medium">{p.name}</span>
                <Button size="sm" variant="outline" onClick={() => { setParty(p.party); setEnemies(p.enemies); }}>Wczytaj</Button>
                <Button size="icon-sm" variant="ghost" className="hover:text-destructive" aria-label={`Usuń spotkanie ${p.name}`} onClick={() => setPresets((all) => all.filter((x) => x.id !== p.id))}><X /></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
