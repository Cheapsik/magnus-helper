import { type Card, type CardKind, readNumberRef } from "@/lib/cardSchema";
import type { AttackType, CampaignSystem, HitLocation, HitLocationTable } from "@/lib/campaignSystem";
import { rollDie } from "@/lib/dice";
import { type DieRoller, rollDiceNotation } from "@/lib/diceNotation";
import { type TestOutcome, resolveTest } from "@/lib/testEngine";

/**
 * Resolves one attack of a campaign's attack type (CONTEXT.md: "Rodzaj ataku").
 * Pure: every rule comes from the `AttackType` the GM defined, and the die
 * roller is injected. Two phases, so a GM who decides the hit by hand keeps the
 * roll: `resolveHit` first, `resolveDamage` once the attack has landed.
 */

/** A combatant's card, so roles and fields can be read off it. */
export type Party = { kind: CardKind; card: Card };

export type HitInput = {
  /** The attacker's source value — read off a card or typed in by the GM. */
  attackValue: number;
  difficultyId?: string;
  modifier?: number;
  /** Needed by `vsDefense`. */
  target?: Party;
  /** Needed by `opposed`: the defender's value for the same test type. */
  defenderValue?: number;
};

export type HitResult = {
  /** null when the attack type has no (valid) test type: the roll is the GM's. */
  attack: TestOutcome | null;
  /** Only for `opposed`. */
  defense: TestOutcome | null;
  /** Only for `vsDefense`: the target's defense field. */
  defenseValue: number | null;
  /** null: the GM decides. */
  hit: boolean | null;
  tied: boolean;
  summary: string;
};

/** Success or failure of an outcome; null for outcomes with neither (bands, invalid). */
function succeeded(outcome: TestOutcome): boolean | null {
  return outcome.kind === "bands" || outcome.kind === "invalid" ? null : outcome.success;
}

/** What an opposed roll is judged by: the higher score wins. */
function score(outcome: TestOutcome): number {
  switch (outcome.kind) {
    case "rollUnder":
      return outcome.success ? outcome.margin : -outcome.margin;
    case "rollOver":
    case "bands":
      return outcome.total;
    case "pool":
      return outcome.successes;
    case "invalid":
      return 0;
  }
}

function hitResult(
  parts: Pick<HitResult, "attack"> & Partial<HitResult>,
  hit: boolean | null,
  note?: string,
): HitResult {
  const verdict = hit === null ? "Rozstrzygnij ręcznie" : hit ? "Trafienie" : "Pudło";
  const detail = [parts.attack?.summary, note].filter(Boolean).join(" · ");
  return {
    defense: null,
    defenseValue: null,
    tied: false,
    ...parts,
    hit,
    summary: detail ? `${verdict}: ${detail}` : verdict,
  };
}

export function resolveHit(
  system: CampaignSystem,
  attackType: AttackType,
  input: HitInput,
  roller: DieRoller = rollDie,
): HitResult {
  const testType = system.testTypes.find((t) => t.id === attackType.testTypeId);
  if (!testType) return hitResult({ attack: null }, null);

  const roll = { value: input.attackValue, difficultyId: input.difficultyId, modifier: input.modifier };
  const { hit } = attackType;

  if (hit.kind === "vsDefense") {
    const ref = input.target && system.cards[input.target.kind].roles.defenses[hit.defenseId];
    const defenseValue = input.target && ref ? readNumberRef(input.target.card.values, ref) : null;
    const attack = resolveTest(testType, { ...roll, difficultyValue: defenseValue ?? undefined }, roller);
    const note = defenseValue === null ? "brak pola obrony celu" : `obrona ${defenseValue}`;
    return hitResult({ attack, defenseValue }, defenseValue === null ? null : succeeded(attack), note);
  }

  const attack = resolveTest(testType, roll, roller);
  if (hit.kind === "self") return hitResult({ attack }, succeeded(attack));
  if (hit.kind === "manual" || input.defenderValue === undefined) return hitResult({ attack }, null);

  const defense = resolveTest(testType, { value: input.defenderValue, difficultyId: input.difficultyId }, roller);
  if (attack.kind === "invalid" || defense.kind === "invalid") return hitResult({ attack, defense }, null);
  if (succeeded(attack) === false) return hitResult({ attack, defense }, false, `obrońca: ${defense.summary}`);

  const mine = score(attack);
  const theirs = score(defense);
  const note = `obrońca: ${defense.summary}`;
  if (mine !== theirs) return hitResult({ attack, defense }, mine > theirs, note);
  const byTie = { attacker: true, defender: false, reroll: null }[hit.tie];
  return hitResult({ attack, defense, tied: true }, byTie, `remis · ${note}`);
}

