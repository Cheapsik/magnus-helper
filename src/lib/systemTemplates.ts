import {
  type CardTypeDef,
  type ColumnDef,
  type FieldDef,
  type LabelledRef,
  type SectionDef,
  emptyRoleBindings,
} from "@/lib/cardSchema";
import {
  CAMPAIGN_SYSTEM_VERSION,
  type CampaignSystem,
  emptyCampaignSystem,
} from "@/lib/campaignSystem";

/**
 * The neutral starting template (CONTEXT.md: "Neutralny szablon startowy").
 * Deliberately generic: plain-language characteristics, no names, formulas or
 * scales borrowed from any published game. The GM edits all of it freely.
 */

export type StartingPoint = "template" | "empty";

const STAT_ROWS = [
  { id: "sila", label: "Siła" },
  { id: "zrecznosc", label: "Zręczność" },
  { id: "wytrzymalosc", label: "Wytrzymałość" },
  { id: "inteligencja", label: "Inteligencja" },
];

const STAT_VALUE_COLUMN = "wartosc";

const text = (id: string, name: string): FieldDef => ({ id, name, type: "text" });
const longtext = (id: string, name: string): FieldDef => ({ id, name, type: "longtext" });

function statsField(): FieldDef {
  const columns: ColumnDef[] = [
    { id: STAT_VALUE_COLUMN, name: "Wartość", type: "number", random: { kind: "range", min: 1, max: 10 } },
  ];
  return {
    id: "cechy",
    name: "Cechy",
    type: "table",
    columns,
    rowMode: { kind: "fixed", rows: STAT_ROWS },
  };
}

function resourcesSection(): SectionDef {
  return {
    id: "zasoby",
    name: "Zasoby",
    fields: [
      { id: "zdrowie", name: "Zdrowie", type: "currentMax", random: { kind: "range", min: 5, max: 15 } },
      { id: "inicjatywa", name: "Inicjatywa", type: "number" },
      { id: "ochrona", name: "Ochrona", type: "number" },
    ],
  };
}

function equipmentField(id: string, name: string): FieldDef {
  return {
    id,
    name,
    type: "table",
    columns: [
      { id: "nazwa", name: "Nazwa", type: "text" },
      { id: "obrazenia", name: "Obrażenia", type: "dice" },
      { id: "opis", name: "Opis", type: "text" },
    ],
    rowMode: { kind: "dynamic", addLabel: "Dodaj wpis" },
  };
}

function statSources(): LabelledRef[] {
  return STAT_ROWS.map((row) => ({
    ref: { fieldId: "cechy", rowId: row.id, columnId: STAT_VALUE_COLUMN },
    label: row.label,
  }));
}

function templateRoles(): CardTypeDef["roles"] {
  return {
    ...emptyRoleBindings(),
    initiative: { fieldId: "inicjatywa" },
    mainResource: {
      current: { fieldId: "zdrowie", columnId: "current" },
      max: { fieldId: "zdrowie", columnId: "max" },
    },
    combatResources: [{ ref: { fieldId: "ochrona" }, label: "Ochrona" }],
    damageReduction: [{ ref: { fieldId: "ochrona" }, label: "Ochrona" }],
  };
}

export function templateHeroType(): CardTypeDef {
  return {
    sections: [
      {
        id: "opis",
        name: "Opis",
        fields: [
          text("pochodzenie", "Pochodzenie"),
          text("wiek", "Wiek"),
          longtext("wyglad", "Wygląd"),
          longtext("znakiSzczegolne", "Znaki szczególne"),
        ],
      },
      { id: "cechySekcja", name: "Cechy", wide: true, fields: [statsField()] },
      resourcesSection(),
      {
        id: "umiejetnosciSekcja",
        name: "Umiejętności",
        wide: true,
        fields: [
          {
            id: "umiejetnosci",
            name: "Umiejętności",
            type: "table",
            columns: [
              { id: "nazwa", name: "Nazwa", type: "text" },
              { id: "wartosc", name: "Wartość", type: "number" },
            ],
            rowMode: { kind: "dynamic", addLabel: "Dodaj umiejętność" },
          },
        ],
      },
      {
        id: "ekwipunekSekcja",
        name: "Ekwipunek",
        wide: true,
        fields: [equipmentField("ekwipunek", "Ekwipunek"), text("majatek", "Majątek")],
      },
    ],
    roles: templateRoles(),
    subtitleFieldIds: ["pochodzenie"],
  };
}

