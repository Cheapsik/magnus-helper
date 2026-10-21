import { describe, expect, it } from "vitest";
import { type Card, type CardKind, type CardTypeDef, emptyCardTypeDef } from "./cardSchema";
import {
  type AttackType,
  type CampaignSystem,
  type HitLocationTable,
  type TestType,
  emptyCampaignSystem,
} from "./campaignSystem";
import { resolveDamage, resolveHit, weaponDiceOptions } from "./combatEngine";
import { resolveTest } from "./testEngine";

/** Hands out the given faces in order and fails loudly if the engine rolls more. */
function faces(...values: number[]) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("rolled more dice than expected");
    return values[i++];
  };
}

const d20: TestType = {
  id: "d20",
  name: "Test d20",
  mode: "rollOver",
  dice: "1k20",
  difficulties: [{ id: "norm", name: "Normalny", value: 12 }],
  sources: { hero: [], npc: [], monster: [] },
};

const percentile: TestType = {
  id: "k100",
  name: "Test k100",
  mode: "rollUnder",
  dice: "1k100",
  difficulties: [],
  sources: { hero: [], npc: [], monster: [] },
};

function attack(patch: Partial<AttackType> = {}): AttackType {
  return {
    id: "atak",
    name: "Atak",
    testTypeId: "d20",
    hit: { kind: "self" },
    damage: { source: "weapon" },
    reduction: { enabled: true, minimum: 0 },
    useHitLocations: false,
    ...patch,
  };
}

function system(patch: Partial<CampaignSystem> = {}): CampaignSystem {
  const base = emptyCampaignSystem();
  const monster = emptyCardTypeDef();
  monster.roles.defenses = { ac: { fieldId: "ac" } };
  monster.roles.damageReduction = [
    { label: "Pancerz", ref: { fieldId: "armor" } },
    { label: "Odporność", ref: { fieldId: "toughness" } },
  ];
  monster.roles.locationReduction = { head: { fieldId: "headArmor" } };
  return {
    ...base,
    cards: { ...base.cards, monster },
    testTypes: [d20, percentile],
    defenseTypes: [{ id: "ac", name: "KP" }],
    ...patch,
  };
}

function party(kind: CardKind, values: Card["values"]) {
  return { kind, card: { id: kind, kind, name: kind, portrait: "", notes: "", values } };
}

const goblin = party("monster", { ac: 15, armor: 2, toughness: 1, headArmor: 4 });

describe("resolveHit — self", () => {
  it("hits when the attacker's own test succeeds", () => {
    const result = resolveHit(system(), attack(), { attackValue: 3, difficultyId: "norm" }, faces(9));
    expect(result).toMatchObject({ hit: true, tied: false });
    expect(result.attack).toMatchObject({ kind: "rollOver", total: 12, success: true });
  });

  it("misses when the test fails", () => {
    const result = resolveHit(system(), attack(), { attackValue: 3, difficultyId: "norm" }, faces(8));
    expect(result.hit).toBe(false);
  });

  it("leaves the decision to the GM when the test type has no success or failure", () => {
    const bands: TestType = { ...d20, id: "b", mode: "bands", bands: [{ id: "x", label: "Wynik" }] };
    const result = resolveHit(system({ testTypes: [bands] }), attack({ testTypeId: "b" }), { attackValue: 0 }, faces(5));
    expect(result.hit).toBeNull();
  });
});

describe("resolveHit — vsDefense", () => {
  const vsAc = attack({ hit: { kind: "vsDefense", defenseId: "ac" } });

  it("compares a roll-over total to the target's defense field", () => {
    const hit = resolveHit(system(), vsAc, { attackValue: 3, target: goblin }, faces(12));
    expect(hit).toMatchObject({ hit: true, defenseValue: 15 });
    const miss = resolveHit(system(), vsAc, { attackValue: 3, target: goblin }, faces(11));
    expect(miss).toMatchObject({ hit: false, defenseValue: 15 });
  });

  it("falls back to the GM when the target has no such defense", () => {
    const bare = party("monster", {});
    const noRole = resolveHit(system(), attack({ hit: { kind: "vsDefense", defenseId: "dodge" } }), { attackValue: 3, target: bare }, faces(20));
    expect(noRole.hit).toBeNull();
    expect(noRole.defenseValue).toBeNull();
    const noTarget = resolveHit(system(), vsAc, { attackValue: 3 }, faces(20));
    expect(noTarget.hit).toBeNull();
  });
});

