import { useState } from "react";
import { Wrench, Skull, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { GmEnemy } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { useNavigate } from "react-router-dom";

export default function GmToolboxPage() {
  const { gmEnemies, setGmEnemies, setCombatants, difficultyPresets, setDifficultyPresets } = useApp();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GmEnemy | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEnemy, setNewEnemy] = useState<GmEnemy>({ id: "", name: "", ww: 30, hp: 8, armor: 0, weapon: "" });

  // Difficulty editing
  const [editingDiffIdx, setEditingDiffIdx] = useState<number | null>(null);
  const [diffDraft, setDiffDraft] = useState<{ labelPl: string; modifier: number }>({ labelPl: "", modifier: 0 });

  const startEdit = (e: GmEnemy) => { setEditingId(e.id); setEditDraft({ ...e }); };
  const saveEdit = () => {
    if (!editDraft) return;
    setGmEnemies((prev) => prev.map((e) => e.id === editDraft.id ? editDraft : e));
    setEditingId(null); setEditDraft(null);
  };

  const removeEnemy = (id: string) => setGmEnemies((prev) => prev.filter((e) => e.id !== id));

  const addEnemy = () => {
    if (!newEnemy.name.trim()) return;
    setGmEnemies((prev) => [...prev, { ...newEnemy, id: crypto.randomUUID() }]);
    setNewEnemy({ id: "", name: "", ww: 30, hp: 8, armor: 0, weapon: "" });
    setAdding(false);
  };

  const addToCombat = (enemy: GmEnemy) => {
    setCombatants((prev) => [...prev, {
      id: crypto.randomUUID(), name: enemy.name, initiative: enemy.ww,
      ww: enemy.ww, us: 20, sb: Math.floor(enemy.ww / 10),
      hp: { current: enemy.hp, max: enemy.hp }, armor: enemy.armor, toughness: 3,
      statuses: [], notes: enemy.weapon, isEnemy: true,
    }]);
  };

  const startDiffEdit = (idx: number) => {
    setEditingDiffIdx(idx);
    setDiffDraft({ labelPl: difficultyPresets[idx].labelPl, modifier: difficultyPresets[idx].modifier });
  };

  const saveDiffEdit = () => {
    if (editingDiffIdx === null) return;
    setDifficultyPresets((prev) => prev.map((d, i) => i === editingDiffIdx ? { ...d, labelPl: diffDraft.labelPl, modifier: diffDraft.modifier } : d));
    setEditingDiffIdx(null);
  };

  const addDiffPreset = () => {
    setDifficultyPresets((prev) => [...prev, { label: `custom-${Date.now()}`, labelPl: "Nowy poziom", modifier: 0 }]);
  };

  const removeDiffPreset = (idx: number) => {
    setDifficultyPresets((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold flex items-center gap-2"><Wrench className="h-5 w-5" />Skrzynka MG</h1>

      {/* Quick link to NPC manager */}
      <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/npcs")}>
        Zarządzaj NPC →
      </Button>

      {/* Editable difficulty presets */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poziomy trudności</label>
          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addDiffPreset}><Plus className="h-3 w-3" />Dodaj</Button>
        </div>
        <div className="space-y-1">
          {difficultyPresets.map((d, idx) => (
            editingDiffIdx === idx ? (
              <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border">
                <Input value={diffDraft.labelPl} onChange={(e) => setDiffDraft({ ...diffDraft, labelPl: e.target.value })} className="h-7 text-xs flex-1" />
                <NumberInput value={diffDraft.modifier} onChange={(v) => setDiffDraft({ ...diffDraft, modifier: v })} className="h-7 w-16 text-xs text-center" />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveDiffEdit}><Check className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingDiffIdx(null)}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <div key={idx} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-md bg-card border group">
                <span className="text-muted-foreground">{d.labelPl}</span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${d.modifier > 0 ? "text-success" : d.modifier < 0 ? "text-destructive" : "text-foreground"}`}>
                    {d.modifier > 0 ? `+${d.modifier}` : d.modifier}
                  </span>
                  <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startDiffEdit(idx)}>
                    <Edit2 className="h-2.5 w-2.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" onClick={() => removeDiffPreset(idx)}>
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Editable enemies */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Skull className="h-3 w-3 inline mr-1" />Gotowi przeciwnicy
          </label>
          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" />Dodaj
          </Button>
        </div>

        {adding && (
          <Card className="mb-2">
            <CardContent className="p-3 space-y-1.5">
              <Input value={newEnemy.name} onChange={(e) => setNewEnemy({ ...newEnemy, name: e.target.value })} placeholder="Nazwa" className="h-7 text-xs" />
              <div className="grid grid-cols-3 gap-1.5">
                <div><label className="text-[9px] text-muted-foreground">WW</label><NumberInput value={newEnemy.ww} onChange={(v) => setNewEnemy({ ...newEnemy, ww: v })} className="h-7 text-xs text-center" /></div>
                <div><label className="text-[9px] text-muted-foreground">PŻ</label><NumberInput value={newEnemy.hp} onChange={(v) => setNewEnemy({ ...newEnemy, hp: v })} className="h-7 text-xs text-center" /></div>
                <div><label className="text-[9px] text-muted-foreground">Pnc</label><NumberInput value={newEnemy.armor} onChange={(v) => setNewEnemy({ ...newEnemy, armor: v })} className="h-7 text-xs text-center" /></div>
              </div>
              <Input value={newEnemy.weapon} onChange={(e) => setNewEnemy({ ...newEnemy, weapon: e.target.value })} placeholder="Broń" className="h-7 text-xs" />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={addEnemy}>Dodaj</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {gmEnemies.map((enemy) => {
            const isEditing = editingId === enemy.id;
            const d = isEditing ? editDraft! : enemy;

            return (
              <Card key={enemy.id}>
                <CardContent className="p-3">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Input value={d.name} onChange={(e) => setEditDraft({ ...d, name: e.target.value })} className="h-7 text-xs" />
                      <div className="grid grid-cols-3 gap-1.5">
                        <div><label className="text-[9px] text-muted-foreground">WW</label><NumberInput value={d.ww} onChange={(v) => setEditDraft({ ...d, ww: v })} className="h-7 text-xs text-center" /></div>
                        <div><label className="text-[9px] text-muted-foreground">PŻ</label><NumberInput value={d.hp} onChange={(v) => setEditDraft({ ...d, hp: v })} className="h-7 text-xs text-center" /></div>
                        <div><label className="text-[9px] text-muted-foreground">Pnc</label><NumberInput value={d.armor} onChange={(v) => setEditDraft({ ...d, armor: v })} className="h-7 text-xs text-center" /></div>
                      </div>
                      <Input value={d.weapon} onChange={(e) => setEditDraft({ ...d, weapon: e.target.value })} className="h-7 text-xs" />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={saveEdit}><Check className="h-3 w-3" />Zapisz</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(null); setEditDraft(null); }}>Anuluj</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{enemy.name}</span>
                        <div className="flex items-center gap-0.5">
                          <div className="flex gap-2 text-xs mr-2">
                            <span className="text-muted-foreground">WW <span className="font-bold text-foreground">{enemy.ww}</span></span>
                            <span className="text-muted-foreground">PŻ <span className="font-bold text-foreground">{enemy.hp}</span></span>
                            <span className="text-muted-foreground">Pnc <span className="font-bold text-foreground">{enemy.armor}</span></span>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(enemy)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeEnemy(enemy.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">{enemy.weapon}</div>
                        <Button size="sm" variant="secondary" className="h-6 text-[10px] gap-1" onClick={() => addToCombat(enemy)}>+ Do walki</Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}