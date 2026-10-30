import type { Difficulty, OutcomeBand, TestType } from "@/lib/campaignSystem";
import { type DiceRollResult, type DieRoller, isDiceNotation, rollDiceNotation } from "@/lib/diceNotation";
import { rollDie } from "@/lib/dice";

/**
 * Resolves one roll of a campaign's test type (CONTEXT.md: "Rodzaj testu").
 * Pure: every rule comes from the `TestType` the GM defined, and the die
 * roller is injected. See `TestMode` for what each mode compares.
 */

export type RollMode = "normal" | "advantage" | "disadvantage";

export type TestInput = {
  /** The source value — read off a card or typed in by the GM. */
  value: number;
  /** A step of the test type's difficulty ladder; falls back to its default. */
  difficultyId?: string;
  /** Replaces the chosen step's value — a target's defense field taking the place of the ladder. */
  difficultyValue?: number;
  /** Situational bonus or penalty, applied on the value's side. */
  modifier?: number;
  /** Advantage: roll twice, keep better. Disadvantage: keep worse. */
  rollMode?: RollMode;
};

export type Critical = "success" | "failure" | null;

type Common = {
  difficulty: Difficulty | null;
  value: number;
  modifier: number;
  /** One line of Polish describing the result, for history and toasts. */
  summary: string;
};

type Rolled = {
  /** Sum of the dice faces alone, without the notation's flat part — what criticals are read from. */
  natural: number;
  /** Every face rolled, in notation order. */
  faces: number[];
  /** When advantage/disadvantage was used, the discarded roll's total. */
  discardedRoll?: number;
};

/** A single roll compared against a number. */
type Compared = Common &
  Rolled & {
    target: number;
    success: boolean;
    /** Distance between the compared numbers — of success or of failure, per `success`. */
    margin: number;
    /** floor(margin / divisor); null when the test type counts no margin. */
    degrees: number | null;
    degreesLabel: string | null;
    /** Read off the natural roll; a critical decides success on its own. */
    critical: Critical;
    /** The highest success level achieved, e.g. "Trudny" or "Ekstremalny". */
    successLevel?: string;
  };

export type TestOutcome =
  /** `roll` (notation total) ≤ `target` (value + modifier + difficulty). */
  | (Compared & { kind: "rollUnder"; roll: number })
  /** `total` (notation total + value + modifier) ≥ `target` (difficulty). */
  | (Compared & { kind: "rollOver"; total: number })
  | (Common & {
      kind: "pool";
      /** Dice in the pool (value + modifier + difficulty) before any explode. */
      diceCount: number;
      sides: number;
      /** Every face rolled, exploded dice included, in roll order. */
      faces: number[];
      successes: number;
      /** Dice showing 1 — they cancel successes when the test type says so. */
      ones: number;
      required: number;
      success: boolean;
      /** The first die's result when it's a special die (Wrath Die). */
      specialDieResult?: number;
      /** Complication: special die rolled a 1. */
      complication?: boolean;
      /** Glory: special die rolled max. */
      glory?: boolean;
    })
  | (Common &
      Rolled & {
        kind: "bands";
        /** Notation total + value + modifier + difficulty. */
        total: number;
        /** null when the total runs past bands that all have an upper bound. */
        band: OutcomeBand | null;
        bandIndex: number;
      })
  /** The test type cannot be rolled as defined; nothing was rolled. */
  | { kind: "invalid"; summary: string };

/** Guards a GM-set explode threshold every face meets (e.g. "explode on 1"). */
const MAX_EXPLOSIONS = 100;

/** The chosen step, else the test type's default, else the first; null on an empty ladder. */
export function pickDifficulty(testType: TestType, difficultyId?: string): Difficulty | null {
  const { difficulties } = testType;
  return (
    difficulties.find((d) => d.id === difficultyId) ??
    difficulties.find((d) => d.id === testType.defaultDifficultyId) ??
    difficulties[0] ??
    null
  );
}

/** The faces of one die in the notation; the count in "3k10" is ignored, the pool size decides it. */
function dieSides(notation: string): number | null {
  return rollDiceNotation(notation, (sides) => sides)?.dice[0]?.sides ?? null;
}

/** Why the test type's dice cannot be rolled, or null when they can. */
export function diceIssue(testType: Pick<TestType, "mode" | "dice">): string | null {
  if (!isDiceNotation(testType.dice)) return `Niepoprawna notacja kości: „${testType.dice}”`;
  if (testType.mode === "pool" && dieSides(testType.dice) === null) {
    return "Pula kości potrzebuje kości, np. „1k10”, a nie samej liczby";
  }
  return null;
}

function criticalOf(testType: TestType, natural: number): Critical {
  const thresholds = testType.critical;
  if (!thresholds) return null;
  const { successAtMost, successAtLeast, failureAtMost, failureAtLeast } = thresholds;
  if (successAtMost !== undefined && natural <= successAtMost) return "success";
  if (successAtLeast !== undefined && natural >= successAtLeast) return "success";
  if (failureAtMost !== undefined && natural <= failureAtMost) return "failure";
  if (failureAtLeast !== undefined && natural >= failureAtLeast) return "failure";
  return null;
}

function verdict(success: boolean, critical: Critical = null): string {
  if (critical === "success") return "Krytyczny sukces";
  if (critical === "failure") return "Krytyczna porażka";
  return success ? "Sukces" : "Porażka";
}

