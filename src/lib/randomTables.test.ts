import { describe, expect, it } from "vitest";
import { parseTableText, rollTable, tableDice, type RandomTable } from "./randomTables";

const always = (face: number) => () => face;
const table = (name: string, text: string, dice = ""): RandomTable => ({ id: name, name, folder: "", dice, text });

describe("parseTableText", () => {
  it("numbers plain lines 1..n and ignores empty lines", () => {
    const { entries, issues } = parseTableText("Wilki\n\n  Bandyci  \nBurza\n");
    expect(entries).toEqual([
      { from: 1, to: 1, text: "Wilki" },
      { from: 2, to: 2, text: "Bandyci" },
      { from: 3, to: 3, text: "Burza" },
    ]);
    expect(issues).toEqual([]);
  });

  it("reads ranges, dotted and bare numbers, and 00 as 100", () => {
    const { entries, issues } = parseTableText("01-05 Nic\n06–95 Coś\n96-00 Smok\n");
    expect(entries.map((e) => [e.from, e.to])).toEqual([[1, 5], [6, 95], [96, 100]]);
    expect(issues).toEqual([]);
    expect(parseTableText("1. Jeden\n2) Dwa\n3 Trzy").entries.map((e) => e.text)).toEqual(["Jeden", "Dwa", "Trzy"]);
  });

  it("continues numbering plain lines after a numbered one", () => {
    const { entries } = parseTableText("1-3 Spokój\nZasadzka\nKupiec");
    expect(entries.map((e) => e.from)).toEqual([1, 4, 5]);
  });

  it("reports gaps, overlaps and reversed ranges", () => {
    expect(parseTableText("1-3 A\n6 B").issues).toEqual(["Luka: brak wpisu dla 4–5"]);
    expect(parseTableText("1-4 A\n3-6 B").issues).toEqual(["Zakresy nachodzą na siebie: 1–4 i 3–6"]);
    const reversed = parseTableText("5-2 A");
    expect(reversed.entries).toEqual([]);
    expect(reversed.issues).toHaveLength(1);
  });
});

describe("tableDice", () => {
  it("defaults to one die sized to the highest entry", () => {
    const t = table("T", "a\nb\nc");
    expect(tableDice(t, parseTableText(t.text).entries)).toBe("1k3");
    expect(tableDice(table("T", "a", "2k6"), [])).toBe("2k6");
  });
});

describe("rollTable", () => {
  it("picks the entry whose range holds the roll", () => {
    const t = table("Pogoda", "1-2 Słońce\n3-6 Deszcz");
    expect(rollTable(t, [t], always(4))).toEqual({ tableName: "Pogoda", roll: 4, text: "Deszcz", nested: [] });
  });

  it("sums explicit dice notation", () => {
    const t = table("T", "2-6 Nisko\n7-12 Wysoko", "2k6");
    expect(rollTable(t, [t], always(5))?.text).toBe("Wysoko");
  });

  it("says when no entry matches and returns null for bad notation", () => {
    const t = table("T", "1 A", "1k6");
    expect(rollTable(t, [t], always(4))?.text).toBe("(brak wpisu dla wyniku 4)");
    expect(rollTable(table("T", "1 A", "abc"), [], always(1))).toBeNull();
  });

  it("rolls referenced tables recursively, case-insensitively", () => {
    const who = table("Kto", "Kupiec");
    const where = table("Gdzie", "w porcie");
    const hook = table("Haczyk", "[[kto]] czeka [[ Gdzie ]], nie [[Brak]]");
    const result = rollTable(hook, [who, where, hook], always(1));
    expect(result?.text).toBe("Kupiec czeka w porcie, nie [[Brak]]");
    expect(result?.nested).toEqual([
      { tableName: "Kto", roll: 1 },
      { tableName: "Gdzie", roll: 1 },
    ]);
  });

  it("leaves cyclic references unresolved", () => {
    const a = table("A", "a→[[B]]");
    const b = table("B", "b→[[A]]");
    expect(rollTable(a, [a, b], always(1))?.text).toBe("a→b→[[A]]");
  });

  it("stops at the depth limit", () => {
    const chain = Array.from({ length: 8 }, (_, i) => table(`T${i}`, `${i}[[T${i + 1}]]`));
    expect(rollTable(chain[0], chain, always(1))?.text).toBe("01234[[T5]]");
  });
});
