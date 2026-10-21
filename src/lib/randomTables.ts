import { rollDie } from "@/lib/dice";
import { rollDiceNotation, type DieRoller } from "@/lib/diceNotation";

export type RandomTable = {
  id: string;
  name: string;
  folder: string;
  /** Empty means "1k<highest entry>". */
  dice: string;
  /** One entry per line, as the GM typed or pasted it; parsed on demand. */
  text: string;
};

export type TableEntry = { from: number; to: number; text: string };

export type ParsedTable = { entries: TableEntry[]; issues: string[] };

export type TableRoll = {
  tableName: string;
  roll: number;
  /** Final text with every [[reference]] already rolled. */
  text: string;
  /** Rolls made for referenced tables, innermost first. */
  nested: { tableName: string; roll: number }[];
};

export const MAX_DEPTH = 5;

// "01-05 Tekst", "96–00 Tekst", "3. Tekst", "4) Tekst", "4 Tekst"
const NUMBERED = /^(\d+)(?:\s*[-–—]\s*(\d+))?\s*[.):]?\s+(.+)$/;
const REFERENCE = /\[\[([^\]]+)\]\]/g;

// "00" closes percentile tables, so it reads as 100.
const toNumber = (digits: string) => (/^0+$/.test(digits) ? 100 : Number(digits));

export function parseTableText(source: string): ParsedTable {
  const entries: TableEntry[] = [];
  const issues: string[] = [];
  let next = 1;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const match = NUMBERED.exec(line);
    if (!match) {
      entries.push({ from: next, to: next, text: line });
      next += 1;
      continue;
    }
    const from = toNumber(match[1]);
    const to = match[2] === undefined ? from : toNumber(match[2]);
    if (to < from) {
      issues.push(`Odwrócony zakres ${from}–${to}: „${match[3]}”`);
      continue;
    }
    entries.push({ from, to, text: match[3] });
    next = to + 1;
  }

  const sorted = [...entries].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.from <= prev.to) issues.push(`Zakresy nachodzą na siebie: ${label(prev)} i ${label(cur)}`);
    else if (cur.from > prev.to + 1) issues.push(`Luka: brak wpisu dla ${label({ from: prev.to + 1, to: cur.from - 1 })}`);
  }
  return { entries, issues };
}

const label = (e: Pick<TableEntry, "from" | "to">) => (e.from === e.to ? `${e.from}` : `${e.from}–${e.to}`);

export const entryLabel = label;

export function tableDice(table: RandomTable, entries: TableEntry[]): string {
  const explicit = table.dice.trim();
  if (explicit) return explicit;
  return `1k${Math.max(1, ...entries.map((e) => e.to))}`;
}

const findTable = (tables: RandomTable[], name: string) =>
  tables.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase());

/** Returns null when the die notation is invalid. */
export function rollTable(table: RandomTable, tables: RandomTable[], roll: DieRoller = rollDie): TableRoll | null {
  const nested: TableRoll["nested"] = [];
  const result = rollInner(table, tables, roll, [table.id], nested);
  return result && { ...result, nested };
}

function rollInner(
  table: RandomTable,
  tables: RandomTable[],
  roll: DieRoller,
  stack: string[],
  nested: TableRoll["nested"],
): Omit<TableRoll, "nested"> | null {
  const { entries } = parseTableText(table.text);
  const dice = rollDiceNotation(tableDice(table, entries), roll);
  if (!dice) return null;
  const entry = entries.find((e) => dice.total >= e.from && dice.total <= e.to);
  if (!entry) return { tableName: table.name, roll: dice.total, text: `(brak wpisu dla wyniku ${dice.total})` };

  const text = entry.text.replace(REFERENCE, (whole, name: string) => {
    const target = findTable(tables, name);
    // Unknown, cyclic or too-deep references stay visible so the GM can resolve them by hand.
    if (!target || stack.includes(target.id) || stack.length >= MAX_DEPTH) return whole;
    const sub = rollInner(target, tables, roll, [...stack, target.id], nested);
    if (!sub) return whole;
    nested.push({ tableName: sub.tableName, roll: sub.roll });
    return sub.text;
  });
  return { tableName: table.name, roll: dice.total, text };
}
