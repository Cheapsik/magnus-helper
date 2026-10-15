import { describe, expect, it } from "vitest";
import { type CardTypeDef, emptyCardTypeDef, visibleFields } from "./cardSchema";
import {
  addColumn,
  addField,
  addFixedRow,
  addSection,
  coerceValue,
  hideField,
  hideSection,
  listRefTargets,
  moveField,
  moveSection,
  purgeField,
  removeColumn,
  removeFixedRow,
  restoreField,
} from "./structureOps";
import { neutralTemplateSystem } from "./systemTemplates";

function withSection(): { type: CardTypeDef; sectionId: string } {
  return addSection(emptyCardTypeDef(), "Zasoby");
}

describe("sections and fields", () => {
  it("adds a field with an id derived from its name, unique within the card type", () => {
    const { type, sectionId } = withSection();
    const first = addField(type, sectionId, "number", "Punkty Ruchu");
    const second = addField(first.type, sectionId, "number", "Punkty ruchu");

    expect(first.fieldId).toBe("punkty-ruchu");
    expect(second.fieldId).toBe("punkty-ruchu-2");
    expect(visibleFields(second.type).map((field) => field.name)).toEqual(["Punkty Ruchu", "Punkty ruchu"]);
  });

  it("gives new tables an entry list with one column and tracks five boxes", () => {
    const { type, sectionId } = withSection();
    const table = addField(type, sectionId, "table", "Ekwipunek");
    const track = addField(table.type, sectionId, "track", "Stres");
    const [tableField, trackField] = visibleFields(track.type);

    expect(tableField.rowMode).toEqual({ kind: "dynamic", addLabel: "Dodaj wpis" });
    expect(tableField.columns).toHaveLength(1);
    expect(trackField.trackMax).toBe(5);
  });

  it("moves sections and fields up and down, ignoring moves past the ends", () => {
    let { type } = addSection(emptyCardTypeDef(), "A");
    ({ type } = addSection(type, "B"));
    type = moveSection(type, type.sections[1].id, -1);
    expect(type.sections.map((section) => section.name)).toEqual(["B", "A"]);
    expect(moveSection(type, type.sections[0].id, -1)).toEqual(type);

    const sectionId = type.sections[0].id;
    let f = addField(type, sectionId, "text", "X");
    f = addField(f.type, sectionId, "text", "Y");
    const moved = moveField(f.type, f.fieldId, -1);
    expect(moved.sections[0].fields.map((field) => field.name)).toEqual(["Y", "X"]);
  });
});

describe("soft delete", () => {
  it("hides a field so cards stop showing it, and restores it with its role bindings intact", () => {
    const system = neutralTemplateSystem();
    const hidden = hideField(system.cards.hero, "inicjatywa");

    expect(visibleFields(hidden).some((field) => field.id === "inicjatywa")).toBe(false);
    expect(hidden.roles.initiative).toEqual({ fieldId: "inicjatywa" });

    const restored = restoreField(hidden, "inicjatywa");
    expect(visibleFields(restored).some((field) => field.id === "inicjatywa")).toBe(true);
  });

  it("hides a whole section by hiding its fields; restoring one field brings the section back", () => {
    const system = neutralTemplateSystem();
    const hidden = hideSection(system.cards.hero, "zasoby");
    expect(visibleFields(hidden).map((field) => field.id)).not.toContain("zdrowie");

    const restored = restoreField(hidden, "zdrowie");
    expect(visibleFields(restored).map((field) => field.id)).toContain("zdrowie");
    expect(visibleFields(restored).map((field) => field.id)).not.toContain("inicjatywa");
  });

  it("purging a field removes it and every role or subtitle that pointed at it", () => {
    const system = neutralTemplateSystem();
    const purged = purgeField(system.cards.hero, "zdrowie");
    expect(purged.sections.flatMap((section) => section.fields).some((field) => field.id === "zdrowie")).toBe(false);
    expect(purged.roles.mainResource).toBeUndefined();

    const noOrigin = purgeField(system.cards.hero, "pochodzenie");
    expect(noOrigin.subtitleFieldIds).toEqual([]);

    const noArmor = purgeField(system.cards.hero, "ochrona");
    expect(noArmor.roles.damageReduction).toEqual([]);
    expect(noArmor.roles.combatResources).toEqual([]);
  });
});

describe("table structure", () => {
  it("adds and removes fixed rows and columns, dropping roles that pointed at removed cells", () => {
    const hero = neutralTemplateSystem().cards.hero;
    const withRow = addFixedRow(hero, "cechy", "Percepcja");
    const rows = (t: CardTypeDef) => {
      const field = t.sections.flatMap((section) => section.fields).find((f) => f.id === "cechy");
      return field?.rowMode?.kind === "fixed" ? field.rowMode.rows.map((row) => row.label) : [];
    };
    expect(rows(withRow)).toContain("Percepcja");

    const bound: CardTypeDef = {
      ...withRow,
      roles: { ...withRow.roles, initiative: { fieldId: "cechy", rowId: "zrecznosc", columnId: "wartosc" } },
    };
    expect(removeFixedRow(bound, "cechy", "zrecznosc").roles.initiative).toBeUndefined();

    const withColumn = addColumn(bound, "cechy", "number", "Bonus");
    const columnIds = (t: CardTypeDef) =>
      t.sections.flatMap((section) => section.fields).find((f) => f.id === "cechy")?.columns?.map((c) => c.id);
    expect(columnIds(withColumn)).toEqual(["wartosc", "bonus"]);
    expect(removeColumn(withColumn, "cechy", "wartosc").roles.initiative).toBeUndefined();
  });
});

describe("listRefTargets", () => {
  it("offers every single value a role can point at, with readable labels", () => {
    const targets = listRefTargets(neutralTemplateSystem().cards.hero);
    const labels = targets.map((target) => target.label);

    expect(labels).toEqual(
      expect.arrayContaining(["Inicjatywa", "Zdrowie — aktualne", "Zdrowie — maksymalne", "Cechy: Siła (Wartość)"]),
    );
    expect(labels.some((label) => label.startsWith("Umiejętności"))).toBe(false);
  });

  it("skips hidden fields", () => {
    const hidden = hideField(neutralTemplateSystem().cards.hero, "inicjatywa");
    expect(listRefTargets(hidden).map((target) => target.label)).not.toContain("Inicjatywa");
  });
});

describe("coerceValue", () => {
  it("replaces a value whose shape no longer matches the field type", () => {
    expect(coerceValue({ id: "a", name: "A", type: "table" }, 5)).toEqual({ rows: [] });
    expect(coerceValue({ id: "a", name: "A", type: "number" }, "7")).toBe(7);
    expect(coerceValue({ id: "a", name: "A", type: "currentMax" }, "x")).toEqual({ current: 0, max: 0 });
    expect(coerceValue({ id: "a", name: "A", type: "text" }, 3)).toBe("3");
  });
});
