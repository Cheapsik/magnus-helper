import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/number-input";
import { Heart, Shield, Swords, Minus, Plus, X, Edit2, Check, Trash2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CharacterData } from "@/data/character";
import { StatAbbrFromCharacterStat, StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";

export default function CharacterPage() {
  const { character, updateCharacter, inventory } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CharacterData>(character);
  const [newCondition, setNewCondition] = useState("");
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

  const startEdit = () => { setDraft({ ...character }); setEditing(true); };
  const handleSave = () => { updateCharacter(draft); setEditing(false); };
  const cancel = () => setEditing(false);

  const adjustWounds = (delta: number) => {
    const next = { ...character, wounds: { ...character.wounds, current: Math.max(0, Math.min(character.wounds.max, character.wounds.current + delta)) } };
    updateCharacter(next);
    if (editing) setDraft(next);
  };

  const removeCondition = (c: string) => {
    const next = { ...character, conditions: character.conditions.filter((x) => x !== c) };
    updateCharacter(next);
    if (editing) setDraft(next);
  };

  const addCondition = () => {
    if (!newCondition.trim()) return;
    const next = { ...character, conditions: [...character.conditions, newCondition.trim()] };
    updateCharacter(next);
    if (editing) setDraft(next);
    setNewCondition("");
  };

  const updateDraftWeapon = (i: number, field: string, value: string) => {
    const weapons = [...draft.weapons];
    weapons[i] = { ...weapons[i], [field]: value };
    setDraft({ ...draft, weapons });
  };
  const addWeapon = () => setDraft({ ...draft, weapons: [...draft.weapons, { name: "", damage: "", qualities: "" }] });
  const removeWeapon = (i: number) => setDraft({ ...draft, weapons: draft.weapons.filter((_, idx) => idx !== i) });

  const updateDraftArmor = (i: number, field: string, value: string | number) => {
    const armor = [...draft.armor];
    armor[i] = { ...armor[i], [field]: value };
    setDraft({ ...draft, armor });
  };
  const addArmor = () => setDraft({ ...draft, armor: [...draft.armor, { name: "", ap: 0, locations: "" }] });
  const removeArmor = (i: number) => setDraft({ ...draft, armor: draft.armor.filter((_, idx) => idx !== i) });

  const addEquipment = (item: string) => {
    if (!item.trim()) return;
    setDraft({ ...draft, equipment: [...draft.equipment, item.trim()] });
  };
  const removeEquipment = (i: number) => setDraft({ ...draft, equipment: draft.equipment.filter((_, idx) => idx !== i) });

  const addFromInventory = (itemName: string) => {
    if (editing) {
      setDraft({ ...draft, equipment: [...draft.equipment, itemName] });
    } else {
      updateCharacter({ ...character, equipment: [...character.equipment, itemName] });
    }
  };

  const woundPercent = (character.wounds.current / character.wounds.max) * 100;
  const data = editing ? draft : character;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-app-brand text-lg font-bold">Postać</h1>
        <div className="flex gap-1.5">
          {editing && <Button size="sm" variant="ghost" className="text-xs" onClick={cancel}>Anuluj</Button>}
          <Button size="sm" variant={editing ? "default" : "outline"} className="gap-1.5 text-xs" onClick={editing ? handleSave : startEdit}>
            {editing ? <Check className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
            {editing ? "Zapisz" : "Edytuj"}
          </Button>
        </div>
      </div>

      {/* Name & career */}
      <Card>
        <CardContent className="p-4">
          {editing ? (
            <div className="space-y-2">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Imię" className="font-semibold" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={draft.race} onChange={(e) => setDraft({ ...draft, race: e.target.value })} placeholder="Rasa" />
                <Input value={draft.career} onChange={(e) => setDraft({ ...draft, career: e.target.value })} placeholder="Profesja" />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-muted-foreground">{character.race} · {character.career}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wounds */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Żywotność</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => adjustWounds(-1)}><Minus className="h-3 w-3" /></Button>
              {editing ? (
                <div className="flex items-center gap-1">
                  <NumberInput value={draft.wounds.current} onChange={(v) => setDraft({ ...draft, wounds: { ...draft.wounds, current: v } })} className="h-7 w-12 text-center text-sm font-bold px-1" />
                  <span className="text-muted-foreground">/</span>
                  <NumberInput value={draft.wounds.max} onChange={(v) => setDraft({ ...draft, wounds: { ...draft.wounds, max: v } })} className="h-7 w-12 text-center text-sm font-bold px-1" />
                </div>
              ) : (
                <span className="text-lg font-bold min-w-[4ch] text-center">{character.wounds.current}/{character.wounds.max}</span>
              )}
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => adjustWounds(1)}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-300", woundPercent > 50 ? "bg-success" : woundPercent > 25 ? "bg-primary" : "bg-destructive")} style={{ width: `${woundPercent}%` }} />
          </div>
          {editing ? (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground">Punkty Przeznaczenia:</span>
              <NumberInput value={draft.fatePoints} onChange={(v) => setDraft({ ...draft, fatePoints: v })} className="h-6 w-12 text-center text-xs font-bold px-1" />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1.5">Punkty Przeznaczenia: {character.fatePoints}</div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Cechy główne</h3>
          <div className="grid grid-cols-4 gap-2">
            {data.stats.map((stat, i) => (
              <div key={stat.abbr} className="text-center bg-muted rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground font-medium">
                  <StatAbbrFromCharacterStat abbr={stat.abbr} label={stat.label} className="text-[10px] text-muted-foreground font-medium">
                    {stat.abbr}
                  </StatAbbrFromCharacterStat>
                </div>
                {editing ? (
                  <NumberInput value={draft.stats[i].value} onChange={(v) => {
                    const stats = [...draft.stats];
                    stats[i] = { ...stats[i], value: v };
                    setDraft({ ...draft, stats });
                  }} className="h-7 text-center text-sm font-bold px-1 mt-0.5" />
                ) : (
                  <div className="text-lg font-bold">{stat.value}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Stany</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {character.conditions.length === 0 && <span className="text-xs text-muted-foreground">Brak aktywnych stanów</span>}
            {character.conditions.map((c) => (
              <Badge key={c} variant="destructive" className="gap-1 text-xs">
                {c}<button onClick={() => removeCondition(c)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Dodaj stan…" value={newCondition} onChange={(e) => setNewCondition(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCondition()} className="text-xs h-8" />
            <Button size="sm" variant="secondary" onClick={addCondition} className="h-8 text-xs">Dodaj</Button>
          </div>
        </CardContent>
      </Card>

      {/* Weapons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><Swords className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Broń</h3></div>
            {editing && <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addWeapon}><Plus className="h-3 w-3" />Dodaj</Button>}
          </div>
          <div className="space-y-1.5">
            {data.weapons.map((w, i) => editing ? (
              <div key={i} className="bg-muted rounded-md p-2 space-y-1">
                <div className="flex gap-1.5 items-center">
                  <Input value={w.name} onChange={(e) => updateDraftWeapon(i, "name", e.target.value)} placeholder="Nazwa" className="h-7 text-xs flex-1" />
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeWeapon(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input value={w.damage} onChange={(e) => updateDraftWeapon(i, "damage", e.target.value)} placeholder="Obrażenia" className="h-7 text-xs" />
                  <Input value={w.qualities} onChange={(e) => updateDraftWeapon(i, "qualities", e.target.value)} placeholder="Cechy" className="h-7 text-xs" />
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                <span className="font-medium">{w.name}</span>
                <div className="text-xs text-muted-foreground">{w.damage} · {w.qualities}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Armor */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Pancerz</h3></div>
            {editing && <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addArmor}><Plus className="h-3 w-3" />Dodaj</Button>}
          </div>
          <div className="space-y-1.5">
            {data.armor.map((a, i) => editing ? (
              <div key={i} className="bg-muted rounded-md p-2 space-y-1">
                <div className="flex gap-1.5 items-center">
                  <Input value={a.name} onChange={(e) => updateDraftArmor(i, "name", e.target.value)} placeholder="Nazwa" className="h-7 text-xs flex-1" />
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeArmor(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <NumberInput value={a.ap} onChange={(v) => updateDraftArmor(i, "ap", v)} className="h-7 text-xs text-center" />
                  <Input value={a.locations} onChange={(e) => updateDraftArmor(i, "locations", e.target.value)} placeholder="Lokacje" className="h-7 text-xs" />
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                <span className="font-medium">{a.name}</span>
                <div className="text-xs text-muted-foreground">
                  <StatAbbrWithTooltip statKey="pp" className="text-xs text-muted-foreground">PP</StatAbbrWithTooltip>{" "}
                  {a.ap} · {a.locations}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Ekwipunek</h3>
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => setShowInventoryPicker(!showInventoryPicker)}>
              <Package className="h-3 w-3" />{showInventoryPicker ? "Ukryj" : "Z ekwipunku"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.equipment.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">
                {item}
                {editing && <button onClick={() => removeEquipment(i)}><X className="h-2.5 w-2.5" /></button>}
              </Badge>
            ))}
          </div>
          {editing && (
            <div className="mt-2">
              <Input placeholder="Dodaj przedmiot i naciśnij Enter…" className="text-xs h-8" onKeyDown={(e) => {
                if (e.key === "Enter") { addEquipment((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; }
              }} />
            </div>
          )}
          {/* Inventory picker */}
          {showInventoryPicker && inventory.length > 0 && (
            <div className="mt-2 border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
              <label className="text-[10px] text-muted-foreground font-medium">Kliknij aby dodać z ekwipunku:</label>
              {inventory.filter((item) => item.quantity > 0).map((item) => (
                <button key={item.id} onClick={() => addFromInventory(item.name)}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Notatki sesyjne</h3>
          {editing ? (
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={5} className="text-sm" />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{character.notes || "Brak notatek"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}