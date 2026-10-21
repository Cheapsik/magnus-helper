import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dices, Settings2, Swords, X } from "lucide-react";
import { toast } from "sonner";
import type { Combatant } from "@/context/AppContext";
import { type Card as CampaignCard, type CardKind, type LabelledRef, readNumberRef } from "@/lib/cardSchema";
import type { AttackType, CampaignSystem } from "@/lib/campaignSystem";
import { useCampaignSystem, useCards } from "@/lib/cardStore";
import { type DamageResult, type HitResult, type Party, resolveDamage, resolveHit, weaponDiceOptions } from "@/lib/combatEngine";
import { refKey } from "@/lib/structureOps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

const MANUAL = "manual";

const selectCls =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type SetCombatants = (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;

/** Resolves an attack with the campaign's attack types (docs/adr/0006, src/lib/combatEngine.ts). */
export function CombatAttackPanel({
  attackerId,
  combatants,
  setCombatants,
  onClose,
}: {
  attackerId: string;
  combatants: Combatant[];
  setCombatants: SetCombatants;
  onClose: () => void;
}) {
  const [system] = useCampaignSystem();
  const [heroes] = useCards("hero");
  const [npcs] = useCards("npc");
  const [monsters] = useCards("monster");
  const cardsByKind: Record<CardKind, CampaignCard[]> = { hero: heroes, npc: npcs, monster: monsters };

  const partyOf = (combatant?: Combatant): Party | undefined => {
    const ref = combatant?.card;
    const card = ref && cardsByKind[ref.kind].find((c) => c.id === ref.id);
    return card ? { kind: card.kind, card } : undefined;
  };

  const attacker = combatants.find((c) => c.id === attackerId);
  if (!attacker) return null;

  if (system.attackTypes.length === 0) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="flex items-center gap-2 p-3 text-sm">
          <span className="flex-1 text-muted-foreground">
            Ta kampania nie ma rodzajów ataku, więc zmieniaj zasób ręcznie przyciskami na karcie uczestnika albo zdefiniuj atak.
          </span>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/settings?tab=walka">
              <Settings2 className="h-3.5 w-3.5" /> Rodzaje ataku
            </Link>
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Zamknij">
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <AttackForm
      system={system}
      attacker={attacker}
      others={combatants.filter((c) => c.id !== attackerId)}
      partyOf={partyOf}
      setCombatants={setCombatants}
      onClose={onClose}
    />
  );
}

/** A value read off a card through one of a test type's sources, or typed in. */
function useValueSource(party: Party | undefined, sources: LabelledRef[]) {
  const [key, setKey] = useState<string>();
  const [manual, setManual] = useState(0);
  const source = key === MANUAL ? undefined : (sources.find((s) => refKey(s.ref) === key) ?? sources[0]);
  const fromCard = Boolean(party && source);
  const value = party && source ? readNumberRef(party.card.values, source.ref) : manual;
  return { key, setKey, manual, setManual, source, fromCard, value };
}

function ValuePicker({
  label,
  party,
  sources,
  state,
}: {
  label: string;
  party: Party | undefined;
  sources: LabelledRef[];
  state: ReturnType<typeof useValueSource>;
}) {
  const canPick = Boolean(party) && sources.length > 0;
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        {canPick && (
          <select
            className={selectCls}
            value={state.source ? refKey(state.source.ref) : MANUAL}
            onChange={(e) => state.setKey(e.target.value)}
            aria-label={label}
          >
            {sources.map((s) => (
              <option key={refKey(s.ref)} value={refKey(s.ref)}>
                {s.label} ({party ? readNumberRef(party.card.values, s.ref) : 0})
              </option>
            ))}
            <option value={MANUAL}>Wpisz ręcznie</option>
          </select>
        )}
        {!state.fromCard && (
          <NumberInput value={state.manual} onChange={state.setManual} className="h-9 w-24 text-center" aria-label={`${label}: wartość`} />
        )}
      </div>
    </div>
  );
}