export function resolveTest(testType: TestType, input: TestInput, roller: DieRoller = rollDie): TestOutcome {
  const issue = diceIssue(testType);
  if (issue) return { kind: "invalid", summary: issue };

  const difficulty = pickDifficulty(testType, input.difficultyId);
  const difficultyValue = input.difficultyValue ?? difficulty?.value ?? 0;
  const modifier = input.modifier ?? 0;
  const base = { difficulty, value: input.value, modifier };
  const adjusted = input.value + modifier;

  if (testType.mode === "pool") return resolvePool(testType, base, adjusted + difficultyValue, roller);

  const rollMode = input.rollMode ?? "normal";
  const pickRoll = (a: DiceRollResult, b: DiceRollResult): DiceRollResult => {
    if (rollMode === "normal") return a;
    const better = testType.mode === "rollUnder" ? a.total <= b.total : a.total >= b.total;
    return (rollMode === "advantage") === better ? a : b;
  };
  const roll1 = rollDiceNotation(testType.dice, roller)!;
  const roll2 = rollMode !== "normal" ? rollDiceNotation(testType.dice, roller)! : roll1;
  const rolled = pickRoll(roll1, roll2);
  const discarded = rollMode !== "normal" ? (rolled === roll1 ? roll2 : roll1) : undefined;
  const dice: Rolled = {
    natural: rolled.total - rolled.modifier,
    faces: rolled.dice.flatMap((group) => group.results),
    ...(discarded ? { discardedRoll: discarded.total } : {}),
  };

  if (testType.mode === "bands") {
    const total = rolled.total + adjusted + difficultyValue;
    const bands = testType.bands ?? [];
    const bandIndex = bands.findIndex((band) => band.atMost === undefined || total <= band.atMost);
    const band = bands[bandIndex] ?? null;
    const summary = `${band ? band.label : "Poza przedziałami"}: wynik ${total}`;
    return { kind: "bands", ...base, ...dice, total, band, bandIndex, summary };
  }

  let critical = criticalOf(testType, dice.natural);
  // Skill-dependent critical failure: for rollUnder, high-skill (≥50) fails at threshold, low-skill (<50) fails when roll > value
  if (testType.skillDependentCritFailure && testType.mode === "rollUnder" && critical === null) {
    const target = adjusted + difficultyValue;
    if (target < 50 && dice.natural > target && dice.natural >= 96) critical = "failure";
  }
  const compare = (rollLabel: string, rolledNumber: number, target: number, passed: boolean): Compared => {
    const success = critical ? critical === "success" : passed;
    const margin = Math.abs(rolledNumber - target);
    const divisor = testType.margin?.divisor;
    const degrees = divisor && divisor > 0 ? Math.floor(margin / divisor) : null;
    const degreesLabel = degrees === null ? null : testType.margin?.label.trim() || "Stopnie";
    // Success levels (rollUnder): check from hardest to easiest
    let successLevel: string | undefined;
    if (success && testType.successLevels?.length && testType.mode === "rollUnder") {
      const sorted = [...testType.successLevels].sort((a, b) => b.divisor - a.divisor);
      for (const level of sorted) {
        if (level.divisor > 0 && rolledNumber <= Math.floor(target / level.divisor)) {
          successLevel = level.label;
          break;
        }
      }
    }
    const parts = [`${rollLabel} ${rolledNumber}`, `cel ${target}`, `margines ${margin}`];
    if (degrees !== null) parts.push(`${degreesLabel}: ${degrees}`);
    if (successLevel) parts.push(successLevel);
    return {
      ...base,
      ...dice,
      target,
      success,
      margin,
      degrees,
      degreesLabel,
      critical,
      successLevel,
      summary: `${verdict(success, critical)}: ${parts.join(", ")}`,
    };
  };

  if (testType.mode === "rollOver") {
    const total = rolled.total + adjusted;
    return { kind: "rollOver", ...compare("wynik", total, difficultyValue, total >= difficultyValue), total };
  }

  const target = adjusted + difficultyValue;
  return { kind: "rollUnder", ...compare("rzut", rolled.total, target, rolled.total <= target), roll: rolled.total };
}

function resolvePool(
  testType: TestType,
  base: Omit<Common, "summary">,
  size: number,
  roller: DieRoller,
): TestOutcome {
  const settings = testType.pool ?? { successAt: 1, required: 1 };
  const sides = dieSides(testType.dice)!;
  const diceCount = Math.max(0, size);
  const faces = Array.from({ length: diceCount }, () => roller(sides));
  const { explodeAt } = settings;
  if (explodeAt !== undefined) {
    // Breadth-first: the pool as rolled, then each explosion in turn.
    for (let i = 0; i < faces.length && faces.length < diceCount + MAX_EXPLOSIONS; i++) {
      if (faces[i] >= explodeAt) faces.push(roller(sides));
    }
  }
  const ones = faces.filter((face) => face === 1).length;
  let hits = 0;
  for (const face of faces) {
    if (settings.doubleAt !== undefined && face >= settings.doubleAt) hits += 2;
    else if (face >= settings.successAt) hits += 1;
  }
  const successes = settings.onesCancel ? Math.max(0, hits - ones) : hits;
  const success = successes >= settings.required;
  const specialDie = settings.specialDie && faces.length > 0;
  const specialDieResult = specialDie ? faces[0] : undefined;
  const complication = specialDie ? faces[0] === 1 : undefined;
  const glory = specialDie ? faces[0] === sides : undefined;
  const extras: string[] = [];
  if (complication) extras.push("komplikacja!");
  if (glory) extras.push("chwała!");
  const summaryExtra = extras.length ? ` · ${extras.join(", ")}` : "";
  return {
    kind: "pool",
    ...base,
    diceCount,
    sides,
    faces,
    successes,
    ones,
    required: settings.required,
    success,
    ...(specialDieResult !== undefined ? { specialDieResult, complication, glory } : {}),
    summary: `${verdict(success)}: sukcesów ${successes}, wymagane ${settings.required}${summaryExtra}`,
  };
}
