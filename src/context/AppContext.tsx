import { createContext, useContext, useMemo, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { initLootStorage } from "@/lib/lootDb";
import type { LootDbItem } from "@/lib/lootDb";
import type { DiceRoll, TestResult } from "@/lib/dice";
import type { CharacterData } from "@/data/character";
import { DEFAULT_CHARACTER } from "@/data/character";
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

const DEFAULT_COMBATANTS: Combatant[] = [
  { id: "c1", name: "Aldric (Gracz)", initiative: 42, ww: 42, us: 35, sb: 3, hp: { current: 11, max: 14 }, armor: 1, toughness: 4, statuses: [], notes: "", isEnemy: false },
  { id: "c2", name: "Goblin Łucznik", initiative: 35, ww: 25, us: 30, sb: 2, hp: { current: 6, max: 6 }, armor: 0, toughness: 3, statuses: [], notes: "Ma krótki łuk", isEnemy: true },
  { id: "c3", name: "Goblin Wojownik", initiative: 28, ww: 30, us: 20, sb: 3, hp: { current: 8, max: 8 }, armor: 0, toughness: 3, statuses: [], notes: "", isEnemy: true },
];

const DEFAULT_ENEMIES: GmEnemy[] = [
  { id: "e1", name: "Goblin", ww: 25, hp: 6, armor: 0, weapon: "Zardzewiały tasak (SB+2)" },
  { id: "e2", name: "Ork", ww: 35, hp: 12, armor: 1, weapon: "Choppa (SB+4)" },
  { id: "e3", name: "Szkielet", ww: 25, hp: 5, armor: 0, weapon: "Stary miecz (SB+3)" },
  { id: "e4", name: "Bandyta", ww: 30, hp: 10, armor: 1, weapon: "Miecz (SB+4)" },
  { id: "e5", name: "Wilk", ww: 35, hp: 8, armor: 0, weapon: "Kły (SB+2)" },
  { id: "e6", name: "Ghul", ww: 30, hp: 12, armor: 0, weapon: "Pazury (SB+3), Zatruty" },
];

const DEFAULT_NOTES: SessionNote[] = [
  { id: "n1", text: "Podróż do Ubersreiku z drużyną", category: "general", timestamp: Date.now(), scope: "global", pinned: false },
  { id: "n2", text: "Heinz — kupiec, jestem mu winien przysługę", category: "npc", timestamp: Date.now(), scope: "global", pinned: false },
  { id: "n3", text: "Nie ufam elfowi w drużynie", category: "general", timestamp: Date.now(), scope: "global", pinned: false },
  { id: "n4", text: "Uzupełnić zapasy w następnym mieście", category: "objective", timestamp: Date.now(), scope: "global", pinned: false },
  { id: "n5", text: "Ubersreik — cel podróży", category: "location", timestamp: Date.now(), scope: "global", pinned: false },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "i1", name: "Miecz", category: "weapons", quantity: 1 },
  { id: "i2", name: "Sztylet", category: "weapons", quantity: 1 },
  { id: "i3", name: "Łuk krótki", category: "weapons", quantity: 1 },
  { id: "i4", name: "Strzały", category: "weapons", quantity: 20, maxQuantity: 20 },
  { id: "i5", name: "Skórzany kaftan", category: "armor", quantity: 1 },
  { id: "i6", name: "Kolczy czepiec", category: "armor", quantity: 1 },
  { id: "i7", name: "Okład leczniczy", category: "consumables", quantity: 2 },
  { id: "i8", name: "Racje żywnościowe", category: "consumables", quantity: 3 },
  { id: "i9", name: "Lina (10m)", category: "gear", quantity: 1 },
  { id: "i10", name: "Latarnia", category: "gear", quantity: 1 },
  { id: "i11", name: "Krzesiwo", category: "gear", quantity: 1 },
  { id: "i12", name: "Złote korony", category: "coins", quantity: 0 },
  { id: "i13", name: "Srebrne szylingi", category: "coins", quantity: 12 },
  { id: "i14", name: "Miedziane pensy", category: "coins", quantity: 8 },
];

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
  character: CharacterData;
  updateCharacter: (data: CharacterData) => void;
  pinnedSheets: string[];
  togglePinSheet: (id: string) => void;
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
  /** Lista nazwanych sesji + aktualnie wybrana (notatki, filtry). */
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
  const [character, setCharacter] = useLocalStorage<CharacterData>("rpg_character", DEFAULT_CHARACTER);
  const [pinnedSheets, setPinnedSheets] = useLocalStorage<string[]>("rpg_codex_pins", []);
  const [combatants, setCombatants] = useLocalStorage<Combatant[]>("rpg_combatants", DEFAULT_COMBATANTS);
  const [combatRound, setCombatRound] = useLocalStorage<number>("rpg_combat_round", 1);
  const [combatTurn, setCombatTurn] = useLocalStorage<number>("rpg_combat_turn", 0);
  const [conditions, setConditions] = useLocalStorage<ActiveCondition[]>("rpg_conditions", []);
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
  const updateCharacter = (data: CharacterData) => setCharacter(data);
  const togglePinSheet = (id: string) => setPinnedSheets((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <AppContext.Provider value={{
      rollHistory, addRoll, clearRollHistory,
      testHistory, addTestResult, clearTestHistory,
      character, updateCharacter,
      pinnedSheets, togglePinSheet,
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