function AttackForm({
  system,
  attacker,
  others,
  partyOf,
  setCombatants,
  onClose,
}: {
  system: CampaignSystem;
  attacker: Combatant;
  others: Combatant[];
  partyOf: (combatant?: Combatant) => Party | undefined;
  setCombatants: SetCombatants;
  onClose: () => void;
}) {
  const [attackTypeId, setAttackTypeId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();
  const [difficultyId, setDifficultyId] = useState<string>();
  const [modifier, setModifier] = useState(0);
  const [hitResult, setHitResult] = useState<HitResult | null>(null);
  const [called, setCalled] = useState<boolean | null>(null);
  const [damage, setDamage] = useState<DamageResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [weaponNotation, setWeaponNotation] = useState<string>();
  const [manualDamage, setManualDamage] = useState(0);

  const attackType: AttackType = system.attackTypes.find((a) => a.id === attackTypeId) ?? system.attackTypes[0];
  const testType = system.testTypes.find((t) => t.id === attackType.testTypeId);
  const isOut = (c: Combatant) => c.resource.max > 0 && c.resource.current <= 0;
  const target = others.find((c) => c.id === targetId) ?? others.find((c) => c.isEnemy !== attacker.isEnemy && !isOut(c)) ?? others[0];
  const attackerParty = partyOf(attacker);
  const targetParty = partyOf(target);

  const attackerSources = testType && attackerParty ? testType.sources[attackerParty.kind] : [];
  const defenderSources = testType && targetParty ? testType.sources[targetParty.kind] : [];
  const attackSource = useValueSource(attackerParty, attackerSources);
  const defenderSource = useValueSource(targetParty, defenderSources);

  const opposed = attackType.hit.kind === "opposed";
  const showDifficulty = testType && attackType.hit.kind !== "vsDefense" && testType.difficulties.length > 0;
  const diceOptions = useMemo(
    () => (attackerParty ? weaponDiceOptions(system.cards[attackerParty.kind], attackerParty.card) : []),
    [system, attackerParty],
  );
  const notation = weaponNotation ?? diceOptions[0]?.notation ?? "";

  const hit = hitResult ? (hitResult.hit ?? called) : null;

  const rollAttack = () => {
    setHitResult(
      resolveHit(system, attackType, {
        attackValue: attackSource.value,
        difficultyId,
        modifier,
        target: targetParty,
        defenderValue: opposed ? defenderSource.value : undefined,
      }),
    );
    setCalled(null);
    setDamage(null);
    setApplied(false);
  };

  const rollDamage = () => {
    setDamage(
      resolveDamage(system, attackType, {
        attacker: attackerParty,
        target: targetParty,
        attack: hitResult?.attack ?? null,
        weaponDice: notation,
        manualDamage,
      }),
    );
    setApplied(false);
  };

  const applyDamage = () => {
    if (!target || damage?.final == null) return;
    const { final } = damage;
    setCombatants((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, resource: { ...c.resource, current: Math.max(0, c.resource.current - final) } } : c)),
    );
    setApplied(true);
    toast.success(`${target.name}: −${final}${target.resourceLabel ? ` ${target.resourceLabel}` : ""}`);
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-medium">Akcja: {attacker.name}</span>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Zamknij">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Rodzaj ataku</span>
            <select className={selectCls} value={attackType.id} onChange={(e) => setAttackTypeId(e.target.value)}>
              {system.attackTypes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name.trim() || "Bez nazwy"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Cel</span>
            <select className={selectCls} value={target?.id ?? ""} onChange={(e) => setTargetId(e.target.value)} disabled={others.length === 0}>
              {others.length === 0 && <option value="">Brak innych uczestników</option>}
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.resource.max > 0 ? ` (${c.resource.current}/${c.resource.max})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {testType && (
          <div className="grid gap-2 sm:grid-cols-2">
            <ValuePicker label={`${testType.name}: wartość atakującego`} party={attackerParty} sources={attackerSources} state={attackSource} />
            {opposed && (
              <ValuePicker label={`${testType.name}: wartość broniącego`} party={targetParty} sources={defenderSources} state={defenderSource} />
            )}
            {showDifficulty && (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Poziom trudności</span>
                <select className={selectCls} value={difficultyId ?? ""} onChange={(e) => setDifficultyId(e.target.value || undefined)}>
                  <option value="">Domyślny</option>
                  {testType.difficulties.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.value})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Modyfikator</span>
              <NumberInput value={modifier} onChange={setModifier} className="h-9 w-24 text-center" aria-label="Modyfikator" />
            </div>
          </div>
        )}

        <Button onClick={rollAttack} className="w-full gap-2">
          <Dices className="h-4 w-4" />
          {hitResult ? "Rzuć atak ponownie" : testType ? "Rzuć atak" : "Dalej"}
        </Button>

        {hitResult && (
          <div
            className={cn(
              "rounded-md border-2 p-2 text-center text-sm",
              hit === true && "border-success",
              hit === false && "border-destructive",
              hit === null && "border-primary",
            )}
          >
            <div>{hitResult.summary}</div>
            {hitResult.tied && hitResult.hit === null && <div className="text-xs text-muted-foreground">Remis: rzuć atak ponownie.</div>}
            {hit === null && !hitResult.tied && (
              <div className="mt-2 flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCalled(true)}>
                  Trafienie
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCalled(false)}>
                  Pudło
                </Button>
              </div>
            )}
          </div>
        )}

        {hit === true && (
          <div className="space-y-2">
            {attackType.damage.source === "weapon" && (
              <div className="flex gap-2">
                {diceOptions.length > 0 && (
                  <select className={selectCls} value={notation} onChange={(e) => setWeaponNotation(e.target.value)} aria-label="Kości z karty">
                    {diceOptions.map((o) => (
                      <option key={`${o.label}|${o.notation}`} value={o.notation}>
                        {o.label} ({o.notation})
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  value={notation}
                  onChange={(e) => setWeaponNotation(e.target.value)}
                  placeholder="np. 1k8+2"
                  className="h-9 w-32"
                  aria-label="Kości obrażeń"
                />
              </div>
            )}
            {attackType.damage.source === "manual" && (
              <NumberInput value={manualDamage} onChange={setManualDamage} className="h-9 w-24 text-center" aria-label="Obrażenia" />
            )}
            <Button onClick={rollDamage} variant="secondary" className="w-full">
              {attackType.damage.source === "fixed" ? "Policz obrażenia" : "Rzuć obrażenia"}
            </Button>
          </div>
        )}

        {hit === true && damage && (
          <div className="space-y-2 rounded-md border bg-card p-2 text-center text-sm">
            <div>{damage.summary}</div>
            <Button onClick={applyDamage} disabled={applied || damage.final === null || !target} className="w-full">
              {applied ? "Zadano" : damage.final === null ? "Brak obrażeń do zadania" : `Zadaj ${damage.final}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
