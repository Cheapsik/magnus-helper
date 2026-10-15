import { describe, expect, it } from "vitest";
import { CARD_KINDS, allFields, validateRef, validateRoles } from "./cardSchema";
import { neutralTemplateSystem, systemForStartingPoint } from "./systemTemplates";

describe("neutral template", () => {
  const system = neutralTemplateSystem();

  it("binds roles only to fields that exist on every card type", () => {
    for (const kind of CARD_KINDS) {
      expect(validateRoles(system.cards[kind])).toEqual([]);
    }
  });

  it("lets every test be rolled from fields that exist on the card type it names", () => {
    for (const test of system.testTypes) {
      for (const kind of CARD_KINDS) {
        const issues = test.sources[kind].flatMap((source) =>
          validateRef(system.cards[kind], source.ref, source.label),
        );
        expect(issues).toEqual([]);
      }
    }
  });

  it("points attacks at existing tests", () => {
    const testIds = new Set(system.testTypes.map((test) => test.id));
    for (const attack of system.attackTypes) {
      if (attack.testTypeId) expect(testIds.has(attack.testTypeId)).toBe(true);
    }
  });

  it("gives NPCs the hero structure plus a section for the GM, and monsters a trimmed one", () => {
    const heroIds = allFields(system.cards.hero).map((field) => field.id);
    const npcIds = allFields(system.cards.npc).map((field) => field.id);
    const monsterIds = allFields(system.cards.monster).map((field) => field.id);

    expect(npcIds).toEqual(expect.arrayContaining(heroIds));
    expect(npcIds.length).toBeGreaterThan(heroIds.length);
    expect(monsterIds).not.toContain("wyglad");
    expect(monsterIds).toEqual(expect.arrayContaining(["cechy", "zdrowie", "ataki"]));
  });

  it("uses only plain, system-neutral characteristic names", () => {
    const stats = allFields(system.cards.hero).find((field) => field.id === "cechy");
    const labels = stats?.rowMode?.kind === "fixed" ? stats.rowMode.rows.map((row) => row.label) : [];
    expect(labels).toEqual(["Siła", "Zręczność", "Wytrzymałość", "Inteligencja"]);
  });
});

describe("empty starting point", () => {
  it("has no structure and no mechanics beyond the card core", () => {
    const system = systemForStartingPoint("empty");
    for (const kind of CARD_KINDS) expect(system.cards[kind].sections).toEqual([]);
    expect(system.testTypes).toEqual([]);
    expect(system.attackTypes).toEqual([]);
  });
});
