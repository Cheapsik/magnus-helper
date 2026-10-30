/**
 * Campaign-defined card structure.
 *
 * Magnus does not know what a "characteristic" or a "skill" is. A campaign
 * describes its own cards as data — sections, fields, tables — and the shared
 * tools (combat tracker, tests) reach into those cards only through roles the
 * GM assigned deliberately. Every card also carries a fixed core (name,
 * portrait, notes) that no structure can remove. See CONTEXT.md and
 * docs/adr/0002-0009.
 */

export type CardKind = "hero" | "npc" | "monster";

export const CARD_KINDS: CardKind[] = ["hero", "npc", "monster"];

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  hero: "Bohater",
  npc: "NPC",
  monster: "Potwór",
};

export const CARD_KIND_PLURAL: Record<CardKind, string> = {
  hero: "Bohaterowie",
  npc: "NPC",
  monster: "Potwory",
};

/** Where each card kind's list lives; `?id=` opens one card. */
export const CARD_KIND_ROUTES: Record<CardKind, string> = {
  hero: "/heroes",
  npc: "/npcs",
  monster: "/monsters",
};

/** Where the card generator draws a value from when a card is rolled. */
export type RandomRule =
  | { kind: "range"; min: number; max: number }
  | { kind: "list"; values: string[] }
  | { kind: "dice"; notation: string; dropLowest?: number; dropHighest?: number };

export type ColumnType = "text" | "number" | "checkbox" | "select" | "dice";

export type ColumnDef = {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
  random?: RandomRule;
};

export type FixedRow = { id: string; label: string };

/**
 * `fixed` rows come from the structure (a characteristics grid: the GM defines
 * which rows exist). `dynamic` rows are added on the card itself (weapons,
 * equipment) — a "lista wpisów".
 */
export type RowMode =
  | { kind: "fixed"; rows: FixedRow[] }
  | { kind: "dynamic"; addLabel?: string };

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "currentMax"
  | "checkbox"
  | "select"
  | "multiselect"
  | "table"
  | "dice"
  | "track"
  | "computed";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Tekst",
  longtext: "Długi tekst",
  number: "Liczba",
  currentMax: "Aktualne / maksymalne",
  checkbox: "Pole wyboru",
  select: "Wybór z listy",
  multiselect: "Wielokrotny wybór",
  table: "Tabela / lista wpisów",
  dice: "Notacja kości",
  track: "Tor punktów",
  computed: "Pole wyliczane",
};

export type FieldDef = {
  id: string;
  name: string;
  type: FieldType;
  /** select | multiselect */
  options?: string[];
  /** table */
  columns?: ColumnDef[];
  /** table */
  rowMode?: RowMode;
  /** track: number of boxes */
  trackMax?: number;
  random?: RandomRule;
  /** computed: a formula string referencing other fields, e.g. "{zdrowie.max} * 2" */
  formula?: string;
  /**
   * Soft-deleted (docs/adr/0009): gone from the structure and from cards, but
   * values stay on every card so the field can be restored with them.
   */
  hidden?: boolean;
};

export type SectionDef = {
  id: string;
  name: string;
  wide?: boolean;
  fields: FieldDef[];
};

/**
 * Addresses a single value. A plain field needs only `fieldId`; a table cell
 * needs the row and column too, because roles routinely point at one cell of a
 * grid (e.g. initiative = the "current" column of the "agility" row).
 */
export type FieldRef = {
  fieldId: string;
  rowId?: string;
  columnId?: string;
};

export type LabelledRef = { ref: FieldRef; label: string };

export type RoleBindings = {
  /** At most one per card type. */
  initiative?: FieldRef;
  /** At most one per card type; drives the primary bar in the tracker. */
  mainResource?: { current: FieldRef; max: FieldRef };
  /** Shown alongside the main resource in the tracker. */
  combatResources: LabelledRef[];
  /** Keyed by the campaign's defense type id (e.g. "Armor Class", "Dodge"). */
  defenses: Record<string, FieldRef>;
  /** Summed and subtracted from incoming damage. */
  damageReduction: LabelledRef[];
  /** Keyed by hit location id; replaces `damageReduction` for that location. */
  locationReduction: Record<string, FieldRef>;
};

