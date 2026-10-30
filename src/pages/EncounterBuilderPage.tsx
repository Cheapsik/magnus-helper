import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent } from "@/components/ui/card";
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

function Picker({ title, cards, picks, onChange }: { title: string; cards: Card[]; picks: Picks; onChange: (p: Picks) => void }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {cards.length === 0 && <p className="text-sm text-muted-foreground">Brak kart.</p>}
      {cards.map((card) => {
        const n = picks[card.id] ?? 0;
        const set = (v: number) => {
          const next = { ...picks };
          if (v > 0) next[card.id] = v;
          else delete next[card.id];
          onChange(next);
        };
        return (
          <div key={card.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{cardTitle(card)}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" aria-label="Mniej" disabled={!n} onClick={() => set(n - 1)}>-</Button>
              <span className="w-6 text-center">{n}</span>
              <Button size="sm" variant="outline" aria-label="Więcej" onClick={() => set(n + 1)}>+</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Side({ title, s }: { title: string; s: SideStats }) {
  return (
    <UiCard>
      <CardContent className="space-y-1 pt-4">
        <h3 className="font-semibold">{title}</h3>
        <p>Uczestnicy: {s.count}</p>
        <p>Suma PŻ: {s.hp}</p>
        <p>Średni atak: {s.avgAttack.toFixed(1)}</p>
      </CardContent>
    </UiCard>
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

  const b = calculateEncounterBalance(system.cards.hero, system.cards.monster, heroes, monsters, { party, enemies });

  const save = () => {
    setPresets((p) => [...p, { id: newId(), name: name.trim() || "Spotkanie", party, enemies }]);
    setName("");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <div className="grid gap-6 md:grid-cols-2">
        <Picker title="Drużyna (bohaterowie)" cards={heroes} picks={party} onChange={setParty} />
        <Picker title="Przeciwnicy (bestiariusz)" cards={monsters} picks={enemies} onChange={setEnemies} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Side title="Drużyna" s={b.party} />
        <Side title="Przeciwnicy" s={b.enemies} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span>Ekonomia akcji (wrogowie : drużyna): {b.actionRatio === null ? "-" : b.actionRatio.toFixed(2)}</span>
        {b.verdict ? (
          <Badge className="text-base">{b.verdict}</Badge>
        ) : (
          <span className="text-muted-foreground">Wybierz obie strony, aby ocenić spotkanie.</span>
        )}
      </div>

      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa spotkania" />
        <Button onClick={save} disabled={!b.party.count && !b.enemies.count}>Zapisz spotkanie</Button>
      </div>

      {presets.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Zapisane spotkania</h2>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span>{p.name}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setParty(p.party); setEnemies(p.enemies); }}>Wczytaj</Button>
                <Button size="sm" variant="outline" onClick={() => setPresets((all) => all.filter((x) => x.id !== p.id))}>Usuń</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