describe("resolveHit — opposed", () => {
  const opposed = (tie: "defender" | "attacker" | "reroll") =>
    attack({ testTypeId: "k100", hit: { kind: "opposed", tie } });

  it("hits when the attacker beats the defender's margin", () => {
    // attacker 50 rolls 30 (+20); defender 40 rolls 35 (+5)
    const result = resolveHit(system(), opposed("defender"), { attackValue: 50, defenderValue: 40 }, faces(30, 35));
    expect(result.hit).toBe(true);
    expect(result.defense).toMatchObject({ kind: "rollUnder", success: true });
  });

  it("misses when the defender's margin is higher", () => {
    // attacker 50 rolls 40 (+10); defender 80 rolls 10 (+70)
    const result = resolveHit(system(), opposed("attacker"), { attackValue: 50, defenderValue: 80 }, faces(40, 10));
    expect(result).toMatchObject({ hit: false, tied: false });
  });

  it("misses when the attacker's own test fails, even if the defender fails worse", () => {
    // attacker 30 rolls 60 (fails by 30); defender 20 rolls 90 (fails by 70)
    const result = resolveHit(system(), opposed("attacker"), { attackValue: 30, defenderValue: 20 }, faces(60, 90));
    expect(result).toMatchObject({ hit: false, tied: false });
  });

  it("settles a tie by the configured rule", () => {
    const inputs = { attackValue: 50, defenderValue: 50 };
    expect(resolveHit(system(), opposed("defender"), inputs, faces(30, 30))).toMatchObject({ hit: false, tied: true });
    expect(resolveHit(system(), opposed("attacker"), inputs, faces(30, 30))).toMatchObject({ hit: true, tied: true });
    expect(resolveHit(system(), opposed("reroll"), inputs, faces(30, 30))).toMatchObject({ hit: null, tied: true });
  });

  it("needs the defender's value; without it the GM decides", () => {
    const result = resolveHit(system(), opposed("defender"), { attackValue: 50 }, faces(30));
    expect(result.hit).toBeNull();
    expect(result.defense).toBeNull();
  });
});

describe("resolveHit — manual", () => {
  it("rolls the attack test if there is one but leaves the hit to the GM", () => {
    const result = resolveHit(system(), attack({ hit: { kind: "manual" } }), { attackValue: 3 }, faces(15));
    expect(result.attack).toMatchObject({ kind: "rollOver", total: 18 });
    expect(result.hit).toBeNull();
  });

  it("rolls nothing without a test type", () => {
    const result = resolveHit(system(), attack({ testTypeId: undefined }), { attackValue: 3 }, faces());
    expect(result.attack).toBeNull();
    expect(result.hit).toBeNull();
  });

  it("treats a test type deleted from the campaign like no test type", () => {
    const result = resolveHit(system(), attack({ testTypeId: "gone" }), { attackValue: 3 }, faces());
    expect(result).toMatchObject({ attack: null, hit: null });
  });
});

describe("resolveDamage", () => {
  const attacker = party("hero", { strength: 3 });
  const hitAttack = (patch: Partial<AttackType> = {}) => attack(patch);

  it("rolls the weapon dice and subtracts the target's summed reduction", () => {
    // 1k8+2 → 5+2 = 7, minus armor 2 and toughness 1
    const result = resolveDamage(system(), hitAttack(), { target: goblin, attack: null, weaponDice: "1k8+2" }, faces(5));
    expect(result).toMatchObject({ raw: 7, reduction: 3, final: 4, location: null });
  });

  it("adds the attacker's chosen field", () => {
    const withBonus = hitAttack({ damage: { source: "weapon", addField: { hero: { fieldId: "strength" } } } });
    const result = resolveDamage(system(), withBonus, { attacker, target: goblin, attack: null, weaponDice: "1k6" }, faces(4));
    expect(result).toMatchObject({ fieldBonus: 3, raw: 7, final: 4 });
  });

  it("adds the margin of a successful attack", () => {
    const withMargin = hitAttack({ damage: { source: "fixed", fixed: 2, addMargin: true } });
    const outcome = resolveTest(d20, { value: 3, difficultyId: "norm" }, faces(14)); // 17 vs 12: margin 5
    const result = resolveDamage(system(), withMargin, { target: goblin, attack: outcome }, faces());
    expect(result).toMatchObject({ marginBonus: 5, raw: 7 });
  });

  it("adds no margin when the attack was not a success", () => {
    const withMargin = hitAttack({ damage: { source: "fixed", fixed: 2, addMargin: true } });
    const outcome = resolveTest(d20, { value: 3, difficultyId: "norm" }, faces(2));
    const result = resolveDamage(system(), withMargin, { target: goblin, attack: outcome }, faces());
    expect(result).toMatchObject({ marginBonus: 0, raw: 2 });
  });

  it("never drops below the configured minimum", () => {
    const fixed = (minimum: 0 | 1) => hitAttack({ damage: { source: "fixed", fixed: 2 }, reduction: { enabled: true, minimum } });
    expect(resolveDamage(system(), fixed(0), { target: goblin, attack: null }, faces()).final).toBe(0);
    expect(resolveDamage(system(), fixed(1), { target: goblin, attack: null }, faces()).final).toBe(1);
  });

  it("skips reduction when the attack type turns it off", () => {
    const off = hitAttack({ damage: { source: "fixed", fixed: 6 }, reduction: { enabled: false, minimum: 0 } });
    expect(resolveDamage(system(), off, { target: goblin, attack: null }, faces())).toMatchObject({ reduction: 0, final: 6 });
  });

  it("takes manual damage from the input, and has none without it", () => {
    const manual = hitAttack({ damage: { source: "manual" } });
    expect(resolveDamage(system(), manual, { target: goblin, attack: null, manualDamage: 9 }, faces())).toMatchObject({ raw: 9, final: 6 });
    expect(resolveDamage(system(), manual, { target: goblin, attack: null }, faces())).toMatchObject({ raw: null, final: null });
  });

  it("has no damage when the weapon dice are missing or invalid", () => {
    expect(resolveDamage(system(), hitAttack(), { target: goblin, attack: null }, faces()).raw).toBeNull();
    expect(resolveDamage(system(), hitAttack(), { target: goblin, attack: null, weaponDice: "miecz" }, faces()).raw).toBeNull();
  });

  it("reduces nothing for a target that is not a card", () => {
    const result = resolveDamage(system(), hitAttack({ damage: { source: "fixed", fixed: 5 } }), { attack: null }, faces());
    expect(result).toMatchObject({ reduction: 0, final: 5 });
  });
});

