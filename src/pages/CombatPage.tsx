import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Swords, Crosshair, Target, Zap, X, Flag, RotateCcw as Redo } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Combatant } from "@/context/AppContext";
import { useLocation } from "react-router-dom";
import { rollDie, rollPercentile } from "@/lib/dice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { CombatMonstersMobileTab } from "@/components/combat/CombatMonstersPanel";
import { FightTabsBar } from "@/components/combat/FightTabsBar";
import { CombatPresetsMobileTab } from "@/components/combat/CombatPresetsPanel";
import { CombatRosterMobileTab } from "@/components/combat/CombatRosterPanel";
import { CombatViewModeNav, type CombatViewMode } from "@/components/combat/CombatViewModeNav";
import { CombatTurnBar } from "@/components/combat/CombatTurnBar";
import { CombatantCard } from "@/components/combat/CombatantCard";
import { CombatSidePanel } from "@/components/combat/CombatSidePanel";
import { gmEnemyToCombatant } from "@/lib/gmEnemy";
import {
  GM_ENEMY_DRAG,
  ROSTER_HERO_DRAG,
  ROSTER_NPC_DRAG,
  isCombatRosterDragEvent,
  isGmEnemyDragEvent,
  isRosterHeroDragEvent,
  isRosterNpcDragEvent,
} from "@/lib/combatDrag";
import {
  HEROES_STORAGE_KEY,
  heroRosterToCombatant,
  reviveHeroRoster,
  savedNpcToCombatant,
  getHeroRosterDisplayName,
  type HeroRosterEntry,
} from "@/lib/combatRoster";
import { getNpcDisplayName } from "@/components/character-sheet/npcAccessors";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFinePointer } from "@/hooks/useFinePointer";
import {
  MAX_COMBAT_FIGHTS,
  addPresetFromFight,
  createEmptyFight,
  removeFight,
  renameFight,
  setActiveFightId,
  setFightStatus,
} from "@/lib/combatSessions";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import { CombatStatCell, NARROW_NUM } from "@/components/game/CombatStatCell";
import { getStatFullName } from "@/lib/gameStatGlossary";

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
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Cel</label>
              <select value={targetId} onChange={(e) => handleTargetChange(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="manual">Ręcznie</option>
                {others.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.hp.current}/{c.hp.max})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {ATTACK_TYPES.map((t) => (
                <Button key={t.id} size="sm" variant={attackType === t.id ? "default" : "secondary"}
                  className="text-[10px] px-1 h-7 gap-1"
                  onClick={() => { setAttackType(t.id); setSkillOverride(null); }}>
                  <t.icon className="h-3 w-3" />{t.label}
                </Button>
              ))}
            </div>

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

            <div className="grid grid-cols-3 gap-1.5">
              <div key="bron" className="text-center">
                <div className="text-[9px] text-muted-foreground block mb-0.5">Broń</div>
                <div className="flex items-center justify-center gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setWeaponDamage(Math.max(0, weaponDamage - 1))}><span className="text-[10px]">-</span></Button>
                  <span className="font-bold text-xs min-w-[2ch]">{weaponDamage}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setWeaponDamage(weaponDamage + 1)}><span className="text-[10px]">+</span></Button>
                </div>
              </div>
              <div key="wt" className="text-center">
                <div className="text-[8px] leading-snug text-muted-foreground block mb-0.5 px-0.5">
                  {getStatFullName("wtSoak")} — cel
                </div>
                <div className="flex items-center justify-center gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setTargetToughness(Math.max(0, targetToughness - 1))}><span className="text-[10px]">-</span></Button>
                  <span className="font-bold text-xs min-w-[2ch]">{targetToughness}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setTargetToughness(targetToughness + 1)}><span className="text-[10px]">+</span></Button>
                </div>
              </div>
              <div key="pnc" className="text-center">
                <div className="text-[8px] leading-snug text-muted-foreground block mb-0.5 px-0.5">
                  {getStatFullName("pnc")} — cel
                </div>
                <div className="flex items-center justify-center gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setTargetArmor(Math.max(0, targetArmor - 1))}><span className="text-[10px]">-</span></Button>
                  <span className="font-bold text-xs min-w-[2ch]">{targetArmor}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setTargetArmor(targetArmor + 1)}><span className="text-[10px]">+</span></Button>
                </div>
              </div>
            </div>

            <Button onClick={resolveAttack} className="w-full h-10 text-sm font-semibold gap-2">
              <Swords className="h-4 w-4" /> Atakuj!
            </Button>
          </>
        ) : (
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
                  <div><span className="text-[10px] text-muted-foreground block">Rzut</span><span className="font-semibold">{result.damageRoll} + {derivedSB}(<StatAbbrWithTooltip statKey="sb" className="font-semibold">SB</StatAbbrWithTooltip>) + {weaponDamage}(broń)</span></div>
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

export default function CombatPage() {
  const location = useLocation();
  const {
    character,
    combatants,
    setCombatants,
    combatRound,
    setCombatRound,
    combatTurn,
    setCombatTurn,
    difficultyPresets,
    gmEnemies,
    setGmEnemies,
    savedNpcs,
    combatSessions,
    setCombatSessions,
  } = useApp();
  const [heroes] = useLocalStorage<HeroRosterEntry[]>(HEROES_STORAGE_KEY, []);
  const heroRoster = useMemo(() => reviveHeroRoster(heroes), [heroes]);
  const [combatTab, setCombatTab] = useState<CombatViewMode>("walka");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Combatant | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDead, setShowDead] = useState(true);
  const [actionAttackerId, setActionAttackerId] = useState<string | null>(null);

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

  const finePointer = useFinePointer();
  const [dragEnemyId, setDragEnemyId] = useState<string | null>(null);
  const [dragNpcId, setDragNpcId] = useState<string | null>(null);
  const [dragHeroId, setDragHeroId] = useState<string | null>(null);
  const [fightDropActive, setFightDropActive] = useState(false);
  const isDraggingRoster = Boolean(dragEnemyId || dragNpcId || dragHeroId);

  const resetDragUi = useCallback(() => {
    setDragEnemyId(null);
    setDragNpcId(null);
    setDragHeroId(null);
    setFightDropActive(false);
  }, []);

  useEffect(() => {
    if (!isDraggingRoster) return;
    document.addEventListener("dragend", resetDragUi);
    return () => document.removeEventListener("dragend", resetDragUi);
  }, [isDraggingRoster, resetDragUi]);

  useEffect(() => {
    const tab = (location.state as { combatTab?: string } | null)?.combatTab;
    if (tab === "gotowi") setCombatTab("gotowi");
  }, [location.state]);

  useEffect(() => {
    setEditingId(null);
    setEditDraft(null);
    setExpandedId(null);
    setActionAttackerId(null);
    setShowAddForm(false);
  }, [combatSessions.activeFightId]);

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

  const activeFight = combatSessions.fights.find((f) => f.id === combatSessions.activeFightId);
  const canAddFight = combatSessions.fights.length < MAX_COMBAT_FIGHTS;

  const handleNewFight = (presetId?: string) => {
    const preset = presetId ? combatSessions.presets.find((p) => p.id === presetId) : undefined;
    setCombatSessions((prev) => createEmptyFight(prev, preset));
    setCombatTab("walka");
    setEditingId(null);
    setActionAttackerId(null);
    setShowAddForm(false);
  };

  const handleFightDrop = (e: React.DragEvent) => {
    e.preventDefault();
    resetDragUi();
    if (isGmEnemyDragEvent(e)) {
      const enemyId = e.dataTransfer.getData(GM_ENEMY_DRAG);
      const enemy = gmEnemies.find((x) => x.id === enemyId);
      if (!enemy) return;
      setCombatants((prev) => [...prev, gmEnemyToCombatant(enemy)]);
      toast.success(`Dodano „${enemy.name.trim() || "Przeciwnik"}” do walki`);
      return;
    }
    if (isRosterNpcDragEvent(e)) {
      const npcId = e.dataTransfer.getData(ROSTER_NPC_DRAG);
      const npc = savedNpcs.find((x) => x.id === npcId);
      if (!npc) return;
      setCombatants((prev) => [...prev, savedNpcToCombatant(npc)]);
      toast.success(`Dodano „${getNpcDisplayName(npc)}” do walki`);
      return;
    }
    if (isRosterHeroDragEvent(e)) {
      const heroId = e.dataTransfer.getData(ROSTER_HERO_DRAG);
      const hero = heroRoster.find((x) => x.id === heroId);
      if (!hero) return;
      setCombatants((prev) => [...prev, heroRosterToCombatant(hero)]);
      toast.success(`Dodano „${getHeroRosterDisplayName(hero)}” do walki`);
    }
  };

  const fightDropHandlers = finePointer
    ? {
        onDragOver: (e: React.DragEvent) => {
          if (!isCombatRosterDragEvent(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setFightDropActive(true);
        },
        onDragLeave: () => setFightDropActive(false),
        onDrop: handleFightDrop,
      }
    : {};

  const renderFightBody = () => (
    <>
      {activeFight?.status === "finished" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Flag className="h-3.5 w-3.5 shrink-0" />
          <span>Ta walka jest zakończona. Wznów ją z menu zakładki (⋮).</span>
        </div>
      )}

      {isDraggingRoster && finePointer && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
          Upuść kartę tutaj, aby dodać uczestnika do walki
        </p>
      )}

      <CombatTurnBar
        combatRound={combatRound}
        combatTurn={combatTurn}
        participantCount={sorted.length}
        showDead={showDead}
        onToggleShowDead={() => setShowDead(!showDead)}
        onReset={resetCombat}
        onPrevTurn={prevTurn}
        onNextTurn={nextTurn}
        prevDisabled={sorted.length === 0 || (combatRound === 1 && combatTurn === 0)}
        nextDisabled={sorted.length === 0}
      />

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

      <div className="space-y-2 min-h-[80px]">
        {displayed.map((c) => {
          const realIndex = sorted.findIndex((s) => s.id === c.id);
          const isActive = realIndex === combatTurn;
          const isEditing = editingId === c.id;
          const isExpanded = expandedId === c.id;
          const isDead = c.hp.current === 0;

          return (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={isActive}
              isEditing={isEditing}
              isExpanded={isExpanded}
              isDead={isDead}
              editDraft={editDraft}
              onEditDraftChange={setEditDraft}
              onSaveEdit={saveEdit}
              onCancelEdit={() => {
                setEditingId(null);
                setEditDraft(null);
              }}
              onStartEdit={() => startEdit(c)}
              onDuplicate={() => duplicateCombatant(c)}
              onRemove={() => removeCombatant(c.id)}
              onAction={() => setActionAttackerId(c.id)}
              onToggleExpand={() => setExpandedId(isExpanded ? null : c.id)}
              onAdjustHp={(delta) => adjustHp(c.id, delta)}
              onToggleStatus={(status) => toggleStatus(c.id, status)}
            />
          );
        })}
        {sorted.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {finePointer
                ? "Brak uczestników. Przeciągnij przeciwnika z prawej kolumny lub dodaj poniżej."
                : "Brak uczestników. Dodaj poniżej lub użyj zakładki „Potwory”."}
            </CardContent>
          </Card>
        )}
      </div>

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Dodaj uczestnika
        </button>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Nowy uczestnik</h3>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddForm(false)}>
                Anuluj
              </Button>
            </div>
            <div className="space-y-px">
              <label htmlFor="new-combatant-name" className="block text-[10px] leading-tight text-muted-foreground">
                Imię
              </label>
              <Input
                id="new-combatant-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCombatant()}
                className="h-7 w-full text-sm"
              />
            </div>
            <Separator className="my-0" />
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3">
              <CombatStatCell statKey="inic">
                <NumberInput value={newInit} onChange={setNewInit} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="ww">
                <NumberInput value={newWw} onChange={setNewWw} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="us">
                <NumberInput value={newUs} onChange={setNewUs} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="sb">
                <NumberInput value={newSb} onChange={setNewSb} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="pż">
                <NumberInput value={newHp} onChange={setNewHp} min={1} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="pnc">
                <NumberInput value={newArmor} onChange={setNewArmor} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="wtSoak">
                <NumberInput value={newToughness} onChange={setNewToughness} className={NARROW_NUM} />
              </CombatStatCell>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Button size="sm" variant={!newIsEnemy ? "default" : "outline"} className="text-xs h-7" onClick={() => setNewIsEnemy(false)}>
                  Sojusznik
                </Button>
                <Button size="sm" variant={newIsEnemy ? "destructive" : "outline"} className="text-xs h-7" onClick={() => setNewIsEnemy(true)}>
                  Wróg
                </Button>
              </div>
              <Button size="sm" onClick={addCombatant} className="gap-1 text-xs h-7 ml-auto">
                <Plus className="h-3 w-3" />
                Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in min-h-0">
      <h1 className="font-app-brand text-lg font-bold leading-tight">Tracker walki</h1>

      <FightTabsBar
        fights={combatSessions.fights}
        activeFightId={combatSessions.activeFightId}
        presets={combatSessions.presets}
        canAddFight={canAddFight}
        onSelectFight={(id) => {
          setCombatSessions((prev) => setActiveFightId(prev, id));
          setActionAttackerId(null);
          setEditingId(null);
        }}
        onRenameFight={(id, name) => setCombatSessions((prev) => renameFight(prev, id, name))}
        onRemoveFight={(id) => {
          setCombatSessions((prev) => removeFight(prev, id));
          setActionAttackerId(null);
        }}
        onToggleFinished={(id) => {
          const fight = combatSessions.fights.find((f) => f.id === id);
          if (!fight) return;
          setCombatSessions((prev) =>
            setFightStatus(prev, id, fight.status === "finished" ? "active" : "finished"),
          );
        }}
        onNewFight={handleNewFight}
      />

      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div
          className={cn(
            "min-w-0 flex-1 space-y-3 rounded-lg border-2 border-transparent p-1 -m-1 transition-[border-color,background-color,box-shadow] duration-200",
            fightDropActive && "border-primary/50 bg-primary/[0.06] shadow-md ring-1 ring-primary/20",
          )}
          {...fightDropHandlers}
        >
          {renderFightBody()}
        </div>

        <CombatSidePanel
          className="w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-11rem)]"
          gmEnemies={gmEnemies}
          setGmEnemies={setGmEnemies}
          savedNpcs={savedNpcs}
          heroes={heroRoster}
          setCombatants={setCombatants}
          presets={combatSessions.presets}
          onSavePresets={(presets) => setCombatSessions((prev) => ({ ...prev, presets }))}
          onSaveAsPresetFromFight={(name) => {
            setCombatSessions((prev) => addPresetFromFight(prev, name, combatants));
          }}
          dragEnemyId={dragEnemyId}
          dragNpcId={dragNpcId}
          dragHeroId={dragHeroId}
          onDragEnemyStart={setDragEnemyId}
          onDragNpcStart={setDragNpcId}
          onDragHeroStart={setDragHeroId}
          onDragEnd={resetDragUi}
        />
      </div>

      <div className="lg:hidden space-y-3">
        <CombatViewModeNav value={combatTab} onChange={setCombatTab} />

        {combatTab === "walka" && <div className="space-y-3">{renderFightBody()}</div>}

        {combatTab === "gotowi" && (
          <CombatMonstersMobileTab
            gmEnemies={gmEnemies}
            setGmEnemies={setGmEnemies}
            setCombatants={setCombatants}
            dragEnemyId={dragEnemyId}
            onDragEnemyStart={setDragEnemyId}
            onDragEnd={resetDragUi}
          />
        )}

        {combatTab === "postacie" && (
          <CombatRosterMobileTab
            savedNpcs={savedNpcs}
            heroes={heroRoster}
            setCombatants={setCombatants}
            dragNpcId={dragNpcId}
            dragHeroId={dragHeroId}
            onDragNpcStart={setDragNpcId}
            onDragHeroStart={setDragHeroId}
            onDragEnd={resetDragUi}
          />
        )}

        {combatTab === "presety" && (
          <CombatPresetsMobileTab
            presets={combatSessions.presets}
            onSavePresets={(presets) => setCombatSessions((prev) => ({ ...prev, presets }))}
            onSaveAsPresetFromFight={(name) => {
              setCombatSessions((prev) => addPresetFromFight(prev, name, combatants));
            }}
          />
        )}
      </div>
    </div>
  );
}