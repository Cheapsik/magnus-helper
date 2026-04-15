import { useState, useMemo } from "react";
import {
  Plus, Trash2, Minus, Swords, RotateCcw, Crosshair, Edit2, Check, Copy,
  ChevronDown, ChevronUp, Shield, Heart, Eye, EyeOff, Target, Zap, X, RotateCcw as Redo,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Combatant } from "@/context/AppContext";
import { rollDie, rollPercentile } from "@/lib/dice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

const COMMON_STATUSES = ["Ogłuszony", "Powalony", "Krwawienie", "Zmęczony", "Przestraszony", "Oślepiony", "Oszołomiony", "Bezbronny", "Unieruchomiony", "Zatruty"];

const ATTACK_TYPES = [
  { id: "melee", label: "Wręcz", icon: Swords, stat: "ww" as const },
  { id: "ranged", label: "Dystans", icon: Target, stat: "us" as const },
  { id: "offhand", label: "Druga ręka", icon: Swords, stat: "ww" as const },
  { id: "improvised", label: "Improwizowana", icon: Zap, stat: "ww" as const },
];

const QUICK_MODIFIERS = [
  { label: "+20", value: 20 }, { label: "+10", value: 10 }, { label: "0", value: 0 },
  { label: "-10", value: -10 }, { label: "-20", value: -20 }, { label: "-30", value: -30 },
];

function getHitLocation(roll: number): string {
  if (roll <= 15) return "Głowa";
  if (roll <= 35) return "Prawa ręka";
  if (roll <= 55) return "Lewa ręka";
  if (roll <= 80) return "Korpus";
  if (roll <= 90) return "Prawa noga";
  return "Lewa noga";
}

interface CombatResult {
  hitRoll: number;
  target: number;
  success: boolean;
  margin: number;
  location?: string;
  damageRoll?: number;
  totalDamage?: number;
  finalDamage?: number;
}

/* ── Inline Combat Action Panel ── */

