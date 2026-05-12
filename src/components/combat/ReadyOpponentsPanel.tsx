import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { GmEnemy } from "@/lib/gmEnemy";
import { gmEnemyToCombatant } from "@/lib/gmEnemy";
import type { Combatant } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";

const emptyOptionalEnemy = (): GmEnemy => ({
  id: "",
  name: "",
  ww: 30,
  hp: 8,
  armor: 0,
  weapon: "",
});

function OptionalStat({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const display = value === undefined || Number.isNaN(value) ? "" : String(value);
  return (
    <div>
      <label className="text-[9px] text-muted-foreground">{label}</label>
      <Input
        className="h-7 text-xs text-center"
        inputMode="numeric"
        placeholder="—"
        value={display}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "") {
            onChange(undefined);
            return;
          }
          const n = parseInt(t, 10);
          onChange(Number.isFinite(n) ? n : undefined);
        }}
      />
    </div>
  );
}

function EnemyFormFields({
  d,
  setD,
}: {
  d: GmEnemy;
  setD: (fn: (prev: GmEnemy) => GmEnemy) => void;
}) {
  const patch = (p: Partial<GmEnemy>) => setD((prev) => ({ ...prev, ...p }));
  return (
    <div className="space-y-2">
      <Input value={d.name} onChange={(e) => patch({ name: e.target.value })} className="h-7 text-xs" placeholder="Nazwa *" />
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="text-[9px] text-muted-foreground">WW *</label>
          <NumberInput value={d.ww} onChange={(v) => patch({ ww: v })} className="h-7 text-xs text-center" />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">PŻ (akt.) *</label>
          <NumberInput value={d.hp} onChange={(v) => patch({ hp: v })} className="h-7 text-xs text-center" />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">PŻ max</label>
          <Input
            className="h-7 text-xs text-center"
            inputMode="numeric"
            placeholder="jak akt"
            value={d.hpMax === undefined ? "" : String(d.hpMax)}
            onChange={(e) => {
              const t = e.target.value.trim();
              patch({ hpMax: t === "" ? undefined : parseInt(t, 10) || undefined });
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="text-[9px] text-muted-foreground">Pancerz *</label>
          <NumberInput value={d.armor} onChange={(v) => patch({ armor: v })} className="h-7 text-xs text-center" />
        </div>
        <OptionalStat label="Inicjatywa" value={d.initiative} onChange={(v) => patch({ initiative: v })} />
        <OptionalStat label="US" value={d.us} onChange={(v) => patch({ us: v })} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <OptionalStat label="SB" value={d.sb} onChange={(v) => patch({ sb: v })} />
        <OptionalStat label="Wt" value={d.toughness} onChange={(v) => patch({ toughness: v })} />
        <OptionalStat label="K" value={d.k} onChange={(v) => patch({ k: v })} />
        <OptionalStat label="Odp" value={d.odp} onChange={(v) => patch({ odp: v })} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <OptionalStat label="Zr" value={d.zr} onChange={(v) => patch({ zr: v })} />
        <OptionalStat label="Int" value={d.int} onChange={(v) => patch({ int: v })} />
        <OptionalStat label="SW" value={d.sw} onChange={(v) => patch({ sw: v })} />
        <OptionalStat label="Ogd" value={d.ogd} onChange={(v) => patch({ ogd: v })} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <OptionalStat label="Mag" value={d.mag} onChange={(v) => patch({ mag: v })} />
        <OptionalStat label="Sz" value={d.sz} onChange={(v) => patch({ sz: v })} />
        <OptionalStat label="S" value={d.s} onChange={(v) => patch({ s: v })} />
        <OptionalStat label="Wt (2)" value={d.wt} onChange={(v) => patch({ wt: v })} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <OptionalStat label="A" value={d.a} onChange={(v) => patch({ a: v })} />
        <OptionalStat label="PO" value={d.po} onChange={(v) => patch({ po: v })} />
        <OptionalStat label="PP" value={d.pp} onChange={(v) => patch({ pp: v })} />
      </div>
      <Input value={d.weapon} onChange={(e) => patch({ weapon: e.target.value })} className="h-7 text-xs" placeholder="Broń / oręż" />
      <div>
        <label className="text-[9px] text-muted-foreground mb-0.5 block">Opis (opcjonalnie)</label>
        <Textarea
          value={d.description ?? ""}
          onChange={(e) => patch({ description: e.target.value || undefined })}
          className="min-h-[72px] text-xs"
          placeholder="Umiejętności, zasady specjalne, notatki MG…"
        />
      </div>
    </div>
  );
}

export function ReadyOpponentsPanel({
  gmEnemies,
  setGmEnemies,
  setCombatants,
}: {
  gmEnemies: GmEnemy[];
  setGmEnemies: (fn: GmEnemy[] | ((prev: GmEnemy[]) => GmEnemy[])) => void;
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<GmEnemy | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEnemy, setNewEnemy] = useState<GmEnemy>(() => emptyOptionalEnemy());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startEdit = (e: GmEnemy) => {
    setEditingId(e.id);
    setEditDraft({ ...e });
  };
  const saveEdit = () => {
    if (!editDraft) return;
    setGmEnemies((prev) => prev.map((x) => (x.id === editDraft.id ? editDraft : x)));
    setEditingId(null);
    setEditDraft(null);
  };

  const removeEnemy = (id: string) => setGmEnemies((prev) => prev.filter((x) => x.id !== id));

  const addEnemy = () => {
    if (!newEnemy.name.trim()) return;
    setGmEnemies((prev) => [...prev, { ...newEnemy, id: crypto.randomUUID() }]);
    setNewEnemy(emptyOptionalEnemy());
    setAdding(false);
  };

  const addToCombat = (enemy: GmEnemy) => {
    setCombatants((prev) => [...prev, gmEnemyToCombatant(enemy)]);
    toast.success(`Dodano „${enemy.name.trim() || "Przeciwnik"}” do walki`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Dodaj gotową kartę przyciskiem „+ Do walki” — trafi na listę uczestników w zakładce „Walka”.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lista</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Dodaj
        </Button>
      </div>

      {adding && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <EnemyFormFields d={newEnemy} setD={(fn) => setNewEnemy(fn)} />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={addEnemy}>
                Dodaj
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {gmEnemies.map((enemy) => {
          const isEditing = editingId === enemy.id;
          const d = isEditing ? editDraft! : enemy;
          const isExpanded = expandedId === enemy.id;

          return (
            <Card key={enemy.id} className="border-border/80">
              <CardContent className="p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <EnemyFormFields d={d} setD={(fn) => setEditDraft((prev) => (prev ? fn(prev) : prev))} />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={saveEdit}>
                        <Check className="h-3 w-3" /> Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{enemy.name}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(enemy)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => removeEnemy(enemy.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span>
                            WW <span className="font-bold text-foreground">{enemy.ww}</span>
                          </span>
                          <span>
                            PŻ <span className="font-bold text-foreground">{enemy.hp}</span>
                            {enemy.hpMax != null && enemy.hpMax !== enemy.hp && (
                              <span className="text-muted-foreground">/{enemy.hpMax}</span>
                            )}
                          </span>
                          <span>
                            Pnc <span className="font-bold text-foreground">{enemy.armor}</span>
                          </span>
                          {enemy.us != null && (
                            <span>
                              US <span className="font-bold text-foreground">{enemy.us}</span>
                            </span>
                          )}
                          {enemy.initiative != null && (
                            <span>
                              Inic <span className="font-bold text-foreground">{enemy.initiative}</span>
                            </span>
                          )}
                          {enemy.sb != null && (
                            <span>
                              SB <span className="font-bold text-foreground">{enemy.sb}</span>
                            </span>
                          )}
                          {enemy.toughness != null && (
                            <span>
                              Wt <span className="font-bold text-foreground">{enemy.toughness}</span>
                            </span>
                          )}
                          {[enemy.k, enemy.odp, enemy.zr, enemy.int, enemy.sw, enemy.ogd].some((x) => x != null) && (
                            <span className="w-full text-[9px] opacity-90">
                              {[
                                enemy.k != null && `K ${enemy.k}`,
                                enemy.odp != null && `Odp ${enemy.odp}`,
                                enemy.zr != null && `Zr ${enemy.zr}`,
                                enemy.int != null && `Int ${enemy.int}`,
                                enemy.sw != null && `SW ${enemy.sw}`,
                                enemy.ogd != null && `Ogd ${enemy.ogd}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          {[enemy.mag, enemy.sz, enemy.s, enemy.wt, enemy.a, enemy.po, enemy.pp].some((x) => x != null) && (
                            <span className="w-full text-[9px] opacity-90">
                              {[
                                enemy.mag != null && `Mag ${enemy.mag}`,
                                enemy.sz != null && `Sz ${enemy.sz}`,
                                enemy.s != null && `S ${enemy.s}`,
                                enemy.wt != null && `Wt ${enemy.wt}`,
                                enemy.a != null && `A ${enemy.a}`,
                                enemy.po != null && `PO ${enemy.po}`,
                                enemy.pp != null && `PP ${enemy.pp}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                        {enemy.weapon && <div className="text-xs text-muted-foreground line-clamp-2">{enemy.weapon}</div>}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2 text-muted-foreground"
                            onClick={() => setExpandedId(isExpanded ? null : enemy.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {enemy.description ? "Opis" : "Szczegóły"}
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" onClick={() => addToCombat(enemy)}>
                            + Do walki
                          </Button>
                        </div>
                        {isExpanded && enemy.description && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap border-t border-border/50 pt-2 mt-1">
                            {enemy.description}
                          </p>
                        )}
                        {isExpanded && !enemy.description && (
                          <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-2 mt-1">Brak opisu.</p>
                        )}
                      </div>
                    </div>
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
