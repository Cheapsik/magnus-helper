import { describe, expect, it } from "vitest";
import type { CardTypeDef, FieldDef } from "./cardSchema";
import { emptyRoleBindings } from "./cardSchema";
import { generateCard, generateCardValues } from "./cardGenerator";
import { templateHeroType } from "./systemTemplates";

/** A roller that returns the given faces in order. */
function faces(...results: number[]) {
  let i = 0;
  const sides: number[] = [];
  const roll = (s: number) => {
    sides.push(s);
    return results[i++];
  };
  return Object.assign(roll, { sides });
}

function typeWith(...fields: FieldDef[]): CardTypeDef {
  return { sections: [{ id: "s", name: "S", fields }], roles: emptyRoleBindings() };
}

describe("generateCardValues", () => {
  it("fills a number field from its range using the die roller", () => {
    const roll = faces(3);
    const values = generateCardValues(
      typeWith({ id: "n", name: "N", type: "number", random: { kind: "range", min: 5, max: 10 } }),
      roll,
    );
    expect(values.n).toBe(7);
    expect(roll.sides).toEqual([6]);
  });

  it("gives fields without a rule their default value and skips hidden fields", () => {
    const values = generateCardValues(
      typeWith(
        { id: "t", name: "T", type: "text" },
        { id: "c", name: "C", type: "checkbox" },
        { id: "h", name: "H", type: "number", hidden: true, random: { kind: "range", min: 1, max: 2 } },
      ),
      faces(),
    );
    expect(values).toEqual({ t: "", c: false });
  });

  it("clamps a track to 0..trackMax", () => {
    const values = generateCardValues(
      typeWith(
        { id: "high", name: "A", type: "track", trackMax: 5, random: { kind: "range", min: 3, max: 12 } },
        { id: "low", name: "B", type: "track", trackMax: 5, random: { kind: "range", min: -4, max: 0 } },
      ),
      faces(10, 1),
    );
    expect(values).toEqual({ high: 5, low: 0 });
  });

  it("sets current to max for a current/max range", () => {
    const values = generateCardValues(
      typeWith({ id: "hp", name: "HP", type: "currentMax", random: { kind: "range", min: 5, max: 15 } }),
      faces(4),
    );
    expect(values.hp).toEqual({ current: 8, max: 8 });
  });

  it("picks text, long text, select and dice values from a list", () => {
    const roll = faces(2, 1, 3, 2);
    const values = generateCardValues(
      typeWith(
        { id: "t", name: "T", type: "text", random: { kind: "list", values: ["a", "b", "c"] } },
        { id: "l", name: "L", type: "longtext", random: { kind: "list", values: ["x", "y"] } },
        { id: "s", name: "S", type: "select", options: ["p", "q", "r"], random: { kind: "list", values: ["p", "q", "r"] } },
        { id: "d", name: "D", type: "dice", random: { kind: "list", values: ["1k6", "1k8"] } },
      ),
      roll,
    );
    expect(values).toEqual({ t: "b", l: "x", s: "r", d: "1k8" });
    expect(roll.sides).toEqual([3, 2, 3, 2]);
  });

  it("renders a range as a string for a text field", () => {
    const values = generateCardValues(
      typeWith({ id: "age", name: "Wiek", type: "text", random: { kind: "range", min: 18, max: 60 } }),
      faces(10),
    );
    expect(values.age).toBe("27");
  });

  it("leaves a field with an empty list at its default", () => {
    const values = generateCardValues(
      typeWith({ id: "t", name: "T", type: "text", random: { kind: "list", values: [] } }),
      faces(),
    );
    expect(values.t).toBe("");
  });

  it("rolls each column rule for every row of a fixed-row table", () => {
    const values = generateCardValues(
      typeWith({
        id: "stats",
        name: "Cechy",
        type: "table",
        columns: [
          { id: "v", name: "Wartość", type: "number", random: { kind: "range", min: 1, max: 10 } },
          { id: "note", name: "Uwagi", type: "text" },
          { id: "tag", name: "Znak", type: "select", random: { kind: "list", values: ["+", "-"] } },
        ],
        rowMode: { kind: "fixed", rows: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
      }),
      faces(7, 2, 3, 1),
    );
    expect(values.stats).toEqual({
      rows: [
        { id: "a", cells: { v: 7, tag: "-" } },
        { id: "b", cells: { v: 3, tag: "+" } },
      ],
    });
  });

  it("leaves a dynamic table empty", () => {
    const values = generateCardValues(
      typeWith({
        id: "gear",
        name: "Ekwipunek",
        type: "table",
        columns: [{ id: "n", name: "Nazwa", type: "text", random: { kind: "list", values: ["x"] } }],
        rowMode: { kind: "dynamic" },
      }),
      faces(),
    );
    expect(values.gear).toEqual({ rows: [] });
  });

  it("treats a range entered upside down as the same range", () => {
    const roll = faces(1);
    const values = generateCardValues(
      typeWith({ id: "n", name: "N", type: "number", random: { kind: "range", min: 10, max: 5 } }),
      roll,
    );
    expect(values.n).toBe(5);
    expect(roll.sides).toEqual([6]);
  });
});

describe("generateCard", () => {
  it("builds a card with the given kind and name, an empty core and rolled values", () => {
    const card = generateCard(
      "monster",
      typeWith({ id: "n", name: "N", type: "number", random: { kind: "range", min: 1, max: 4 } }),
      "Wilk",
      faces(2),
    );
    expect(card).toMatchObject({ kind: "monster", name: "Wilk", portrait: "", notes: "", values: { n: 2 } });
    expect(card.id).toEqual(expect.any(String));
  });
});

describe("generateCardValues on the neutral template", () => {
  it("rolls the characteristics grid and health, leaves the rest at defaults", () => {
    const values = generateCardValues(templateHeroType(), () => 1);
    expect(values.cechy).toEqual({
      rows: [
        { id: "sila", cells: { wartosc: 1 } },
        { id: "zrecznosc", cells: { wartosc: 1 } },
        { id: "wytrzymalosc", cells: { wartosc: 1 } },
        { id: "inteligencja", cells: { wartosc: 1 } },
      ],
    });
    expect(values.zdrowie).toEqual({ current: 5, max: 5 });
    expect(values.inicjatywa).toBe(0);
    expect(values.ekwipunek).toEqual({ rows: [] });
  });
});