/** NPC starts as a copy of the hero structure plus a section for the GM. */
export function deriveNpcType(hero: CardTypeDef): CardTypeDef {
  const copy = structuredClone(hero);
  return {
    ...copy,
    sections: [
      ...copy.sections,
      {
        id: "dlaMg",
        name: "Dla MG",
        fields: [longtext("motywacja", "Motywacja"), longtext("sekrety", "Sekrety")],
      },
    ],
  };
}

/**
 * Monster starts as the hero's mechanical sections only: whatever the roles
 * point at, minus the descriptive parts a quick statblock does not need.
 */
export function deriveMonsterType(hero: CardTypeDef): CardTypeDef {
  const copy = structuredClone(hero);
  const roleFieldIds = new Set(referencedFieldIds(copy));
  const sections = copy.sections
    .map((section) => ({ ...section, fields: section.fields.filter((field) => roleFieldIds.has(field.id)) }))
    .filter((section) => section.fields.length > 0);
  sections.push({ id: "atakiSekcja", name: "Ataki", wide: true, fields: [equipmentField("ataki", "Ataki")] });
  return { sections, roles: copy.roles, subtitleFieldIds: [] };
}

function referencedFieldIds(cardType: CardTypeDef): string[] {
  const { roles } = cardType;
  const ids: string[] = [];
  if (roles.initiative) ids.push(roles.initiative.fieldId);
  if (roles.mainResource) ids.push(roles.mainResource.current.fieldId, roles.mainResource.max.fieldId);
  ids.push(...roles.combatResources.map((entry) => entry.ref.fieldId));
  ids.push(...Object.values(roles.defenses).map((ref) => ref.fieldId));
  ids.push(...roles.damageReduction.map((entry) => entry.ref.fieldId));
  ids.push(...Object.values(roles.locationReduction).map((ref) => ref.fieldId));
  // The characteristics grid is what tests roll from, so a monster keeps it.
  ids.push("cechy");
  return ids;
}

export function neutralTemplateSystem(): CampaignSystem {
  const hero = templateHeroType();
  return {
    version: CAMPAIGN_SYSTEM_VERSION,
    cards: { hero, npc: deriveNpcType(hero), monster: deriveMonsterType(hero) },
    testTypes: [
      {
        id: "test-cechy",
        name: "Test cechy",
        mode: "rollOver",
        dice: "1k20",
        difficulties: [
          { id: "latwy", name: "Łatwy", value: 8 },
          { id: "przecietny", name: "Przeciętny", value: 12 },
          { id: "trudny", name: "Trudny", value: 16 },
        ],
        defaultDifficultyId: "przecietny",
        sources: { hero: statSources(), npc: statSources(), monster: statSources() },
      },
    ],
    attackTypes: [
      {
        id: "atak",
        name: "Atak",
        testTypeId: "test-cechy",
        hit: { kind: "self" },
        damage: { source: "weapon" },
        reduction: { enabled: true, minimum: 0 },
        useHitLocations: false,
      },
    ],
    defenseTypes: [],
    hitLocations: null,
    conditions: [
      "Ogłuszony",
      "Krwawienie",
      "Powalony",
      "Oślepiony",
      "Zatruty",
      "Unieruchomiony",
      "Przestraszony",
      "Zmęczony",
      "Nieprzytomny",
    ].map((name, index) => ({ id: `stan-${index + 1}`, name })),
    currency: [
      { id: "zloto", name: "Złoto", short: "zł", rate: 100 },
      { id: "srebro", name: "Srebro", short: "sr", rate: 10 },
      { id: "miedz", name: "Miedź", short: "md", rate: 1 },
    ],
  };
}

export function systemForStartingPoint(start: StartingPoint): CampaignSystem {
  return start === "template" ? neutralTemplateSystem() : emptyCampaignSystem();
}
