import { useState } from "react";
import { Users, Plus, Trash2, Edit2, Check, X, Dice5, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { SavedNpc } from "@/context/AppContext";
import { rollDie } from "@/lib/dice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";

const NPC_NAMES = [
  "Brunhilde Weissmann", "Kaspar Hecht", "Gretchen Müller", "Albrecht Stahl",
  "Elsbeth Krause", "Dieter Fuchs", "Hilda Brandt", "Wolfgang Eisenberg",
  "Magda Schneider", "Fritz Hammerschmidt", "Ottilie Wirth", "Heinrich Voss",
  "Kunigunde Asche", "Sigmund Rauchfang", "Liesel Dunkel", "Ruprecht Grau",
];

const NPC_TRAITS = [
  "podejrzliwy", "gadatliwy", "milczący", "nerwowy", "chciwy",
  "uprzejmy", "agresywny", "pijany", "religijny", "przebiegły",
  "tchórzliwy", "honorowy", "skąpy", "hojny", "paranoiczny",
];

const NPC_OCCUPATIONS = [
  "Kupiec", "Żołnierz", "Kapłan", "Złodziej", "Rzemieślnik",
  "Szlachcic", "Chłop", "Łowca", "Cyrkowiec", "Żebrak",
  "Strażnik", "Mag", "Kowal", "Karczmarz", "Medyk",
];

const PRIMARY_STATS = ["ww", "us", "s", "wt", "zr", "int", "sw", "ogd"] as const;
const SECONDARY_STATS = ["a", "sz", "mag", "po", "pp"] as const;
const SECONDARY_LABELS: Record<string, string> = { a: "A", sz: "Sz", mag: "Mag", po: "PO", pp: "PP" };

function generateRandomNpc(): Omit<SavedNpc, "id"> {
  const name = NPC_NAMES[rollDie(NPC_NAMES.length) - 1];
  const trait1 = NPC_TRAITS[rollDie(NPC_TRAITS.length) - 1];
  let trait2 = NPC_TRAITS[rollDie(NPC_TRAITS.length) - 1];
  while (trait2 === trait1) trait2 = NPC_TRAITS[rollDie(NPC_TRAITS.length) - 1];
  const occupation = NPC_OCCUPATIONS[rollDie(NPC_OCCUPATIONS.length) - 1];

  return {
    name, occupation, traits: `${trait1}, ${trait2}`, description: "",
    ww: 20 + rollDie(20), us: 15 + rollDie(20), s: 20 + rollDie(20), wt: 20 + rollDie(20),
    zr: 20 + rollDie(20), int: 20 + rollDie(20), sw: 20 + rollDie(20), ogd: 20 + rollDie(20),
    a: 1, sz: 4, mag: 0, po: 0, pp: rollDie(3) - 1,
    hp: 8 + rollDie(6), armor: rollDie(3) - 1, weapon: "", notes: "",
  };
}

const EMPTY_NPC: Omit<SavedNpc, "id"> = {
  name: "", occupation: "", traits: "", description: "",
  ww: 30, us: 25, s: 30, wt: 30, zr: 30, int: 30, sw: 30, ogd: 25,
  a: 1, sz: 4, mag: 0, po: 0, pp: 0,
  hp: 10, armor: 0, weapon: "", notes: "",
};

/* ── NPC Form (defined outside to avoid remount on parent re-render) ── */

function NpcForm({ data, onChange, onSave, onCancel }: {
  data: Omit<SavedNpc, "id"> | SavedNpc;
  onChange: (d: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <Input value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} placeholder="Imię" className="h-8 text-xs" />
        <Input value={data.occupation} onChange={(e) => onChange({ ...data, occupation: e.target.value })} placeholder="Profesja" className="h-8 text-xs" />
      </div>
      <Input value={data.traits} onChange={(e) => onChange({ ...data, traits: e.target.value })} placeholder="Cechy charakteru" className="h-8 text-xs" />

      <label className="text-[10px] text-muted-foreground font-medium block mt-1">Cechy główne</label>
      <div className="grid grid-cols-4 gap-1">
        {PRIMARY_STATS.map((stat) => (
          <div key={stat}>
            <label className="text-[9px] text-muted-foreground uppercase">{stat}</label>
            <NumberInput value={data[stat]} onChange={(v) => onChange({ ...data, [stat]: v })} className="h-7 text-xs text-center" />
          </div>
        ))}
      </div>

      <label className="text-[10px] text-muted-foreground font-medium block mt-1">Cechy drugorzędne</label>
      <div className="grid grid-cols-5 gap-1">
        {SECONDARY_STATS.map((stat) => (
          <div key={stat}>
            <label className="text-[9px] text-muted-foreground uppercase">{SECONDARY_LABELS[stat]}</label>
            <NumberInput value={data[stat]} onChange={(v) => onChange({ ...data, [stat]: v })} className="h-7 text-xs text-center" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div><label className="text-[9px] text-muted-foreground">PŻ</label><NumberInput value={data.hp} onChange={(v) => onChange({ ...data, hp: v })} min={1} className="h-7 text-xs text-center" /></div>
        <div><label className="text-[9px] text-muted-foreground">Pancerz</label><NumberInput value={data.armor} onChange={(v) => onChange({ ...data, armor: v })} className="h-7 text-xs text-center" /></div>
      </div>
      <Input value={data.weapon} onChange={(e) => onChange({ ...data, weapon: e.target.value })} placeholder="Broń / ekwipunek" className="h-8 text-xs" />
      <Textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder="Opis / wygląd / historia…" rows={3} className="text-xs min-h-[60px]" />
      <Textarea value={data.notes} onChange={(e) => onChange({ ...data, notes: e.target.value })} placeholder="Notatki MG…" rows={2} className="text-xs min-h-[40px]" />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={onSave}><Check className="h-3 w-3" />Zapisz</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Anuluj</Button>
      </div>
    </div>
  );
}

export default function NpcManagerPage() {
  const { savedNpcs, setSavedNpcs, setCombatants } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SavedNpc | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newNpc, setNewNpc] = useState<Omit<SavedNpc, "id">>({ ...EMPTY_NPC });

  const handleGenerate = () => { setNewNpc(generateRandomNpc()); setAdding(true); };

  const addNpc = () => {
    if (!newNpc.name.trim()) return;
    setSavedNpcs((prev) => [...prev, { ...newNpc, id: crypto.randomUUID() }]);
    setNewNpc({ ...EMPTY_NPC });
    setAdding(false);
  };

  const startEdit = (npc: SavedNpc) => { setEditingId(npc.id); setEditDraft({ ...npc }); };
  const saveEdit = () => {
    if (!editDraft) return;
    setSavedNpcs((prev) => prev.map((n) => n.id === editDraft.id ? editDraft : n));
    setEditingId(null); setEditDraft(null);
  };

  const removeNpc = (id: string) => setSavedNpcs((prev) => prev.filter((n) => n.id !== id));

  const addToCombat = (npc: SavedNpc) => {
    setCombatants((prev) => [...prev, {
      id: crypto.randomUUID(), name: npc.name, initiative: npc.zr,
      ww: npc.ww, us: npc.us, sb: Math.floor(npc.s / 10),
      hp: { current: npc.hp, max: npc.hp }, armor: npc.armor, toughness: Math.floor(npc.wt / 10),
      statuses: [], notes: npc.weapon || npc.traits, isEnemy: true,
    }]);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5" />NPC</h1>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={handleGenerate}>
            <Dice5 className="h-3 w-3" /> Losuj
          </Button>
          <Button size="sm" className="text-xs gap-1 h-7" onClick={() => { setNewNpc({ ...EMPTY_NPC }); setAdding(true); }}>
            <Plus className="h-3 w-3" /> Nowy
          </Button>
        </div>
      </div>

      {adding && (
        <Card className="border-primary/30">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-2">Nowy NPC</h3>
            <NpcForm data={newNpc} onChange={setNewNpc} onSave={addNpc} onCancel={() => setAdding(false)} />
          </CardContent>
        </Card>
      )}

      {savedNpcs.length === 0 && !adding && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Brak zapisanych NPC. Użyj „Losuj" lub „Nowy" aby dodać.</CardContent></Card>
      )}

      <div className="space-y-2">
        {savedNpcs.map((npc) => {
          const isEditing = editingId === npc.id;
          const isExpanded = expandedId === npc.id;

          return (
            <Card key={npc.id}>
              <CardContent className="p-3">
                {isEditing ? (
                  <NpcForm data={editDraft!} onChange={setEditDraft} onSave={saveEdit} onCancel={() => { setEditingId(null); setEditDraft(null); }} />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm">{npc.name}</span>
                        {npc.occupation && <span className="text-xs text-muted-foreground ml-2">· {npc.occupation}</span>}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(npc)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeNpc(npc.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>

                    {npc.traits && <p className="text-xs text-muted-foreground mt-0.5 italic">{npc.traits}</p>}

                    {/* Primary stats summary */}
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
                      {PRIMARY_STATS.map((stat) => (
                        <span key={stat} className="text-muted-foreground">{stat.toUpperCase()} <span className="font-bold text-foreground">{npc[stat]}</span></span>
                      ))}
                    </div>

                    {/* Secondary stats summary */}
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px]">
                      {SECONDARY_STATS.map((stat) => (
                        <span key={stat} className="text-muted-foreground">{SECONDARY_LABELS[stat]} <span className="font-bold text-foreground">{npc[stat]}</span></span>
                      ))}
                      <span className="text-muted-foreground">PŻ <span className="font-bold text-foreground">{npc.hp}</span></span>
                      <span className="text-muted-foreground">Pnc <span className="font-bold text-foreground">{npc.armor}</span></span>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : npc.id)}
                      className="w-full flex items-center justify-center py-1 mt-1 text-muted-foreground hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-1 border-t border-border/50">
                        <label className="text-[10px] text-muted-foreground font-medium">Cechy główne</label>
                        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                          {PRIMARY_STATS.map((stat) => (
                            <div key={stat} className="text-center bg-muted rounded px-1 py-1">
                              <div className="text-muted-foreground uppercase">{stat}</div>
                              <div className="font-bold text-sm">{npc[stat]}</div>
                            </div>
                          ))}
                        </div>

                        <label className="text-[10px] text-muted-foreground font-medium">Cechy drugorzędne</label>
                        <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                          {SECONDARY_STATS.map((stat) => (
                            <div key={stat} className="text-center bg-muted rounded px-1 py-1">
                              <div className="text-muted-foreground uppercase">{SECONDARY_LABELS[stat]}</div>
                              <div className="font-bold text-sm">{npc[stat]}</div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div className="text-center bg-muted rounded px-1 py-1">
                            <div className="text-muted-foreground">PŻ</div>
                            <div className="font-bold text-sm">{npc.hp}</div>
                          </div>
                          <div className="text-center bg-muted rounded px-1 py-1">
                            <div className="text-muted-foreground">Pancerz</div>
                            <div className="font-bold text-sm">{npc.armor}</div>
                          </div>
                        </div>

                        {npc.weapon && <div><label className="text-[10px] text-muted-foreground">Broń:</label><p className="text-xs">{npc.weapon}</p></div>}
                        {npc.description && <div><label className="text-[10px] text-muted-foreground">Opis:</label><p className="text-xs text-muted-foreground whitespace-pre-line">{npc.description}</p></div>}
                        {npc.notes && <div><label className="text-[10px] text-muted-foreground">Notatki MG:</label><p className="text-xs text-muted-foreground whitespace-pre-line">{npc.notes}</p></div>}

                        <Button size="sm" variant="secondary" className="w-full h-7 text-xs gap-1" onClick={() => addToCombat(npc)}>
                          + Dodaj do walki
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}