function CombatActionPanel({
  attackerId,
  combatants,
  character,
  difficultyPresets,
  setCombatants,
  onClose,
}: {
  attackerId: string;
  combatants: Combatant[];
  character: ReturnType<typeof useApp>["character"];
  difficultyPresets: ReturnType<typeof useApp>["difficultyPresets"];
  setCombatants: ReturnType<typeof useApp>["setCombatants"];
  onClose: () => void;
}) {
  const attacker = combatants.find((c) => c.id === attackerId);
  const others = combatants.filter((c) => c.id !== attackerId && c.hp.current > 0);

  const [targetId, setTargetId] = useState<string | "manual">(others[0]?.id ?? "manual");
  const targetCombatant = targetId === "manual" ? null : combatants.find((c) => c.id === targetId);

  const [attackType, setAttackType] = useState("melee");
  const attackDef = ATTACK_TYPES.find((t) => t.id === attackType)!;

  const derivedSkill = attacker
    ? (attackDef.stat === "us" ? attacker.us : attacker.ww)
    : (attackDef.stat === "us"
      ? (character.stats.find((s) => s.abbr === "US")?.value ?? 35)
      : (character.stats.find((s) => s.abbr === "WW")?.value ?? 40));

  const [skillOverride, setSkillOverride] = useState<number | null>(null);
  const skillValue = skillOverride ?? derivedSkill;

  const derivedSB = attacker ? attacker.sb : Math.floor((character.stats.find((s) => s.abbr === "S")?.value ?? 30) / 10);

  const [modTotal, setModTotal] = useState(0);
  const [weaponDamage, setWeaponDamage] = useState(4);
  const [targetToughness, setTargetToughness] = useState(targetCombatant?.toughness ?? 3);
  const [targetArmor, setTargetArmor] = useState(targetCombatant?.armor ?? 1);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [damageApplied, setDamageApplied] = useState(false);

  const effectiveTarget = Math.min(Math.max(skillValue + modTotal, 1), 99);

  const handleTargetChange = (id: string) => {
    setTargetId(id);
    const t = combatants.find((c) => c.id === id);
    if (t) { setTargetToughness(t.toughness); setTargetArmor(t.armor); }
  };

  const resolveAttack = () => {
    const hitRoll = rollPercentile();
    const success = hitRoll <= effectiveTarget;
    const margin = success ? effectiveTarget - hitRoll : hitRoll - effectiveTarget;
    const res: CombatResult = { hitRoll, target: effectiveTarget, success, margin };

    if (success) {
      const reversed = parseInt(hitRoll.toString().split("").reverse().join("")) || hitRoll;
      res.location = getHitLocation(reversed <= 100 ? reversed : hitRoll);
      const dmgRoll = rollDie(10);
      res.damageRoll = dmgRoll;
      res.totalDamage = dmgRoll + derivedSB + weaponDamage;
      res.finalDamage = Math.max(0, res.totalDamage - targetToughness - targetArmor);
    }

    setResult(res);
    setDamageApplied(false);
  };

  const applyDamage = () => {
    if (!result?.success || !result.finalDamage || !targetCombatant) return;
    setCombatants((prev) => prev.map((c) =>
      c.id === targetCombatant.id ? { ...c, hp: { ...c.hp, current: Math.max(0, c.hp.current - result.finalDamage!) } } : c
    ));
    setDamageApplied(true);
  };

  const applyStatusToTarget = (status: string) => {
    if (!targetCombatant) return;
    setCombatants((prev) => prev.map((c) =>
      c.id === targetCombatant.id
        ? { ...c, statuses: c.statuses.includes(status) ? c.statuses : [...c.statuses, status] }
        : c
    ));
  };

  const resetAction = () => { setResult(null); setDamageApplied(false); };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Akcja: {attacker?.name ?? "Gracz"}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!result ? (
          <>
            {/* Target selection */}
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Cel</label>
              <select value={targetId} onChange={(e) => handleTargetChange(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="manual">Ręcznie</option>
                {others.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.hp.current}/{c.hp.max})</option>)}
              </select>
            </div>

            {/* Attack type */}
            <div className="grid grid-cols-4 gap-1">
              {ATTACK_TYPES.map((t) => (
                <Button key={t.id} size="sm" variant={attackType === t.id ? "default" : "secondary"}
                  className="text-[10px] px-1 h-7 gap-1"
                  onClick={() => { setAttackType(t.id); setSkillOverride(null); }}>
                  <t.icon className="h-3 w-3" />{t.label}
                </Button>
              ))}
            </div>

            {/* Skill value */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">{attackDef.stat.toUpperCase()}</label>
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => setSkillOverride(Math.max(1, skillValue - 5))}>
                  <span className="text-[10px]">-5</span>
                </Button>
                <span className="text-base font-bold min-w-[3ch] text-center">{skillValue}</span>
                <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => setSkillOverride(Math.min(99, skillValue + 5))}>
                  <span className="text-[10px]">+5</span>
                </Button>
              </div>
            </div>

            {/* Modifiers */}
            <div>
              <div className="flex flex-wrap gap-1">
                {QUICK_MODIFIERS.map((m) => (
                  <Button key={m.value} size="sm" variant={modTotal === m.value ? "default" : "outline"} className="text-[10px] px-2 h-6" onClick={() => setModTotal(m.value)}>
                    {m.label}
                  </Button>
                ))}
              </div>
              {difficultyPresets.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {difficultyPresets.map((d) => (
                    <Button key={d.label} size="sm" variant={modTotal === d.modifier ? "default" : "ghost"} className="text-[10px] px-1.5 h-5"
                      onClick={() => setModTotal(d.modifier)}>
                      {d.labelPl} ({d.modifier >= 0 ? `+${d.modifier}` : d.modifier})
                    </Button>
                  ))}
                </div>
              )}
              <div className="mt-1 text-[11px] text-muted-foreground">
                Cel: <span className="font-bold text-foreground">{effectiveTarget}</span>
              </div>
            </div>

            {/* Weapon / toughness / armor */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Broń", value: weaponDamage, set: setWeaponDamage },
                { label: "Wt celu", value: targetToughness, set: setTargetToughness },
                { label: "Pancerz", value: targetArmor, set: setTargetArmor },
              ].map((p) => (
                <div key={p.label} className="text-center">
                  <label className="text-[9px] text-muted-foreground block mb-0.5">{p.label}</label>
                  <div className="flex items-center justify-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => p.set(Math.max(0, p.value - 1))}><span className="text-[10px]">-</span></Button>
                    <span className="font-bold text-xs min-w-[2ch]">{p.value}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => p.set(p.value + 1)}><span className="text-[10px]">+</span></Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={resolveAttack} className="w-full h-10 text-sm font-semibold gap-2">
              <Swords className="h-4 w-4" /> Atakuj!
            </Button>
          </>
        ) : (
          /* ── Result ── */
          <div className="space-y-2">
            <div className={cn("text-center p-3 rounded-md border-2",
              result.success ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
            )}>
              <div className={cn("text-4xl font-bold animate-dice-settle", result.success ? "text-success" : "text-destructive")}>{result.hitRoll}</div>
              <div className={cn("text-sm font-semibold mt-0.5", result.success ? "text-success" : "text-destructive")}>{result.success ? "TRAFIENIE!" : "PUDŁO"}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Cel: {result.target} · Margines: {result.margin} · SL: {Math.floor(result.margin / 10)}</div>
            </div>

            {result.success && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[10px] text-muted-foreground block">Lokacja</span><span className="font-semibold">{result.location}</span></div>
                  <div><span className="text-[10px] text-muted-foreground block">Rzut</span><span className="font-semibold">{result.damageRoll} + {derivedSB}(SB) + {weaponDamage}(broń)</span></div>
                  <div><span className="text-[10px] text-muted-foreground block">Suma</span><span className="font-semibold">{result.totalDamage}</span></div>
                  <div><span className="text-[10px] text-muted-foreground block">Redukcja</span><span className="font-semibold">-{targetToughness + targetArmor}</span></div>
                </div>
                <div className="text-center py-2">
                  <div className="text-[10px] text-muted-foreground">Ostateczne obrażenia</div>
                  <div className="text-3xl font-bold text-primary animate-dice-settle">{result.finalDamage}</div>
                </div>

                {targetCombatant && result.finalDamage! > 0 && (
                  <>
                    <Button onClick={applyDamage} disabled={damageApplied} variant="destructive" className="w-full gap-2 text-xs h-9">
                      <Shield className="h-3.5 w-3.5" />
                      {damageApplied
                        ? `Zadano ${result.finalDamage} → ${targetCombatant.name}`
                        : `Zadaj ${result.finalDamage} → ${targetCombatant.name}`}
                    </Button>
                    <div className="flex flex-wrap gap-1">
                      {["Ogłuszony", "Krwawienie", "Powalony"].map((s) => (
                        <Button key={s} size="sm" variant="outline" className="text-[10px] h-5" onClick={() => applyStatusToTarget(s)}>
                          + {s}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <Button onClick={resetAction} variant="secondary" className="w-full gap-2 text-xs h-9">
              <Redo className="h-3.5 w-3.5" /> Następna akcja
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main Combat Page ── */

export default function CombatPage() {
  const { character, combatants, setCombatants, combatRound, setCombatRound, combatTurn, setCombatTurn, difficultyPresets } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Combatant | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDead, setShowDead] = useState(true);
  const [actionAttackerId, setActionAttackerId] = useState<string | null>(null);

  // New combatant form
  const [newName, setNewName] = useState("");
  const [newInit, setNewInit] = useState(30);
  const [newWw, setNewWw] = useState(30);
  const [newUs, setNewUs] = useState(25);
  const [newSb, setNewSb] = useState(3);
  const [newHp, setNewHp] = useState(10);
  const [newArmor, setNewArmor] = useState(0);
  const [newToughness, setNewToughness] = useState(3);
  const [newIsEnemy, setNewIsEnemy] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const sorted = useMemo(() => [...combatants].sort((a, b) => b.initiative - a.initiative), [combatants]);
  const displayed = showDead ? sorted : sorted.filter((c) => c.hp.current > 0);

  const addCombatant = () => {
    if (!newName.trim()) return;
    setCombatants((prev) => [...prev, {
      id: crypto.randomUUID(), name: newName.trim(), initiative: newInit,
      ww: newWw, us: newUs, sb: newSb,
      hp: { current: newHp, max: newHp }, armor: newArmor, toughness: newToughness,
      statuses: [], notes: "", isEnemy: newIsEnemy,
    }]);
    setNewName("");
    setShowAddForm(false);
  };

  const removeCombatant = (id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
    if (actionAttackerId === id) setActionAttackerId(null);
    if (combatTurn >= sorted.length - 1) setCombatTurn(0);
  };

  const duplicateCombatant = (c: Combatant) => {
    setCombatants((prev) => [...prev, { ...c, id: crypto.randomUUID(), name: `${c.name} (kopia)`, hp: { ...c.hp, current: c.hp.max } }]);
  };

  const adjustHp = (id: string, delta: number) => {
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, hp: { ...c.hp, current: Math.max(0, Math.min(c.hp.max, c.hp.current + delta)) } } : c
    ));
  };

  const nextTurn = () => {
    if (sorted.length === 0) return;
    if (combatTurn >= sorted.length - 1) { setCombatTurn(0); setCombatRound((r) => r + 1); }
    else setCombatTurn((t) => t + 1);
    setActionAttackerId(null);
  };

  const prevTurn = () => {
    if (sorted.length === 0) return;
    if (combatTurn <= 0) {
      if (combatRound > 1) { setCombatTurn(sorted.length - 1); setCombatRound((r) => r - 1); }
    } else setCombatTurn((t) => t - 1);
    setActionAttackerId(null);
  };

  const resetCombat = () => { setCombatTurn(0); setCombatRound(1); setActionAttackerId(null); };

  const toggleStatus = (id: string, status: string) => {
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, statuses: c.statuses.includes(status) ? c.statuses.filter((s) => s !== status) : [...c.statuses, status] } : c
    ));
  };

  const startEdit = (c: Combatant) => { setEditingId(c.id); setEditDraft({ ...c }); };
  const saveEdit = () => {
    if (!editDraft) return;
    setCombatants((prev) => prev.map((c) => c.id === editDraft.id ? editDraft : c));
    setEditingId(null); setEditDraft(null);
  };

  const activeChar = sorted[combatTurn];

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Tracker walki</h1>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono">Runda {combatRound}</Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowDead(!showDead)} title={showDead ? "Ukryj poległych" : "Pokaż poległych"}>
            {showDead ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetCombat} title="Reset"><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Turn controls */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={prevTurn} disabled={sorted.length === 0 || (combatRound === 1 && combatTurn === 0)}>
          Poprzednia
        </Button>
        <Button className="flex-[2] gap-2" onClick={nextTurn} disabled={sorted.length === 0}>
          <Swords className="h-4 w-4" /> Następna tura
        </Button>
      </div>

      {/* Active character banner */}
      {activeChar && !actionAttackerId && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold">Tura: {activeChar.name}</span>
            </div>
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setActionAttackerId(activeChar.id)}>
              <Crosshair className="h-3 w-3" /> Akcja
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Inline Combat Action Panel */}
      {actionAttackerId && (
        <CombatActionPanel
          attackerId={actionAttackerId}
          combatants={combatants}
          character={character}
          difficultyPresets={difficultyPresets}
          setCombatants={setCombatants}
          onClose={() => setActionAttackerId(null)}
        />
      )}

      {/* Combatant list */}
      <div className="space-y-2">
        {displayed.map((c) => {
          const realIndex = sorted.findIndex((s) => s.id === c.id);
          const hpPercent = c.hp.max > 0 ? (c.hp.current / c.hp.max) * 100 : 0;
          const isActive = realIndex === combatTurn;
          const isEditing = editingId === c.id;
          const isExpanded = expandedId === c.id;
          const isDead = c.hp.current === 0;
          const d = isEditing ? editDraft! : c;

          return (
            <Card key={c.id} className={cn(
              "transition-all",
              isActive && "ring-2 ring-primary shadow-md shadow-primary/10",
              isDead && "opacity-40"
            )}>
              <CardContent className="p-0">
                {isEditing ? (
                  <div className="p-3 space-y-2">
                    <div className="flex gap-1.5">
                      <Input value={d.name} onChange={(e) => setEditDraft({ ...d, name: e.target.value })} className="h-8 text-xs flex-1" placeholder="Imię" />
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant={!d.isEnemy ? "default" : "outline"} className="h-8 text-[10px] px-2" onClick={() => setEditDraft({ ...d, isEnemy: false })}>Sojusznik</Button>
                        <Button size="sm" variant={d.isEnemy ? "destructive" : "outline"} className="h-8 text-[10px] px-2" onClick={() => setEditDraft({ ...d, isEnemy: true })}>Wróg</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div><label className="text-[9px] text-muted-foreground">Inicjatywa</label><NumberInput value={d.initiative} onChange={(v) => setEditDraft({ ...d, initiative: v })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">WW</label><NumberInput value={d.ww} onChange={(v) => setEditDraft({ ...d, ww: v })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">US</label><NumberInput value={d.us} onChange={(v) => setEditDraft({ ...d, us: v })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">SB</label><NumberInput value={d.sb} onChange={(v) => setEditDraft({ ...d, sb: v })} className="h-7 text-xs text-center" /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div><label className="text-[9px] text-muted-foreground">PŻ akt.</label><NumberInput value={d.hp.current} onChange={(v) => setEditDraft({ ...d, hp: { ...d.hp, current: v } })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">PŻ max</label><NumberInput value={d.hp.max} onChange={(v) => setEditDraft({ ...d, hp: { ...d.hp, max: v } })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">Pancerz</label><NumberInput value={d.armor} onChange={(v) => setEditDraft({ ...d, armor: v })} className="h-7 text-xs text-center" /></div>
                      <div><label className="text-[9px] text-muted-foreground">Wt</label><NumberInput value={d.toughness} onChange={(v) => setEditDraft({ ...d, toughness: v })} className="h-7 text-xs text-center" /></div>
                    </div>
                    <Textarea value={d.notes} onChange={(e) => setEditDraft({ ...d, notes: e.target.value })} placeholder="Notatki…" rows={2} className="text-xs min-h-[48px]" />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={saveEdit}><Check className="h-3 w-3" />Zapisz</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(null); setEditDraft(null); }}>Anuluj</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main row */}
                    <div className="px-3 pt-2.5 pb-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {isActive && <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                          <span className={cn("font-semibold text-sm truncate", c.isEnemy ? "text-destructive" : "text-foreground")}>{c.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setActionAttackerId(c.id)} title="Akcja bojowa">
                            <Crosshair className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(c)} title="Edytuj">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => duplicateCombatant(c)} title="Duplikuj">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeCombatant(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-1 text-[11px]">
                        <span className="text-muted-foreground">Inic <span className="font-bold text-foreground">{c.initiative}</span></span>
                        <span className="text-muted-foreground">WW <span className="font-bold text-foreground">{c.ww}</span></span>
                        <span className="text-muted-foreground">US <span className="font-bold text-foreground">{c.us}</span></span>
                        <span className="text-muted-foreground">SB <span className="font-bold text-foreground">{c.sb}</span></span>
                        <span className="text-muted-foreground flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" /> <span className="font-bold text-foreground">{c.armor}</span></span>
                        <span className="text-muted-foreground">Wt <span className="font-bold text-foreground">{c.toughness}</span></span>
                      </div>
                    </div>

                    {/* HP bar */}
                    <div className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => adjustHp(c.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <div className="flex-1">
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-300",
                              hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-primary" : "bg-destructive"
                            )} style={{ width: `${hpPercent}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold min-w-[4.5ch] text-right flex items-center gap-0.5">
                          <Heart className="h-3 w-3 text-destructive" />
                          {c.hp.current}/{c.hp.max}
                        </span>
                        <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => adjustHp(c.id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>

                    {/* Active statuses */}
                    {c.statuses.length > 0 && (
                      <div className="px-3 pb-1.5">
                        <div className="flex flex-wrap gap-1">
                          {c.statuses.map((s) => (
                            <Badge key={s} variant="destructive" className="text-[9px] px-1.5 py-0 h-5 gap-0.5 cursor-pointer" onClick={() => toggleStatus(c.id, s)}>
                              {s} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expand/collapse */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="w-full flex items-center justify-center py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border/50"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                        <div className="flex gap-1.5">
                          {[-5, -3, -1, 1, 3, 5].map((delta) => (
                            <Button key={delta} size="sm" variant={delta < 0 ? "destructive" : "secondary"} className="flex-1 h-7 text-xs"
                              onClick={() => adjustHp(c.id, delta)}>
                              {delta > 0 ? `+${delta}` : delta}
                            </Button>
                          ))}
                        </div>

                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium block mb-1">Stany</label>
                          <div className="flex flex-wrap gap-1">
                            {COMMON_STATUSES.map((s) => (
                              <button key={s} onClick={() => toggleStatus(c.id, s)} className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                c.statuses.includes(s) ? "bg-destructive/20 text-destructive border-destructive/30" : "text-muted-foreground border-border hover:border-muted-foreground"
                              )}>{s}</button>
                            ))}
                          </div>
                        </div>

                        {c.notes && (
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Notatki</label>
                            <p className="text-xs text-muted-foreground whitespace-pre-line">{c.notes}</p>
                          </div>
                        )}

                        <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => setActionAttackerId(c.id)}>
                          <Crosshair className="h-3 w-3" /> Rozwiąż akcję bojową
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

      {sorted.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Brak uczestników walki. Dodaj kogoś poniżej.</CardContent></Card>
      )}

      {/* Add combatant */}
      {!showAddForm ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" /> Dodaj uczestnika
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nowy uczestnik</h3>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddForm(false)}>Anuluj</Button>
            </div>
            <Input placeholder="Imię" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCombatant()} className="text-sm h-9" />
            <div className="grid grid-cols-4 gap-2">
              <div><label className="text-[9px] text-muted-foreground">Inicjatywa</label><NumberInput value={newInit} onChange={setNewInit} className="text-sm h-8 text-center" /></div>
              <div><label className="text-[9px] text-muted-foreground">WW</label><NumberInput value={newWw} onChange={setNewWw} className="text-sm h-8 text-center" /></div>
              <div><label className="text-[9px] text-muted-foreground">US</label><NumberInput value={newUs} onChange={setNewUs} className="text-sm h-8 text-center" /></div>
              <div><label className="text-[9px] text-muted-foreground">SB</label><NumberInput value={newSb} onChange={setNewSb} className="text-sm h-8 text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[9px] text-muted-foreground">PŻ</label><NumberInput value={newHp} onChange={setNewHp} min={1} className="text-sm h-8 text-center" /></div>
              <div><label className="text-[9px] text-muted-foreground">Pancerz</label><NumberInput value={newArmor} onChange={setNewArmor} className="text-sm h-8 text-center" /></div>
              <div><label className="text-[9px] text-muted-foreground">Wt</label><NumberInput value={newToughness} onChange={setNewToughness} className="text-sm h-8 text-center" /></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Button size="sm" variant={!newIsEnemy ? "default" : "outline"} className="text-xs h-7" onClick={() => setNewIsEnemy(false)}>Sojusznik</Button>
                <Button size="sm" variant={newIsEnemy ? "destructive" : "outline"} className="text-xs h-7" onClick={() => setNewIsEnemy(true)}>Wróg</Button>
              </div>
              <Button size="sm" onClick={addCombatant} className="gap-1 text-xs h-7 ml-auto"><Plus className="h-3 w-3" />Dodaj</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}