import { createContext, useContext, useMemo, useCallback, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getActiveFight,
  readCombatSessionsFromStorage,
  reviveCombatSessions,
  updateActiveFight,
  type CombatSessionsState,
} from "@/lib/combatSessions";
import { initLootStorage } from "@/lib/lootDb";
import type { LootDbItem } from "@/lib/lootDb";
import type { DiceRoll, TestResult } from "@/lib/dice";
import type { SessionNote, NoteSessionCatalog } from "@/lib/sessionNoteModel";
import {
  migrateSessionNotesFromUnknown,
  reviveNoteSessionCatalog,
  readNoteSessionCatalogFromStorage,
} from "@/lib/sessionNotesMigration";
import type { SavedNpc } from "@/components/character-sheet/types";
import { normalizeSavedNpcArray } from "@/components/character-sheet/migrateLegacyStorage";
import type { GmEnemy } from "@/lib/gmEnemy";
import { reviveGmEnemies } from "@/lib/gmEnemy";

initLootStorage();

export type { SessionNote, SessionNoteScope, NamedNoteSession, NoteSessionCatalog } from "@/lib/sessionNoteModel";

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  ww: number;
  us: number;
  sb: number;
  hp: { current: number; max: number };
  armor: number;
  toughness: number;
  /**
   * Stats declared by the card's combat-resource roles. Present on combatants
   * built from cards; older combatants fall back to the fixed fields above,
   * which disappear once every source goes through roles.
   */
  stats?: { label: string; value: number }[];
  statuses: string[];
  notes: string;
  isEnemy: boolean;
}

export type { GmEnemy } from "@/lib/gmEnemy";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  maxQuantity?: number;
}

export interface ActiveCondition {
  id: string;
  name: string;
  rounds?: number;
  severity: "low" | "medium" | "high";
}

export type { SavedNpc } from "@/components/character-sheet/types";

