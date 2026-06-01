import type { ActiveCondition, Combatant } from "@/context/AppContext";

export const COMBAT_SESSIONS_STORAGE_KEY = "rpg_combat_sessions";
export const MAX_COMBAT_FIGHTS = 6;

export type CombatFightStatus = "active" | "finished";

export interface CombatFight {
  id: string;
  name: string;
  combatants: Combatant[];
  combatRound: number;
  combatTurn: number;
  conditions: ActiveCondition[];
  status: CombatFightStatus;
}

export interface CombatPreset {
  id: string;
  name: string;
  combatants: Combatant[];
}

export interface CombatSessionsState {
  fights: CombatFight[];
  activeFightId: string;
  presets: CombatPreset[];
}

const LEGACY_COMBATANTS_KEY = "rpg_combatants";
const LEGACY_ROUND_KEY = "rpg_combat_round";
const LEGACY_TURN_KEY = "rpg_combat_turn";
const LEGACY_CONDITIONS_KEY = "rpg_conditions";

function readLegacyJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeCombatant(raw: unknown): Combatant | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.name !== "string") return null;
  const hp = c.hp as { current?: number; max?: number } | undefined;
  return {
    id: c.id,
    name: c.name,
    initiative: Number(c.initiative) || 0,
    ww: Number(c.ww) || 0,
    us: Number(c.us) || 0,
    sb: Number(c.sb) || 0,
    hp: {
      current: Number(hp?.current) || 0,
      max: Number(hp?.max) || 1,
    },
    armor: Number(c.armor) || 0,
    toughness: Number(c.toughness) || 0,
    statuses: Array.isArray(c.statuses) ? c.statuses.filter((s): s is string => typeof s === "string") : [],
    notes: typeof c.notes === "string" ? c.notes : "",
    isEnemy: Boolean(c.isEnemy),
  };
}

function normalizeCombatantList(parsed: unknown): Combatant[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCombatant).filter((c): c is Combatant => c !== null);
}

function normalizeConditions(parsed: unknown): ActiveCondition[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const c = raw as Record<string, unknown>;
      if (typeof c.id !== "string" || typeof c.name !== "string") return null;
      const severity = c.severity;
      return {
        id: c.id,
        name: c.name,
        rounds: typeof c.rounds === "number" ? c.rounds : undefined,
        severity:
          severity === "low" || severity === "medium" || severity === "high" ? severity : "medium",
      };
    })
    .filter((c): c is ActiveCondition => c !== null);
}

function normalizeFight(raw: unknown, index: number): CombatFight | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const id = typeof f.id === "string" ? f.id : crypto.randomUUID();
  const combatants = normalizeCombatantList(f.combatants);
  const status: CombatFightStatus = f.status === "finished" ? "finished" : "active";
  return {
    id,
    name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : `Walka ${index + 1}`,
    combatants,
    combatRound: Math.max(1, Number(f.combatRound) || 1),
    combatTurn: Math.max(0, Number(f.combatTurn) || 0),
    conditions: normalizeConditions(f.conditions),
    status,
  };
}

function normalizePreset(raw: unknown): CombatPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string" || !p.name.trim()) return null;
  return {
    id: p.id,
    name: p.name.trim(),
    combatants: normalizeCombatantList(p.combatants),
  };
}

function migrateFromLegacyStorage(): CombatSessionsState | null {
  if (typeof window === "undefined") return null;
  const hasLegacy =
    window.localStorage.getItem(LEGACY_COMBATANTS_KEY) !== null ||
    window.localStorage.getItem(LEGACY_ROUND_KEY) !== null ||
    window.localStorage.getItem(LEGACY_TURN_KEY) !== null;

  if (!hasLegacy) return null;

  const combatants = normalizeCombatantList(readLegacyJson(LEGACY_COMBATANTS_KEY, []));
  const combatRound = Math.max(1, readLegacyJson(LEGACY_ROUND_KEY, 1));
  const combatTurn = Math.max(0, readLegacyJson(LEGACY_TURN_KEY, 0));
  const conditions = normalizeConditions(readLegacyJson(LEGACY_CONDITIONS_KEY, []));

  const fightId = crypto.randomUUID();
  return {
    fights: [
      {
        id: fightId,
        name: "Walka 1",
        combatants,
        combatRound,
        combatTurn,
        conditions,
        status: "active",
      },
    ],
    activeFightId: fightId,
    presets: [],
  };
}

export function reviveCombatSessions(parsed: unknown): CombatSessionsState {
  if (!parsed || typeof parsed !== "object") {
    const legacy = migrateFromLegacyStorage();
    return legacy ?? createDefaultSessions();
  }

  const data = parsed as Record<string, unknown>;
  const fightsRaw = Array.isArray(data.fights) ? data.fights : [];
  const fights = fightsRaw
    .map((f, i) => normalizeFight(f, i))
    .filter((f): f is CombatFight => f !== null)
    .slice(0, MAX_COMBAT_FIGHTS);

  if (fights.length === 0) return createDefaultSessions();

  const presets = (Array.isArray(data.presets) ? data.presets : [])
    .map(normalizePreset)
    .filter((p): p is CombatPreset => p !== null);

  const activeFightId =
    typeof data.activeFightId === "string" && fights.some((f) => f.id === data.activeFightId)
      ? data.activeFightId
      : fights[0].id;

  return { fights, activeFightId, presets };
}