export type CardTypeDef = {
  sections: SectionDef[];
  roles: RoleBindings;
  /** Fields shown under the name in lists, search and the relations map. */
  subtitleFieldIds?: string[];
};

export type CellValue = string | number | boolean;
export type TableRowValue = { id: string; cells: Record<string, CellValue> };
export type TableValue = { rows: TableRowValue[] };
export type CurrentMaxValue = { current: number; max: number };

export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | CurrentMaxValue
  | TableValue;

export type CardValues = Record<string, FieldValue>;

/** The fixed core every card has, plus values for the campaign's fields. */
export type Card = {
  id: string;
  kind: CardKind;
  name: string;
  /** URL or data URL; empty when unset. */
  portrait: string;
  notes: string;
  values: CardValues;
  /** Optional folder on the card list. */
  groupId?: string;
};

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function emptyRoleBindings(): RoleBindings {
  return { combatResources: [], defenses: {}, damageReduction: [], locationReduction: {} };
}

export function emptyCardTypeDef(): CardTypeDef {
  return { sections: [], roles: emptyRoleBindings() };
}

/** Falls back to a placeholder so an unnamed card never renders as blank. */
export function cardTitle(card: Pick<Card, "name">, fallback = "Bez nazwy"): string {
  return card.name.trim() || fallback;
}

export function cardSubtitle(cardType: CardTypeDef, card: Pick<Card, "values">): string {
  return (cardType.subtitleFieldIds ?? [])
    .map((fieldId) => card.values[fieldId])
    .filter((value): value is string | number => (typeof value === "string" && value.trim() !== "") || typeof value === "number")
    .join(" · ");
}

/** Every field including hidden ones — for structure editing and role validation. */
export function allFields(cardType: CardTypeDef): FieldDef[] {
  return cardType.sections.flatMap((section) => section.fields);
}

/** The fields a card actually shows. */
export function visibleFields(cardType: CardTypeDef): FieldDef[] {
  return allFields(cardType).filter((field) => !field.hidden);
}

export function findField(cardType: CardTypeDef, fieldId: string): FieldDef | undefined {
  return allFields(cardType).find((field) => field.id === fieldId);
}

export function defaultValueForField(field: FieldDef): FieldValue {
  switch (field.type) {
    case "number":
    case "track":
    case "computed":
      return 0;
    case "checkbox":
      return false;
    case "multiselect":
      return [];
    case "currentMax":
      return { current: 0, max: 0 };
    case "table":
      return {
        rows:
          field.rowMode?.kind === "fixed"
            ? field.rowMode.rows.map((row) => ({ id: row.id, cells: {} }))
            : [],
      };
    default:
      return "";
  }
}

export function createEmptyCard(kind: CardKind, cardType: CardTypeDef, name = ""): Card {
  const values: CardValues = {};
  for (const field of visibleFields(cardType)) {
    values[field.id] = defaultValueForField(field);
  }
  return { id: newId(), kind, name, portrait: "", notes: "", values };
}

export function isTableValue(value: FieldValue | undefined): value is TableValue {
  return typeof value === "object" && value !== null && "rows" in value;
}

export function isCurrentMaxValue(value: FieldValue | undefined): value is CurrentMaxValue {
  return typeof value === "object" && value !== null && "current" in value && "max" in value;
}