export interface NpcGroup {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface DifficultyPreset {
  label: string;
  labelPl: string;
  modifier: number;
}

export interface LootRank {
  id: string;
  name: string;
  chance: number;
}

export interface CoinRange {
  min: number;
  max: number;
}

export interface LootConfig {
  ranks: LootRank[];
  itemCurrency?: string;
  coinRanges: { gold: CoinRange; silver: CoinRange; copper: CoinRange };
  itemCount: { min: number; max: number };
}

export interface CodexEntry {
  id: string;
  title: string;
  category: string;
  content: string;
}

/**
 * A fresh campaign starts empty — every creature, note and item below belongs
 * to the GM's own setting, not to Magnus.
 */
const DEFAULT_COMBATANTS: Combatant[] = [];

const DEFAULT_ENEMIES: GmEnemy[] = [];

const DEFAULT_NOTES: SessionNote[] = [];

const DEFAULT_INVENTORY: InventoryItem[] = [];

const DEFAULT_DIFFICULTY_PRESETS: DifficultyPreset[] = [
  { label: "Very Easy", labelPl: "Bardzo łatwy", modifier: 30 },
  { label: "Easy", labelPl: "Łatwy", modifier: 20 },
  { label: "Routine", labelPl: "Rutynowy", modifier: 10 },
  { label: "Average", labelPl: "Przeciętny", modifier: 0 },
  { label: "Challenging", labelPl: "Wymagający", modifier: -10 },
  { label: "Hard", labelPl: "Trudny", modifier: -20 },
  { label: "Very Hard", labelPl: "Bardzo trudny", modifier: -30 },
];

const DEFAULT_LOOT_CONFIG: LootConfig = {
  ranks: [
    { id: "r1", name: "Zniszczony", chance: 35 },
    { id: "r2", name: "Pospolity", chance: 30 },
    { id: "r3", name: "Rzadki", chance: 20 },
    { id: "r4", name: "Ciekawy", chance: 10 },
    { id: "r5", name: "Wyjątkowy", chance: 5 },
  ],
  itemCurrency: "sz",
  coinRanges: {
    gold: { min: 0, max: 2 },
    silver: { min: 0, max: 15 },
    copper: { min: 0, max: 30 },
  },
  itemCount: { min: 1, max: 4 },
};

interface AppContextType {
  rollHistory: DiceRoll[];
  addRoll: (roll: DiceRoll) => void;
  clearRollHistory: () => void;
  testHistory: TestResult[];
  addTestResult: (result: TestResult) => void;
  clearTestHistory: () => void;
  pinnedSheets: string[];
  togglePinSheet: (id: string) => void;
  combatSessions: CombatSessionsState;
  setCombatSessions: (fn: CombatSessionsState | ((prev: CombatSessionsState) => CombatSessionsState)) => void;
  combatants: Combatant[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  combatRound: number;
  setCombatRound: (fn: number | ((prev: number) => number)) => void;
  combatTurn: number;
  setCombatTurn: (fn: number | ((prev: number) => number)) => void;
  conditions: ActiveCondition[];
  setConditions: (fn: ActiveCondition[] | ((prev: ActiveCondition[]) => ActiveCondition[])) => void;
  inventory: InventoryItem[];
  setInventory: (fn: InventoryItem[] | ((prev: InventoryItem[]) => InventoryItem[])) => void;
  sessionNotes: SessionNote[];
  setSessionNotes: (fn: SessionNote[] | ((prev: SessionNote[]) => SessionNote[])) => void;
  noteSessionCatalog: NoteSessionCatalog;
  setNoteSessionCatalog: (fn: NoteSessionCatalog | ((prev: NoteSessionCatalog) => NoteSessionCatalog)) => void;
  gmEnemies: GmEnemy[];
  setGmEnemies: (fn: GmEnemy[] | ((prev: GmEnemy[]) => GmEnemy[])) => void;
  savedNpcs: SavedNpc[];
  setSavedNpcs: (fn: SavedNpc[] | ((prev: SavedNpc[]) => SavedNpc[])) => void;
  npcGroups: NpcGroup[];
  setNpcGroups: (fn: NpcGroup[] | ((prev: NpcGroup[]) => NpcGroup[])) => void;
  difficultyPresets: DifficultyPreset[];
  setDifficultyPresets: (fn: DifficultyPreset[] | ((prev: DifficultyPreset[]) => DifficultyPreset[])) => void;
  lootConfig: LootConfig;
  setLootConfig: (fn: LootConfig | ((prev: LootConfig) => LootConfig)) => void;
  lootItems: LootDbItem[];
  setLootItems: (fn: LootDbItem[] | ((prev: LootDbItem[]) => LootDbItem[])) => void;
  codexEntries: CodexEntry[];
  setCodexEntries: (fn: CodexEntry[] | ((prev: CodexEntry[]) => CodexEntry[])) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rollHistory, setRollHistory] = useLocalStorage<DiceRoll[]>("rpg_dice_rolls", []);
  const [testHistory, setTestHistory] = useLocalStorage<TestResult[]>("rpg_test_results", []);
  const [pinnedSheets, setPinnedSheets] = useLocalStorage<string[]>("rpg_codex_pins", []);
  const combatSessionsInitial = useMemo(() => readCombatSessionsFromStorage(DEFAULT_COMBATANTS), []);
  const [combatSessions, setCombatSessions] = useLocalStorage<CombatSessionsState>(
    "rpg_combat_sessions",
    combatSessionsInitial,
    { revive: reviveCombatSessions },
  );

  const activeFight = useMemo(() => getActiveFight(combatSessions), [combatSessions]);

  const combatants = activeFight.combatants;
  const combatRound = activeFight.combatRound;
  const combatTurn = activeFight.combatTurn;
  const conditions = activeFight.conditions;

