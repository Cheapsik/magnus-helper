import { useState, useId, type ReactNode } from "react";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { GmEnemy } from "@/lib/gmEnemy";
import { gmEnemyToCombatant } from "@/lib/gmEnemy";
import type { Combatant } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import type { GameStatKey } from "@/lib/gameStatGlossary";
import { getStatFullName, getStatGlossaryEntry } from "@/lib/gameStatGlossary";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import { CombatStatCell, NARROW_NUM } from "@/components/game/CombatStatCell";

function intersperseStatNodes(nodes: (ReactNode | false | null | undefined)[]): ReactNode[] {
  const list = nodes.filter(Boolean) as ReactNode[];
  return list.flatMap((n, i) => (i === 0 ? [n] : [<span key={`sep-${i}`} className="text-muted-foreground"> · </span>, n]));
}

const emptyOptionalEnemy = (): GmEnemy => ({
  id: "",
  name: "",
  ww: 30,
  hp: 8,
  armor: 0,
  weapon: "",
});

function OptionalStat({
  statKey,
  value,
  onChange,
}: {
  statKey: GameStatKey;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const display = value === undefined || Number.isNaN(value) ? "" : String(value);
  return (
    <CombatStatCell statKey={statKey}>
      <Input
        className={NARROW_NUM}
        inputMode="numeric"
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
    </CombatStatCell>
  );
}

function EnemyFormFields({
  d,
  setD,
}: {
  d: GmEnemy;
  setD: (fn: (prev: GmEnemy) => GmEnemy) => void;
}) {
  const formUid = useId();
  const patch = (p: Partial<GmEnemy>) => setD((prev) => ({ ...prev, ...p }));
  return (
    <div className="space-y-1.5">
      <div>
        <label htmlFor={`enemy-name-${formUid}`} className="mb-px block text-[10px] leading-tight text-muted-foreground">
          Nazwa<span className="text-destructive"> *</span>
        </label>
        <Input
          id={`enemy-name-${formUid}`}
          value={d.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="h-7 w-full text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
        <CombatStatCell statKey="ww" required>
          <NumberInput value={d.ww} onChange={(v) => patch({ ww: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell label={`${getStatFullName("pż")} — bieżące`} required>
          <NumberInput value={d.hp} onChange={(v) => patch({ hp: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell
          label={`${getStatFullName("pż")} — maksimum`}
          tooltip="Opcjonalnie. Puste pole — jak bieżące punkty żywotności."
        >
          <Input
            className={NARROW_NUM}
            inputMode="numeric"
            value={d.hpMax === undefined ? "" : String(d.hpMax)}
            onChange={(e) => {
              const t = e.target.value.trim();
              patch({ hpMax: t === "" ? undefined : parseInt(t, 10) || undefined });
            }}
          />
        </CombatStatCell>
        <CombatStatCell statKey="pnc" required>
          <NumberInput value={d.armor} onChange={(v) => patch({ armor: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="wtSoak" required>
          <NumberInput value={d.toughness ?? 3} onChange={(v) => patch({ toughness: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <OptionalStat statKey="inic" value={d.initiative} onChange={(v) => patch({ initiative: v })} />
        <OptionalStat statKey="us" value={d.us} onChange={(v) => patch({ us: v })} />
        <OptionalStat statKey="sb" value={d.sb} onChange={(v) => patch({ sb: v })} />
      </div>

      <div>
        <label htmlFor={`enemy-weapon-${formUid}`} className="mb-px block text-[10px] leading-tight text-muted-foreground">
          Broń / oręż
        </label>
        <Input
          id={`enemy-weapon-${formUid}`}
          value={d.weapon}
          onChange={(e) => patch({ weapon: e.target.value })}
          className="h-7 w-full text-xs"
        />
      </div>

      <Separator className="my-0" />

      <div>
        <div className="mb-1 text-[10px] leading-tight text-muted-foreground">Cechy z karty (opcjonalnie)</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
          <OptionalStat statKey="k" value={d.k} onChange={(v) => patch({ k: v })} />
          <OptionalStat statKey="odp" value={d.odp} onChange={(v) => patch({ odp: v })} />
          <OptionalStat statKey="zr" value={d.zr} onChange={(v) => patch({ zr: v })} />
          <OptionalStat statKey="int" value={d.int} onChange={(v) => patch({ int: v })} />
          <OptionalStat statKey="sw" value={d.sw} onChange={(v) => patch({ sw: v })} />
          <OptionalStat statKey="ogd" value={d.ogd} onChange={(v) => patch({ ogd: v })} />
          <OptionalStat statKey="mag" value={d.mag} onChange={(v) => patch({ mag: v })} />
          <OptionalStat statKey="sz" value={d.sz} onChange={(v) => patch({ sz: v })} />
          <OptionalStat statKey="s" value={d.s} onChange={(v) => patch({ s: v })} />
          <OptionalStat statKey="wt2" value={d.wt} onChange={(v) => patch({ wt: v })} />
          <OptionalStat statKey="a" value={d.a} onChange={(v) => patch({ a: v })} />
          <OptionalStat statKey="po" value={d.po} onChange={(v) => patch({ po: v })} />
          <OptionalStat statKey="pp" value={d.pp} onChange={(v) => patch({ pp: v })} />
        </div>
      </div>

      <div>
        <label htmlFor={`enemy-desc-${formUid}`} className="mb-px block text-[10px] leading-tight text-muted-foreground">
          Opis (opcjonalnie)
        </label>
        <Textarea
          id={`enemy-desc-${formUid}`}
          value={d.description ?? ""}
          onChange={(e) => patch({ description: e.target.value || undefined })}
          className="min-h-[52px] w-full text-xs"
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
          <CardContent className="space-y-1.5 p-2.5">
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
              <CardContent className="p-2.5">
                {isEditing ? (
                  <div className="space-y-1.5">
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
                            <StatAbbrWithTooltip statKey="ww" className="text-muted-foreground">WW</StatAbbrWithTooltip>{" "}
                            <span className="font-bold text-foreground">{enemy.ww}</span>
                          </span>
                          <span>
                            <StatAbbrWithTooltip statKey="pż" className="text-muted-foreground">PŻ</StatAbbrWithTooltip>{" "}
                            <span className="font-bold text-foreground">{enemy.hp}</span>
                            {enemy.hpMax != null && enemy.hpMax !== enemy.hp && (
                              <span className="text-muted-foreground">/{enemy.hpMax}</span>
                            )}
                          </span>
                          <span>
                            <StatAbbrWithTooltip statKey="pnc" className="text-muted-foreground">Pnc</StatAbbrWithTooltip>{" "}
                            <span className="font-bold text-foreground">{enemy.armor}</span>
                          </span>
                          {enemy.us != null && (
                            <span>
                              <StatAbbrWithTooltip statKey="us" className="text-muted-foreground">US</StatAbbrWithTooltip>{" "}
                              <span className="font-bold text-foreground">{enemy.us}</span>
                            </span>
                          )}
                          {enemy.initiative != null && (
                            <span>
                              <StatAbbrWithTooltip statKey="inic" className="text-muted-foreground">Inic</StatAbbrWithTooltip>{" "}
                              <span className="font-bold text-foreground">{enemy.initiative}</span>
                            </span>
                          )}
                          {enemy.sb != null && (
                            <span>
                              <StatAbbrWithTooltip statKey="sb" className="text-muted-foreground">SB</StatAbbrWithTooltip>{" "}
                              <span className="font-bold text-foreground">{enemy.sb}</span>
                            </span>
                          )}
                          {enemy.toughness != null && (
                            <span>
                              <StatAbbrWithTooltip statKey="wtSoak" className="text-muted-foreground">{getStatGlossaryEntry("wtSoak").abbr}</StatAbbrWithTooltip>{" "}
                              <span className="font-bold text-foreground">{enemy.toughness}</span>
                            </span>
                          )}
                          {[enemy.k, enemy.odp, enemy.zr, enemy.int, enemy.sw, enemy.ogd].some((x) => x != null) && (
                            <span className="w-full text-[9px] opacity-90">
                              {intersperseStatNodes([
                                enemy.k != null && (
                                  <span key="k">
                                    <StatAbbrWithTooltip statKey="k" className="text-muted-foreground">K</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.k}</span>
                                  </span>
                                ),
                                enemy.odp != null && (
                                  <span key="odp">
                                    <StatAbbrWithTooltip statKey="odp" className="text-muted-foreground">Odp</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.odp}</span>
                                  </span>
                                ),
                                enemy.zr != null && (
                                  <span key="zr">
                                    <StatAbbrWithTooltip statKey="zr" className="text-muted-foreground">Zr</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.zr}</span>
                                  </span>
                                ),
                                enemy.int != null && (
                                  <span key="int">
                                    <StatAbbrWithTooltip statKey="int" className="text-muted-foreground">Int</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.int}</span>
                                  </span>
                                ),
                                enemy.sw != null && (
                                  <span key="sw">
                                    <StatAbbrWithTooltip statKey="sw" className="text-muted-foreground">SW</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.sw}</span>
                                  </span>
                                ),
                                enemy.ogd != null && (
                                  <span key="ogd">
                                    <StatAbbrWithTooltip statKey="ogd" className="text-muted-foreground">Ogd</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.ogd}</span>
                                  </span>
                                ),
                              ])}
                            </span>
                          )}
                          {[enemy.mag, enemy.sz, enemy.s, enemy.wt, enemy.a, enemy.po, enemy.pp].some((x) => x != null) && (
                            <span className="w-full text-[9px] opacity-90">
                              {intersperseStatNodes([
                                enemy.mag != null && (
                                  <span key="mag">
                                    <StatAbbrWithTooltip statKey="mag" className="text-muted-foreground">Mag</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.mag}</span>
                                  </span>
                                ),
                                enemy.sz != null && (
                                  <span key="sz">
                                    <StatAbbrWithTooltip statKey="sz" className="text-muted-foreground">Sz</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.sz}</span>
                                  </span>
                                ),
                                enemy.s != null && (
                                  <span key="s">
                                    <StatAbbrWithTooltip statKey="s" className="text-muted-foreground">S</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.s}</span>
                                  </span>
                                ),
                                enemy.wt != null && (
                                  <span key="wt">
                                    <StatAbbrWithTooltip statKey="wt2" className="text-muted-foreground">{getStatGlossaryEntry("wt2").abbr}</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.wt}</span>
                                  </span>
                                ),
                                enemy.a != null && (
                                  <span key="a">
                                    <StatAbbrWithTooltip statKey="a" className="text-muted-foreground">A</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.a}</span>
                                  </span>
                                ),
                                enemy.po != null && (
                                  <span key="po">
                                    <StatAbbrWithTooltip statKey="po" className="text-muted-foreground">PO</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.po}</span>
                                  </span>
                                ),
                                enemy.pp != null && (
                                  <span key="pp">
                                    <StatAbbrWithTooltip statKey="pp" className="text-muted-foreground">PP</StatAbbrWithTooltip>{" "}
                                    <span className="font-bold text-foreground">{enemy.pp}</span>
                                  </span>
                                ),
                              ])}
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
