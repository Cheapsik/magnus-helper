import {
  type CardKind,
  type CardTypeDef,
  type FieldRef,
  type LabelledRef,
  emptyCardTypeDef,
} from "@/lib/cardSchema";

/**
 * Everything mechanical a campaign defines (CONTEXT.md: "System kampanii").
 * Magnus ships no rules of any game: every test, attack, condition and coin
 * below is data the GM owns and edits (docs/adr/0006).
 */

export const CAMPAIGN_SYSTEM_VERSION = 1;

/**
 * - `rollUnder` — roll the die, succeed at or under the source value plus the
 *   difficulty's value (percentile systems).
 * - `rollOver` — roll the die plus the source value, succeed at or over the
 *   difficulty's value, which is the target number (d20 systems).
 * - `pool` — roll as many dice as the source value plus the difficulty's
 *   value; each die at or over `pool.successAt` is a success.
 * - `bands` — roll the die plus the source value plus the difficulty's value
 *   and read which outcome band the total falls into (2d6 narrative systems).
 */
export type TestMode = "rollUnder" | "rollOver" | "pool" | "bands";

export const TEST_MODE_LABELS: Record<TestMode, string> = {
  rollUnder: "Rzut pod wartość",
  rollOver: "Rzut + wartość vs stopień trudności",
  pool: "Pula kości",
  bands: "Przedziały wyników",
};

export type Difficulty = {
  id: string;
  name: string;
  /** Meaning depends on the mode — see `TestMode`. */
  value: number;
};

export type OutcomeBand = {
  id: string;
  label: string;
  /** Upper bound of the band, inclusive. The last band has none. */
  atMost?: number;
};

export type TestType = {
  id: string;
  name: string;
  mode: TestMode;
  /** Dice notation; for `pool` the faces of a single die, e.g. "1k10". */
  dice: string;
  difficulties: Difficulty[];
  defaultDifficultyId?: string;
  /** rollUnder / rollOver: degrees of success = floor(margin / divisor). */
  margin?: { divisor: number; label: string };
  /** On the natural roll. */
  critical?: { successAtMost?: number; failureAtLeast?: number };
  pool?: { successAt: number; explodeAt?: number; onesCancel?: boolean; required: number };
  bands?: OutcomeBand[];
  /** Card fields the test may be rolled from, per card type. */
  sources: Record<CardKind, LabelledRef[]>;
};

export type DefenseType = { id: string; name: string };

/** How the attacker's roll decides a hit. */
export type HitResolution =
  | { kind: "self" }
  | { kind: "vsDefense"; defenseId: string }
  | { kind: "opposed"; tie: "defender" | "attacker" | "reroll" }
  | { kind: "manual" };

export const HIT_RESOLUTION_LABELS: Record<HitResolution["kind"], string> = {
  self: "Test atakującego",
  vsDefense: "Przeciw obronie celu",
  opposed: "Test przeciwstawny",
  manual: "Ręcznie",
};

export type DamageSpec = {
  /** `weapon`: a dice field/cell picked on the attacker's card at attack time. */
  source: "weapon" | "fixed" | "manual";
  fixed?: number;
  /** Adds the value of one attacker field (e.g. a strength bonus). No formulas. */
  addField?: Partial<Record<CardKind, FieldRef>>;
  addMargin?: boolean;
};

export type AttackType = {
  id: string;
  name: string;
  /** Unset: the attack roll is entered by hand. */
  testTypeId?: string;
  hit: HitResolution;
  damage: DamageSpec;
  reduction: { enabled: boolean; minimum: 0 | 1 };
  useHitLocations: boolean;
};

export type HitLocation = { id: string; name: string; atMost: number };

export type HitLocationTable = {
  /** Rolled separately unless `reverseAttackRoll` reads it off the attack roll's digits. */
  dice: string;
  reverseAttackRoll: boolean;
  locations: HitLocation[];
};

export type Condition = { id: string; name: string };

export type Denomination = {
  id: string;
  name: string;
  short: string;
  /** Worth of one coin in the smallest denomination. */
  rate: number;
};

export type CampaignSystem = {
  version: number;
  cards: Record<CardKind, CardTypeDef>;
  testTypes: TestType[];
  attackTypes: AttackType[];
  defenseTypes: DefenseType[];
  hitLocations: HitLocationTable | null;
  conditions: Condition[];
  currency: Denomination[];
};

export function emptyTestSources(): Record<CardKind, LabelledRef[]> {
  return { hero: [], npc: [], monster: [] };
}

/** The "pusta struktura" starting point: nothing but the card core. */
export function emptyCampaignSystem(): CampaignSystem {
  return {
    version: CAMPAIGN_SYSTEM_VERSION,
    cards: { hero: emptyCardTypeDef(), npc: emptyCardTypeDef(), monster: emptyCardTypeDef() },
    testTypes: [],
    attackTypes: [],
    defenseTypes: [],
    hitLocations: null,
    conditions: [],
    currency: [],
  };
}
