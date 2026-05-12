/** Append a quest from outside QuestsPage (e.g. GM dashboard). Writes `rpg_quests` in localStorage. */

const STORAGE_QUESTS = "rpg_quests";
const STORAGE_QUEST_LAYOUT = "rpg_quests_layout";

interface QuestLayoutCol {
  id: string;
  label?: string;
  emoji?: string;
  color?: string;
}

interface QuestLayoutType {
  id: string;
  label?: string;
  emoji?: string;
  accent?: string;
}

interface QuestLayoutRaw {
  columns?: QuestLayoutCol[];
  types?: QuestLayoutType[];
}

interface Quest {
  id: string;
  title: string;
  type: string;
  column: string;
  notes: string;
  linkedNpcs: string[];
  linkedQuests: string[];
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface QuestsState {
  quests: Quest[];
  order: Record<string, string[]>;
}

function readLayout(): QuestLayoutRaw {
  try {
    const raw = localStorage.getItem(STORAGE_QUEST_LAYOUT);
    if (!raw) return {};
    return JSON.parse(raw) as QuestLayoutRaw;
  } catch {
    return {};
  }
}

function defaultColumnId(layout: QuestLayoutRaw): string {
  const cols = layout.columns;
  if (cols && cols.length > 0) {
    const aktywne = cols.find((c) => c.id === "aktywne");
    return aktywne?.id ?? cols[0].id;
  }
  return "aktywne";
}

function defaultTypeId(layout: QuestLayoutRaw): string {
  const types = layout.types;
  if (types && types.length > 0) {
    const inne = types.find((t) => t.id === "inne");
    return inne?.id ?? types[0].id;
  }
  return "inne";
}

export function appendQuestToStorage(opts: {
  title: string;
  notes: string;
  typeId?: string;
  columnId?: string;
}): { ok: true } | { ok: false; error: string } {
  const title = opts.title.trim();
  if (!title) return { ok: false, error: "Podaj tytuł wątku" };

  const layout = readLayout();
  const columnId = opts.columnId ?? defaultColumnId(layout);
  const typeId = opts.typeId ?? defaultTypeId(layout);

  let state: QuestsState = { quests: [], order: {} };
  try {
    const raw = localStorage.getItem(STORAGE_QUESTS);
    if (raw) {
      const parsed = JSON.parse(raw) as QuestsState;
      if (parsed?.quests && parsed?.order) state = parsed;
    }
  } catch {
    /* keep empty */
  }

  if (!state.order) state.order = {};
  const cols = layout.columns?.length ? layout.columns.map((c) => c.id) : [columnId];
  cols.forEach((id) => {
    if (!state.order[id]) state.order[id] = [];
  });

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const quest: Quest = {
    id,
    title,
    type: typeId,
    column: columnId,
    notes: opts.notes.trim(),
    linkedNpcs: [],
    linkedQuests: [],
    sessionNumber: 1,
    createdAt: ts,
    updatedAt: ts,
  };

  if (!state.order[columnId]) state.order[columnId] = [];
  state.quests = [...(state.quests || []), quest];
  state.order[columnId] = [...(state.order[columnId] ?? []), id];

  try {
    localStorage.setItem(STORAGE_QUESTS, JSON.stringify(state));
  } catch {
    return { ok: false, error: "Nie udało się zapisać" };
  }
  return { ok: true };
}

export type { QuestLayoutRaw, QuestLayoutCol, QuestLayoutType };