export function readCombatSessionsFromStorage(
  fallbackCombatants: Combatant[] = [],
): CombatSessionsState {
  if (typeof window === "undefined") return createDefaultSessions(fallbackCombatants);
  try {
    const item = window.localStorage.getItem(COMBAT_SESSIONS_STORAGE_KEY);
    if (item) return reviveCombatSessions(JSON.parse(item));
  } catch {
  }
  const legacy = migrateFromLegacyStorage();
  if (legacy) return legacy;
  return createDefaultSessions(fallbackCombatants);
}

export function createDefaultSessions(
  combatants: Combatant[] = [],
  name = "Walka 1",
): CombatSessionsState {
  const fightId = crypto.randomUUID();
  return {
    fights: [
      {
        id: fightId,
        name,
        combatants,
        combatRound: 1,
        combatTurn: 0,
        conditions: [],
        status: "active",
      },
    ],
    activeFightId: fightId,
    presets: [],
  };
}

export function getActiveFight(state: CombatSessionsState): CombatFight {
  return state.fights.find((f) => f.id === state.activeFightId) ?? state.fights[0];
}

export function updateActiveFight(
  state: CombatSessionsState,
  updater: (fight: CombatFight) => CombatFight,
): CombatSessionsState {
  const activeId = state.activeFightId;
  return {
    ...state,
    fights: state.fights.map((f) => (f.id === activeId ? updater(f) : f)),
  };
}

export function updateFightById(
  state: CombatSessionsState,
  fightId: string,
  updater: (fight: CombatFight) => CombatFight,
): CombatSessionsState {
  return {
    ...state,
    fights: state.fights.map((f) => (f.id === fightId ? updater(f) : f)),
  };
}

export function cloneCombatantsForFight(combatants: Combatant[]): Combatant[] {
  return combatants.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    hp: { ...c.hp },
    statuses: [...c.statuses],
  }));
}

export function cloneCombatantsForPreset(combatants: Combatant[]): Combatant[] {
  return cloneCombatantsForFight(combatants);
}

export function nextDefaultFightName(fights: CombatFight[]): string {
  const used = new Set(fights.map((f) => f.name));
  let n = fights.length + 1;
  while (used.has(`Walka ${n}`)) n += 1;
  return `Walka ${n}`;
}

export function createEmptyFight(state: CombatSessionsState, preset?: CombatPreset): CombatSessionsState {
  if (state.fights.length >= MAX_COMBAT_FIGHTS) return state;

  const id = crypto.randomUUID();
  const combatants = preset ? cloneCombatantsForFight(preset.combatants) : [];
  const fight: CombatFight = {
    id,
    name: nextDefaultFightName(state.fights),
    combatants,
    combatRound: 1,
    combatTurn: 0,
    conditions: [],
    status: "active",
  };

  return {
    ...state,
    fights: [...state.fights, fight],
    activeFightId: id,
  };
}

export function removeFight(state: CombatSessionsState, fightId: string): CombatSessionsState {
  if (state.fights.length <= 1) return state;

  const fights = state.fights.filter((f) => f.id !== fightId);
  const activeFightId =
    state.activeFightId === fightId ? fights[0].id : state.activeFightId;

  return { ...state, fights, activeFightId };
}

export function setActiveFightId(state: CombatSessionsState, fightId: string): CombatSessionsState {
  if (!state.fights.some((f) => f.id === fightId)) return state;
  return { ...state, activeFightId: fightId };
}

export function renameFight(state: CombatSessionsState, fightId: string, name: string): CombatSessionsState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return updateFightById(state, fightId, (f) => ({ ...f, name: trimmed }));
}

export function setFightStatus(
  state: CombatSessionsState,
  fightId: string,
  status: CombatFightStatus,
): CombatSessionsState {
  return updateFightById(state, fightId, (f) => ({ ...f, status }));
}

export function addPresetFromFight(
  state: CombatSessionsState,
  name: string,
  combatants: Combatant[],
): CombatSessionsState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  const preset: CombatPreset = {
    id: crypto.randomUUID(),
    name: trimmed,
    combatants: cloneCombatantsForPreset(combatants),
  };
  return { ...state, presets: [...state.presets, preset] };
}

export function upsertPreset(
  state: CombatSessionsState,
  preset: CombatPreset,
): CombatSessionsState {
  const exists = state.presets.some((p) => p.id === preset.id);
  return {
    ...state,
    presets: exists
      ? state.presets.map((p) => (p.id === preset.id ? preset : p))
      : [...state.presets, preset],
  };
}

export function deletePreset(state: CombatSessionsState, presetId: string): CombatSessionsState {
  return { ...state, presets: state.presets.filter((p) => p.id !== presetId) };
}
