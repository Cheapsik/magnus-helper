import { rollDie } from "@/lib/dice";
import { rollDiceNotation, type DieRoller } from "@/lib/diceNotation";
import { conditionsHold, EMPTY_CONTEXT, type TableCondition, type TableContext } from "@/lib/tableConditions";

/** Per-entry metadata, kept beside the text (keyed by the entry's text) so the text format stays plain. */
export type EntryMeta = { weight?: number; conditions?: TableCondition[] };

export type RandomTable = {
  id: string;
  name: string;
  folder: string;
  /** Empty means "1k<highest entry>". */
  dice: string;
  /** One entry per line, as the GM typed or pasted it; parsed on demand. */
  text: string;
  /** The whole table is skipped (and unavailable in the quick-roll panel) unless these hold. */
  conditions?: TableCondition[];
  entryMeta?: Record<string, EntryMeta>;
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


export const tableAvailable = (table: RandomTable, ctx: TableContext) => conditionsHold(table.conditions, ctx);

/** Returns null when the die notation is invalid. `ctx` is passed on to every referenced table. */
export function rollTable(
  table: RandomTable,
  tables: RandomTable[],
  roll: DieRoller = rollDie,
  ctx: TableContext = EMPTY_CONTEXT,
): TableRoll | null {
  const nested: TableRoll["nested"] = [];
  if (!tableAvailable(table, ctx)) return { tableName: table.name, roll: 0, text: "(tabela niedostępna w obecnym kontekście)", nested };
  const result = rollInner(table, tables, roll, [table.id], nested, ctx);
  return result && { ...result, nested };
}

/** Weights are whole numbers >= 1 so they can be rolled with a plain die. */
const weightOf = (m?: EntryMeta) => Math.max(1, Math.round(m?.weight ?? 1));

function pick(table: RandomTable, entries: TableEntry[], roll: DieRoller, ctx: TableContext): { roll: number; entry?: TableEntry; none?: boolean } | null {
  const meta = table.entryMeta ?? {};
  const eligible = entries.filter((e) => conditionsHold(meta[e.text]?.conditions, ctx));
  const weighted = eligible.some((e) => meta[e.text]?.weight !== undefined);
  // Untouched tables keep the classic die-and-range roll.
  if (!weighted && eligible.length === entries.length) {
    const dice = rollDiceNotation(tableDice(table, entries), roll);
    return dice && { roll: dice.total, entry: entries.find((e) => dice.total >= e.from && dice.total <= e.to) };
  }
  if (eligible.length === 0) return { roll: 0, none: true };
  const total = eligible.reduce((s, e) => s + weightOf(meta[e.text]), 0);
  const r = roll(total);
  let acc = 0;
  for (const e of eligible) {
    acc += weightOf(meta[e.text]);
    if (r <= acc) return { roll: r, entry: e };
  }
  return { roll: r, entry: eligible[eligible.length - 1] };
}

function rollInner(
  table: RandomTable,
  tables: RandomTable[],
  roll: DieRoller,
  stack: string[],
  nested: TableRoll["nested"],
  ctx: TableContext,
): Omit<TableRoll, "nested"> | null {
  const { entries } = parseTableText(table.text);
  const picked = pick(table, entries, roll, ctx);
  if (!picked) return null;
  if (picked.none) return { tableName: table.name, roll: 0, text: "(żaden wpis nie spełnia warunków)" };
  const entry = picked.entry;
  if (!entry) return { tableName: table.name, roll: picked.roll, text: `(brak wpisu dla wyniku ${picked.roll})` };

  const text = entry.text.replace(REFERENCE, (whole, name: string) => {
    const target = findTable(tables, name);
    // Unknown, cyclic, too-deep or context-excluded references stay visible so the GM can resolve them by hand.
    if (!target || stack.includes(target.id) || stack.length >= MAX_DEPTH || !tableAvailable(target, ctx)) return whole;
    const sub = rollInner(target, tables, roll, [...stack, target.id], nested, ctx);
    if (!sub) return whole;
    nested.push({ tableName: sub.tableName, roll: sub.roll });
    return sub.text;
  });
  return { tableName: table.name, roll: picked.roll, text };
}
