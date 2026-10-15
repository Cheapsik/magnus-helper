import type { Difficulty, OutcomeBand, TestType } from "@/lib/campaignSystem";
import { type DieRoller, isDiceNotation, rollDiceNotation } from "@/lib/diceNotation";
import { rollDie } from "@/lib/dice";

/**
 * Resolves one roll of a campaign's test type (CONTEXT.md: "Rodzaj testu").
 * Pure: every rule comes from the `TestType` the GM defined, and the die
 * roller is injected. See `TestMode` for what each mode compares.
 */

export type TestInput = {
  /** The source value — read off a card or typed in by the GM. */
  value: number;
  /** A step of the test type's difficulty ladder; falls back to its default. */
  difficultyId?: string;
  /** Situational bonus or penalty, applied on the value's side. */
  modifier?: number;
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
  const difficultyValue = difficulty?.value ?? 0;
  const modifier = input.modifier ?? 0;
  const base = { difficulty, value: input.value, modifier };
  const adjusted = input.value + modifier;

  if (testType.mode === "pool") return resolvePool(testType, base, adjusted + difficultyValue, roller);

  const rolled = rollDiceNotation(testType.dice, roller)!;
  const dice: Rolled = {
    natural: rolled.total - rolled.modifier,
    faces: rolled.dice.flatMap((group) => group.results),
  };

  if (testType.mode === "bands") {
    const total = rolled.total + adjusted + difficultyValue;
    const bands = testType.bands ?? [];
    const bandIndex = bands.findIndex((band) => band.atMost === undefined || total <= band.atMost);
    const band = bands[bandIndex] ?? null;
    const summary = `${band ? band.label : "Poza przedziałami"}: wynik ${total}`;
    return { kind: "bands", ...base, ...dice, total, band, bandIndex, summary };
  }

  const critical = criticalOf(testType, dice.natural);
  const compare = (rollLabel: string, rolledNumber: number, target: number, passed: boolean): Compared => {
    const success = critical ? critical === "success" : passed;
    const margin = Math.abs(rolledNumber - target);
    const divisor = testType.margin?.divisor;
    const degrees = divisor && divisor > 0 ? Math.floor(margin / divisor) : null;
    const degreesLabel = degrees === null ? null : testType.margin?.label.trim() || "Stopnie";
    const parts = [`${rollLabel} ${rolledNumber}`, `cel ${target}`, `margines ${margin}`];
    if (degrees !== null) parts.push(`${degreesLabel}: ${degrees}`);
    return {
      ...base,
      ...dice,
      target,
      success,
      margin,
      degrees,
      degreesLabel,
      critical,
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
  const hits = faces.filter((face) => face >= settings.successAt).length;
  const successes = settings.onesCancel ? Math.max(0, hits - ones) : hits;
  const success = successes >= settings.required;
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
    summary: `${verdict(success)}: sukcesów ${successes}, wymagane ${settings.required}`,
  };
}