  const setCombatants = useCallback(
    (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => {
      setCombatSessions((prev) =>
        updateActiveFight(prev, (fight) => ({
          ...fight,
          combatants: typeof fn === "function" ? fn(fight.combatants) : fn,
        })),
      );
    },
    [setCombatSessions],
  );

  const setCombatRound = useCallback(
    (fn: number | ((prev: number) => number)) => {
      setCombatSessions((prev) =>
        updateActiveFight(prev, (fight) => ({
          ...fight,
          combatRound: typeof fn === "function" ? fn(fight.combatRound) : fn,
        })),
      );
    },
    [setCombatSessions],
  );

  const setCombatTurn = useCallback(
    (fn: number | ((prev: number) => number)) => {
      setCombatSessions((prev) =>
        updateActiveFight(prev, (fight) => ({
          ...fight,
          combatTurn: typeof fn === "function" ? fn(fight.combatTurn) : fn,
        })),
      );
    },
    [setCombatSessions],
  );

  const setConditions = useCallback(
    (fn: ActiveCondition[] | ((prev: ActiveCondition[]) => ActiveCondition[])) => {
      setCombatSessions((prev) =>
        updateActiveFight(prev, (fight) => ({
          ...fight,
          conditions: typeof fn === "function" ? fn(fight.conditions) : fn,
        })),
      );
    },
    [setCombatSessions],
  );
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>("rpg_inventory", DEFAULT_INVENTORY);
  const [sessionNotes, setSessionNotes] = useLocalStorage<SessionNote[]>("rpg_session_notes", DEFAULT_NOTES, {
    revive: migrateSessionNotesFromUnknown,
  });
  const catalogInitial = useMemo(() => readNoteSessionCatalogFromStorage(), []);
  const [noteSessionCatalog, setNoteSessionCatalog] = useLocalStorage<NoteSessionCatalog>(
    "rpg_notes_session_catalog",
    catalogInitial,
    { revive: reviveNoteSessionCatalog },
  );
  const [gmEnemies, setGmEnemies] = useLocalStorage<GmEnemy[]>("rpg_gm_enemies", DEFAULT_ENEMIES, {
    revive: reviveGmEnemies,
  });
  const [savedNpcs, setSavedNpcs] = useLocalStorage<SavedNpc[]>("rpg_saved_npcs", [], {
    revive: (parsed) => normalizeSavedNpcArray(parsed),
  });
  const [npcGroups, setNpcGroups] = useLocalStorage<NpcGroup[]>("rpg_npc_groups", []);
  const [difficultyPresets, setDifficultyPresets] = useLocalStorage<DifficultyPreset[]>("rpg_difficulty_presets", DEFAULT_DIFFICULTY_PRESETS);
  const [lootConfig, setLootConfig] = useLocalStorage<LootConfig>("rpg_loot_config", DEFAULT_LOOT_CONFIG);
  const [lootItems, setLootItems] = useLocalStorage<LootDbItem[]>("rpg_items_db", []);
  const [codexEntries, setCodexEntries] = useLocalStorage<CodexEntry[]>("rpg_codex_entries", []);

  const addRoll = (roll: DiceRoll) => setRollHistory((prev) => [roll, ...prev].slice(0, 50));
  const clearRollHistory = () => setRollHistory([]);
  const addTestResult = (result: TestResult) => setTestHistory((prev) => [result, ...prev].slice(0, 50));
  const clearTestHistory = () => setTestHistory([]);
  const togglePinSheet = (id: string) => setPinnedSheets((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <AppContext.Provider value={{
      rollHistory, addRoll, clearRollHistory,
      testHistory, addTestResult, clearTestHistory,
      pinnedSheets, togglePinSheet,
      combatSessions, setCombatSessions,
      combatants, setCombatants, combatRound, setCombatRound, combatTurn, setCombatTurn,
      conditions, setConditions,
      inventory, setInventory,
      sessionNotes, setSessionNotes,
      noteSessionCatalog, setNoteSessionCatalog,
      gmEnemies, setGmEnemies,
      savedNpcs, setSavedNpcs,
      npcGroups, setNpcGroups,
      difficultyPresets, setDifficultyPresets,
      lootConfig, setLootConfig,
      lootItems, setLootItems,
      codexEntries, setCodexEntries,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { LootDbItem } from "@/lib/lootDb";