export type DamageInput = {
  attacker?: Party;
  target?: Party;
  /** The attack roll, for the margin and for reversed-roll hit locations. */
  attack: TestOutcome | null;
  /** `weapon`: the dice field/cell picked on the attacker's card. */
  weaponDice?: string;
  /** `manual`: what the GM typed. */
  manualDamage?: number;
};

export type DamageResult = {
  location: { location: HitLocation; roll: number } | null;
  /** Before bonuses; null when the damage must be entered by hand. */
  base: number | null;
  fieldBonus: number;
  marginBonus: number;
  raw: number | null;
  reduction: number;
  /** What to take off the target's resource; null when there is no base damage. */
  final: number | null;
  summary: string;
};

/** How far a successful attack beat its target. */
function marginOf(attack: TestOutcome | null): number {
  if (!attack) return 0;
  if (attack.kind === "rollUnder" || attack.kind === "rollOver") return attack.success ? attack.margin : 0;
  if (attack.kind === "pool") return attack.success ? attack.successes - attack.required : 0;
  return 0;
}

/** A percentile roll with its two digits swapped; 100 reads as 00 and stays 100. */
function reversePercentile(roll: number): number {
  const digits = roll === 100 ? 0 : roll;
  const reversed = (digits % 10) * 10 + Math.floor(digits / 10);
  return reversed === 0 ? 100 : reversed;
}

function rollLocation(
  table: HitLocationTable,
  attack: TestOutcome | null,
  roller: DieRoller,
): { location: HitLocation; roll: number } | null {
  const reversible =
    table.reverseAttackRoll && attack && (attack.kind === "rollUnder" || attack.kind === "rollOver") && attack.natural >= 1 && attack.natural <= 100;
  const roll = reversible ? reversePercentile(attack.natural) : rollDiceNotation(table.dice, roller)?.total;
  const ordered = [...table.locations].sort((a, b) => a.atMost - b.atMost);
  if (roll === undefined || ordered.length === 0) return null;
  return { location: ordered.find((l) => roll <= l.atMost) ?? ordered[ordered.length - 1], roll };
}

export function resolveDamage(
  system: CampaignSystem,
  attackType: AttackType,
  input: DamageInput,
  roller: DieRoller = rollDie,
): DamageResult {
  const spec = attackType.damage;
  const base =
    spec.source === "weapon"
      ? input.weaponDice
        ? (rollDiceNotation(input.weaponDice, roller)?.total ?? null)
        : null
      : spec.source === "fixed"
        ? (spec.fixed ?? 0)
        : (input.manualDamage ?? null);

  const bonusRef = input.attacker && spec.addField?.[input.attacker.kind];
  const fieldBonus = input.attacker && bonusRef ? readNumberRef(input.attacker.card.values, bonusRef) : 0;
  const marginBonus = spec.addMargin ? marginOf(input.attack) : 0;
  const raw = base === null ? null : base + fieldBonus + marginBonus;

  const table = attackType.useHitLocations ? system.hitLocations : null;
  const location = table && raw !== null ? rollLocation(table, input.attack, roller) : null;

  let reduction = 0;
  if (attackType.reduction.enabled && input.target) {
    const { roles } = system.cards[input.target.kind];
    const values = input.target.card.values;
    const locationRef = location ? roles.locationReduction[location.location.id] : undefined;
    reduction = locationRef
      ? readNumberRef(values, locationRef)
      : roles.damageReduction.reduce((sum, entry) => sum + readNumberRef(values, entry.ref), 0);
  }
  const floor = attackType.reduction.enabled ? attackType.reduction.minimum : 0;
  const final = raw === null ? null : Math.max(floor, raw - reduction);

  const parts = [
    final === null ? "Wpisz obrażenia ręcznie" : `Obrażenia ${raw} − redukcja ${reduction} = ${final}`,
    location ? `lokacja: ${location.location.name} (${location.roll})` : null,
  ];
  return { location, base, fieldBonus, marginBonus, raw, reduction, final, summary: parts.filter(Boolean).join(" · ") };
}
