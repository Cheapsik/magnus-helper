import {
  type CardTypeDef,
  type ColumnDef,
  type ColumnType,
  type FieldDef,
  type FieldRef,
  type FieldType,
  type FieldValue,
  type SectionDef,
  allFields,
  defaultValueForField,
  findField,
  isCurrentMaxValue,
  isTableValue,
  validateRef,
} from "@/lib/cardSchema";

/**
 * Edits to a card structure, as pure functions over `CardTypeDef`. Field
 * removal is soft (docs/adr/0009): `hideField` keeps values and role bindings
 * so `restoreField` brings everything back; only `purgeField` is permanent.
 */

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "pole";
}

function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function mapSections(type: CardTypeDef, fn: (section: SectionDef) => SectionDef): CardTypeDef {
  return { ...type, sections: type.sections.map(fn) };
}

function mapField(type: CardTypeDef, fieldId: string, fn: (field: FieldDef) => FieldDef): CardTypeDef {
  return mapSections(type, (section) => ({
    ...section,
    fields: section.fields.map((field) => (field.id === fieldId ? fn(field) : field)),
  }));
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// ─── Sections ───────────────────────────────────────────────────────────────

export function addSection(type: CardTypeDef, name: string): { type: CardTypeDef; sectionId: string } {
  const sectionId = uniqueId(`sekcja-${slugify(name)}`, type.sections.map((section) => section.id));
  return { type: { ...type, sections: [...type.sections, { id: sectionId, name, fields: [] }] }, sectionId };
}

export function updateSection(type: CardTypeDef, sectionId: string, patch: Partial<Omit<SectionDef, "id" | "fields">>): CardTypeDef {
  return mapSections(type, (section) => (section.id === sectionId ? { ...section, ...patch } : section));
}

export function moveSection(type: CardTypeDef, sectionId: string, direction: -1 | 1): CardTypeDef {
  const index = type.sections.findIndex((section) => section.id === sectionId);
  const sections = move(type.sections, index, direction);
  return sections === type.sections ? type : { ...type, sections };
}

/** Hides every field in the section; an empty section is dropped outright. */
export function hideSection(type: CardTypeDef, sectionId: string): CardTypeDef {
  const section = type.sections.find((s) => s.id === sectionId);
  if (!section) return type;
  if (section.fields.length === 0) {
    return { ...type, sections: type.sections.filter((s) => s.id !== sectionId) };
  }
  return mapSections(type, (s) =>
    s.id === sectionId ? { ...s, fields: s.fields.map((field) => ({ ...field, hidden: true })) } : s,
  );
}

// ─── Fields ─────────────────────────────────────────────────────────────────

function newFieldDef(id: string, type: FieldType, name: string): FieldDef {
  switch (type) {
    case "table":
      return {
        id,
        name,
        type,
        columns: [{ id: "nazwa", name: "Nazwa", type: "text" }],
        rowMode: { kind: "dynamic", addLabel: "Dodaj wpis" },
      };
    case "track":
      return { id, name, type, trackMax: 5 };
    case "select":
    case "multiselect":
      return { id, name, type, options: [] };
    default:
      return { id, name, type };
  }
}

export function addField(
  type: CardTypeDef,
  sectionId: string,
  fieldType: FieldType,
  name: string,
): { type: CardTypeDef; fieldId: string } {
  const fieldId = uniqueId(slugify(name), allFields(type).map((field) => field.id));
  const field = newFieldDef(fieldId, fieldType, name);
  return {
    type: mapSections(type, (section) =>
      section.id === sectionId ? { ...section, fields: [...section.fields, field] } : section,
    ),
    fieldId,
  };
}

/** The id never changes: values on cards and role bindings are keyed by it. */
export function updateField(type: CardTypeDef, fieldId: string, patch: Partial<Omit<FieldDef, "id">>): CardTypeDef {
  return mapField(type, fieldId, (field) => ({ ...field, ...patch }));
}

export function moveField(type: CardTypeDef, fieldId: string, direction: -1 | 1): CardTypeDef {
  return mapSections(type, (section) => {
    const index = section.fields.findIndex((field) => field.id === fieldId);
    return index === -1 ? section : { ...section, fields: move(section.fields, index, direction) };
  });
}

export function moveFieldToSection(type: CardTypeDef, fieldId: string, sectionId: string): CardTypeDef {
  const field = allFields(type).find((f) => f.id === fieldId);
  if (!field) return type;
  return mapSections(type, (section) => {
    const without = section.fields.filter((f) => f.id !== fieldId);
    return section.id === sectionId ? { ...section, fields: [...without, field] } : { ...section, fields: without };
  });
}

export function hideField(type: CardTypeDef, fieldId: string): CardTypeDef {
  return mapField(type, fieldId, (field) => ({ ...field, hidden: true }));
}

export function restoreField(type: CardTypeDef, fieldId: string): CardTypeDef {
  return mapField(type, fieldId, ({ hidden: _hidden, ...field }) => field);
}

export function hiddenFields(type: CardTypeDef): { field: FieldDef; sectionName: string }[] {
  return type.sections.flatMap((section) =>
    section.fields.filter((field) => field.hidden).map((field) => ({ field, sectionName: section.name })),
  );
}

/** Permanent: the field goes, and so does anything that pointed at it. */
export function purgeField(type: CardTypeDef, fieldId: string): CardTypeDef {
  const without = mapSections(type, (section) => ({
    ...section,
    fields: section.fields.filter((field) => field.id !== fieldId),
  }));
  return pruneRoles({
    ...without,
    subtitleFieldIds: (without.subtitleFieldIds ?? []).filter((id) => id !== fieldId),
  });
}

// ─── Table structure ────────────────────────────────────────────────────────

export function addColumn(type: CardTypeDef, fieldId: string, columnType: ColumnType, name: string): CardTypeDef {
  return mapField(type, fieldId, (field) => {
    const columns = field.columns ?? [];
    const id = uniqueId(slugify(name), columns.map((column) => column.id));
    return { ...field, columns: [...columns, { id, name, type: columnType }] };
  });
}

export function updateColumn(
  type: CardTypeDef,
  fieldId: string,
  columnId: string,
  patch: Partial<Omit<ColumnDef, "id">>,
): CardTypeDef {
  return mapField(type, fieldId, (field) => ({
    ...field,
    columns: (field.columns ?? []).map((column) => (column.id === columnId ? { ...column, ...patch } : column)),
  }));
}

export function moveColumn(type: CardTypeDef, fieldId: string, columnId: string, direction: -1 | 1): CardTypeDef {
  return mapField(type, fieldId, (field) => {
    const columns = field.columns ?? [];
    return { ...field, columns: move(columns, columns.findIndex((column) => column.id === columnId), direction) };
  });
}

export function removeColumn(type: CardTypeDef, fieldId: string, columnId: string): CardTypeDef {
  return pruneRoles(
    mapField(type, fieldId, (field) => ({
      ...field,
      columns: (field.columns ?? []).filter((column) => column.id !== columnId),
    })),
  );
}

function mapFixedRows(
  type: CardTypeDef,
  fieldId: string,
  fn: (rows: { id: string; label: string }[]) => { id: string; label: string }[],
): CardTypeDef {
  return mapField(type, fieldId, (field) =>
    field.rowMode?.kind === "fixed" ? { ...field, rowMode: { kind: "fixed", rows: fn(field.rowMode.rows) } } : field,
  );
}

export function addFixedRow(type: CardTypeDef, fieldId: string, label: string): CardTypeDef {
  return mapFixedRows(type, fieldId, (rows) => [
    ...rows,
    { id: uniqueId(slugify(label), rows.map((row) => row.id)), label },
  ]);
}

export function renameFixedRow(type: CardTypeDef, fieldId: string, rowId: string, label: string): CardTypeDef {
  return mapFixedRows(type, fieldId, (rows) => rows.map((row) => (row.id === rowId ? { ...row, label } : row)));
}

export function moveFixedRow(type: CardTypeDef, fieldId: string, rowId: string, direction: -1 | 1): CardTypeDef {
  return mapFixedRows(type, fieldId, (rows) => move(rows, rows.findIndex((row) => row.id === rowId), direction));
}

export function removeFixedRow(type: CardTypeDef, fieldId: string, rowId: string): CardTypeDef {
  return pruneRoles(mapFixedRows(type, fieldId, (rows) => rows.filter((row) => row.id !== rowId)));
}

/** Switches a table between a grid with structure-defined rows and a free entry list. */
export function setRowMode(type: CardTypeDef, fieldId: string, kind: "fixed" | "dynamic"): CardTypeDef {
  return pruneRoles(
    mapField(type, fieldId, (field) => ({
      ...field,
      rowMode: kind === "fixed" ? { kind: "fixed", rows: [] } : { kind: "dynamic", addLabel: "Dodaj wpis" },
    })),
  );
}

// ─── Roles ──────────────────────────────────────────────────────────────────

/**
 * Drops bindings to values that no longer exist. Bindings to hidden fields are
 * kept on purpose, so restoring a field restores its role too.
 */
export function pruneRoles(type: CardTypeDef): CardTypeDef {
  const exists = (ref: FieldRef) =>
    validateRef({ ...type, sections: type.sections.map((s) => ({ ...s, fields: s.fields.map(({ hidden: _h, ...f }) => f) })) }, ref, "")
      .length === 0;
  const { roles } = type;
  const keepRecord = (record: Record<string, FieldRef>) =>
    Object.fromEntries(Object.entries(record).filter(([, ref]) => exists(ref)));
  return {
    ...type,
    roles: {
      initiative: roles.initiative && exists(roles.initiative) ? roles.initiative : undefined,
      mainResource:
        roles.mainResource && exists(roles.mainResource.current) && exists(roles.mainResource.max)
          ? roles.mainResource
          : undefined,
      combatResources: roles.combatResources.filter((entry) => exists(entry.ref)),
      defenses: keepRecord(roles.defenses),
      damageReduction: roles.damageReduction.filter((entry) => exists(entry.ref)),
      locationReduction: keepRecord(roles.locationReduction),
    },
  };
}

export type RefTarget = { ref: FieldRef; label: string };

/**
 * Every single visible value a role can point at. Entry lists are left out:
 * their rows exist only on cards, so a structure-level binding can't name one.
 */
export function listRefTargets(type: CardTypeDef): RefTarget[] {
  const targets: RefTarget[] = [];
  for (const field of allFields(type)) {
    if (field.hidden) continue;
    switch (field.type) {
      case "number":
      case "track":
      case "text":
        targets.push({ ref: { fieldId: field.id }, label: field.name });
        break;
      case "currentMax":
        targets.push({ ref: { fieldId: field.id, columnId: "current" }, label: `${field.name} — aktualne` });
        targets.push({ ref: { fieldId: field.id, columnId: "max" }, label: `${field.name} — maksymalne` });
        break;
      case "table":
        if (field.rowMode?.kind !== "fixed") break;
        for (const row of field.rowMode.rows) {
          for (const column of field.columns ?? []) {
            if (column.type === "checkbox") continue;
            targets.push({
              ref: { fieldId: field.id, rowId: row.id, columnId: column.id },
              label: `${field.name}: ${row.label} (${column.name})`,
            });
          }
        }
        break;
      default:
        break;
    }
  }
  return targets;
}

/** Values a test or damage bonus can read: numbers only, so text and dice fields are left out. */
export function numericRefTargets(cardType: CardTypeDef): RefTarget[] {
  return listRefTargets(cardType).filter(({ ref }) => {
    const field = findField(cardType, ref.fieldId);
    if (!field) return false;
    if (field.type === "table") return field.columns?.find((column) => column.id === ref.columnId)?.type === "number";
    return field.type === "number" || field.type === "track" || field.type === "currentMax";
  });
}

export function refKey(ref: FieldRef | undefined): string {
  return ref ? [ref.fieldId, ref.rowId ?? "", ref.columnId ?? ""].join("|") : "";
}

export function refFromKey(key: string): FieldRef | undefined {
  if (!key) return undefined;
  const [fieldId, rowId, columnId] = key.split("|");
  return { fieldId, ...(rowId ? { rowId } : {}), ...(columnId ? { columnId } : {}) };
}

// ─── Values ─────────────────────────────────────────────────────────────────

/** Makes a stored value fit its field again after the GM changed the field's type. */
export function coerceValue(field: FieldDef, value: FieldValue | undefined): FieldValue {
  if (value === undefined) return defaultValueForField(field);
  switch (field.type) {
    case "number":
    case "track": {
      if (typeof value === "number") return value;
      const parsed = typeof value === "string" ? Number(value) : NaN;
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case "checkbox":
      return typeof value === "boolean" ? value : false;
    case "multiselect":
      return Array.isArray(value) ? value : [];
    case "currentMax":
      return isCurrentMaxValue(value) ? value : defaultValueForField(field);
    case "table":
      return isTableValue(value) ? value : defaultValueForField(field);
    default:
      if (typeof value === "string") return value;
      if (typeof value === "number") return String(value);
      return "";
  }
}