describe("resolveDamage — hit locations", () => {
  const table: HitLocationTable = {
    dice: "1k100",
    reverseAttackRoll: false,
    locations: [
      { id: "head", name: "Głowa", atMost: 15 },
      { id: "body", name: "Korpus", atMost: 80 },
      { id: "legs", name: "Nogi", atMost: 100 },
    ],
  };
  const located = attack({ damage: { source: "fixed", fixed: 10 }, useHitLocations: true });

  it("rolls the table and uses that location's reduction instead of the general one", () => {
    const result = resolveDamage(system({ hitLocations: table }), located, { target: goblin, attack: null }, faces(10));
    expect(result.location).toMatchObject({ roll: 10, location: { id: "head" } });
    expect(result).toMatchObject({ reduction: 4, final: 6 });
  });

  it("falls back to the general reduction when the location has none", () => {
    const result = resolveDamage(system({ hitLocations: table }), located, { target: goblin, attack: null }, faces(50));
    expect(result.location?.location.id).toBe("body");
    expect(result).toMatchObject({ reduction: 3, final: 7 });
  });

  it("reads the location off the reversed digits of the attack roll", () => {
    const reversing = { ...table, reverseAttackRoll: true };
    const outcome = resolveTest(percentile, { value: 80 }, faces(12));
    const result = resolveDamage(system({ hitLocations: reversing }), located, { target: goblin, attack: outcome }, faces());
    // 12 → 21 → Korpus
    expect(result.location).toMatchObject({ roll: 21, location: { id: "body" } });
  });

  it("reads 100 as 00 and keeps it at 100 when reversed", () => {
    const reversing = { ...table, reverseAttackRoll: true };
    const outcome = resolveTest(percentile, { value: 100 }, faces(100));
    const result = resolveDamage(system({ hitLocations: reversing }), located, { target: goblin, attack: outcome }, faces());
    expect(result.location).toMatchObject({ roll: 100, location: { id: "legs" } });
  });

  it("rolls the table instead when there is no percentile attack roll to reverse", () => {
    const reversing = { ...table, reverseAttackRoll: true };
    const result = resolveDamage(system({ hitLocations: reversing }), located, { target: goblin, attack: null }, faces(90));
    expect(result.location?.location.id).toBe("legs");
  });

  it("ignores locations when the attack type or the campaign has none", () => {
    const off = attack({ damage: { source: "fixed", fixed: 10 }, useHitLocations: false });
    expect(resolveDamage(system({ hitLocations: table }), off, { target: goblin, attack: null }, faces()).location).toBeNull();
    expect(resolveDamage(system({ hitLocations: null }), located, { target: goblin, attack: null }, faces()).location).toBeNull();
  });
});

describe("weaponDiceOptions", () => {
  const cardType: CardTypeDef = {
    ...emptyCardTypeDef(),
    sections: [
      {
        id: "s",
        name: "Walka",
        fields: [
          { id: "fists", name: "Pięści", type: "dice" },
          { id: "empty", name: "Puste", type: "dice" },
          { id: "hidden", name: "Ukryte", type: "dice", hidden: true },
          {
            id: "weapons",
            name: "Broń",
            type: "table",
            rowMode: { kind: "dynamic" },
            columns: [
              { id: "n", name: "Nazwa", type: "text" },
              { id: "d", name: "Obrażenia", type: "dice" },
            ],
          },
        ],
      },
    ],
  };
  const card = party("hero", {
    fists: "1k4",
    empty: " ",
    hidden: "9k9",
    weapons: {
      rows: [
        { id: "r1", cells: { n: "Miecz", d: "1k8+1" } },
        { id: "r2", cells: { n: "", d: "2k6" } },
        { id: "r3", cells: { n: "Kij", d: "" } },
      ],
    },
  }).card;

  it("lists dice fields and dice cells that have a value, skipping hidden fields", () => {
    expect(weaponDiceOptions(cardType, card)).toEqual([
      { label: "Pięści", notation: "1k4" },
      { label: "Miecz · Obrażenia", notation: "1k8+1" },
      { label: "Wpis 2 · Obrażenia", notation: "2k6" },
    ]);
  });
});