/** Resolves a role binding to the value it points at, or undefined if unbound. */
export function readRef(values: CardValues, ref: FieldRef | undefined): CellValue | undefined {
  if (!ref) return undefined;
  const value = values[ref.fieldId];
  if (value === undefined) return undefined;

  if (isTableValue(value)) {
    if (!ref.rowId || !ref.columnId) return undefined;
    return value.rows.find((row) => row.id === ref.rowId)?.cells[ref.columnId];
  }

  if (isCurrentMaxValue(value)) {
    if (ref.columnId === "current" || ref.columnId === "max") return value[ref.columnId];
    return undefined;
  }

  if (Array.isArray(value)) return value.join(", ");
  return value;
}

/** Role-bound numbers may come from free-text cells, so anything unparsable is 0. */
export function readNumberRef(values: CardValues, ref: FieldRef | undefined): number {
  const raw = readRef(values, ref);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export type CardCombatStats = {
  /** null when the GM has not bound the role — the tool falls back to manual. */
  initiative: number | null;
  resource: { current: number; max: number } | null;
  stats: { label: string; value: number }[];
};

/** What the tracker shows for a card. Reads only what roles point at. */
export function getCardCombatStats(cardType: CardTypeDef, values: CardValues): CardCombatStats {
  const { roles } = cardType;
  return {
    initiative: roles.initiative ? readNumberRef(values, roles.initiative) : null,
    resource: roles.mainResource
      ? {
          current: readNumberRef(values, roles.mainResource.current),
          max: readNumberRef(values, roles.mainResource.max),
        }
      : null,
    stats: roles.combatResources.map((entry) => ({
      label: entry.label,
      value: readNumberRef(values, entry.ref),
    })),
  };
}

export type RefIssue = { what: string; message: string };

/**
 * A ref may only point at a value that still exists and is visible — a
 * structure edit can orphan it, and an orphaned ref must surface rather than
 * silently read nothing.
 */
export function validateRef(cardType: CardTypeDef, ref: FieldRef, what: string): RefIssue[] {
  const field = findField(cardType, ref.fieldId);
  if (!field) return [{ what, message: "pole nie istnieje" }];
  if (field.hidden) return [{ what, message: "pole jest ukryte" }];
  if (field.type === "table") {
    if (!ref.rowId || !ref.columnId) {
      return [{ what, message: "wskazanie komórki tabeli wymaga wiersza i kolumny" }];
    }
    const issues: RefIssue[] = [];
    if (!field.columns?.some((column) => column.id === ref.columnId)) {
      issues.push({ what, message: "kolumna nie istnieje" });
    }
    if (field.rowMode?.kind === "fixed" && !field.rowMode.rows.some((row) => row.id === ref.rowId)) {
      issues.push({ what, message: "wiersz nie istnieje" });
    }
    return issues;
  }
  if (field.type === "currentMax" && ref.columnId !== "current" && ref.columnId !== "max") {
    return [{ what, message: "wskaż wartość aktualną albo maksymalną" }];
  }
  return [];
}

export function validateRoles(cardType: CardTypeDef): RefIssue[] {
  const { roles } = cardType;
  const issues: RefIssue[] = [];
  if (roles.initiative) issues.push(...validateRef(cardType, roles.initiative, "Inicjatywa"));
  if (roles.mainResource) {
    issues.push(...validateRef(cardType, roles.mainResource.current, "Zasób główny (aktualny)"));
    issues.push(...validateRef(cardType, roles.mainResource.max, "Zasób główny (maksymalny)"));
  }
  for (const entry of roles.combatResources) {
    issues.push(...validateRef(cardType, entry.ref, `Zasób dodatkowy „${entry.label}”`));
  }
  for (const [defenseId, ref] of Object.entries(roles.defenses)) {
    issues.push(...validateRef(cardType, ref, `Obrona ${defenseId}`));
  }
  for (const entry of roles.damageReduction) {
    issues.push(...validateRef(cardType, entry.ref, `Redukcja „${entry.label}”`));
  }
  for (const [locationId, ref] of Object.entries(roles.locationReduction)) {
    issues.push(...validateRef(cardType, ref, `Redukcja lokacji ${locationId}`));
  }
  return issues;
}
