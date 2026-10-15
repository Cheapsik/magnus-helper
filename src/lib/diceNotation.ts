import { rollDie } from "@/lib/dice";

/** Returns a face from 1 to `sides`. Injected so results are testable. */
export type DieRoller = (sides: number) => number;

type Term =
  | { kind: "dice"; sign: 1 | -1; count: number; sides: number }
  | { kind: "flat"; sign: 1 | -1; value: number };

export type DiceRollResult = {
  total: number;
  /** Every die rolled, grouped by term, in notation order. */
  dice: { sides: number; results: number[] }[];
  /** Sum of the flat terms. */
  modifier: number;
};

const TERM = /^(\d*)[kd](\d+)$|^(\d+)$/;

/** Accepts "2k6+3", "1d8-1", "k100", "3k6 + 1k4 + 2" or a plain number. */
function parse(notation: string): Term[] | null {
  const compact = notation.replace(/\s+/g, "").toLowerCase();
  if (compact === "") return null;
  const parts = compact.match(/[+-]?[^+-]+/g);
  if (!parts || parts.join("") !== compact) return null;

  const terms: Term[] = [];
  for (const part of parts) {
    const sign: 1 | -1 = part.startsWith("-") ? -1 : 1;
    const match = TERM.exec(part.replace(/^[+-]/, ""));
    if (!match) return null;
    if (match[3] !== undefined) {
      terms.push({ kind: "flat", sign, value: Number(match[3]) });
      continue;
    }
    const count = match[1] === "" ? 1 : Number(match[1]);
    const sides = Number(match[2]);
    if (count < 1 || sides < 1) return null;
    terms.push({ kind: "dice", sign, count, sides });
  }
  return terms;
}

export function isDiceNotation(notation: string): boolean {
  return parse(notation) !== null;
}

export function rollDiceNotation(notation: string, roll: DieRoller = rollDie): DiceRollResult | null {
  const terms = parse(notation);
  if (!terms) return null;

  const result: DiceRollResult = { total: 0, dice: [], modifier: 0 };
  for (const term of terms) {
    if (term.kind === "flat") {
      result.modifier += term.sign * term.value;
      continue;
    }
    const results = Array.from({ length: term.count }, () => roll(term.sides));
    result.dice.push({ sides: term.sides, results });
    result.total += term.sign * results.reduce((sum, face) => sum + face, 0);
  }
  result.total += result.modifier;
  return result;
}
