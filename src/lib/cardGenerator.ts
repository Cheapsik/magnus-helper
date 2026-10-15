import {
  type Card,
  type CardKind,
  type CardTypeDef,
  type CardValues,
  type CellValue,
  type ColumnDef,
  type FieldDef,
  type FieldValue,
  type RandomRule,
  type TableValue,
  createEmptyCard,
  defaultValueForField,
  visibleFields,
} from "@/lib/cardSchema";
import type { DieRoller } from "@/lib/diceNotation";
import { rollDie } from "@/lib/dice";

/** A whole number from min to max inclusive, rolled on a single die of the range's size. */
function pickRange(rule: Extract<RandomRule, { kind: "range" }>, roll: DieRoller): number {
  const low = Math.round(Math.min(rule.min, rule.max));
  const high = Math.round(Math.max(rule.min, rule.max));
  return low + roll(high - low + 1) - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A text-like value: a list entry, or a range result written out. Undefined for an empty list. */
function pickString(rule: RandomRule, roll: DieRoller): string | undefined {
  if (rule.kind === "range") return String(pickRange(rule, roll));
  if (rule.values.length === 0) return undefined;
  return rule.values[roll(rule.values.length) - 1];
}

function generateField(field: FieldDef, roll: DieRoller): FieldValue {
  if (field.type === "table") return generateTable(field, roll);
  const rule = field.random;
  if (!rule) return defaultValueForField(field);
  switch (field.type) {
    case "number":
      return rule.kind === "range" ? pickRange(rule, roll) : defaultValueForField(field);
    case "track":
      return rule.kind === "range"
        ? clamp(pickRange(rule, roll), 0, field.trackMax ?? Number.POSITIVE_INFINITY)
        : defaultValueForField(field);
    case "currentMax": {
      if (rule.kind !== "range") return defaultValueForField(field);
      const max = pickRange(rule, roll);
      return { current: max, max };
    }
    case "text":
    case "longtext":
    case "select":
    case "dice":
      return pickString(rule, roll) ?? defaultValueForField(field);
    default:
      return defaultValueForField(field);
  }
}

function generateCell(column: ColumnDef, roll: DieRoller): CellValue | undefined {
  const rule = column.random;
  if (!rule) return undefined;
  switch (column.type) {
    case "number":
      return rule.kind === "range" ? pickRange(rule, roll) : undefined;
    case "text":
    case "select":
    case "dice":
      return pickString(rule, roll);
    default:
      return undefined;
  }
}

function generateTable(field: FieldDef, roll: DieRoller): TableValue {
  if (field.rowMode?.kind !== "fixed") return { rows: [] };
  return {
    rows: field.rowMode.rows.map((row) => {
      const cells: Record<string, CellValue> = {};
      for (const column of field.columns ?? []) {
        const cell = generateCell(column, roll);
        if (cell !== undefined) cells[column.id] = cell;
      }
      return { id: row.id, cells };
    }),
  };
}

/**
 * Rolls values for every visible field of a card type from its "reguła
 * losowania" (CONTEXT.md). Fields and columns without a rule, dynamic tables
 * and types a rule cannot fill (checkbox, multiselect) get their default.
 */
export function generateCardValues(cardType: CardTypeDef, roll: DieRoller = rollDie): CardValues {
  const values: CardValues = {};
  for (const field of visibleFields(cardType)) {
    values[field.id] = generateField(field, roll);
  }
  return values;
}

/** A new card with an empty core (portrait, notes) and rolled values. */
export function generateCard(kind: CardKind, cardType: CardTypeDef, name: string, roll: DieRoller = rollDie): Card {
  return { ...createEmptyCard(kind, cardType, name), values: generateCardValues(cardType, roll) };
}
