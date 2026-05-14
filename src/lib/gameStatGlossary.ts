import type { StatRow, StatRow2 } from "@/components/character-sheet/types";

export type SheetStatMainKey = keyof StatRow;
export type SheetStatSecondaryKey = keyof StatRow2;

export type GameStatExtraKey =
  | "sb"
  | "inic"
  | "pnc"
  | "pż"
  | "wt2"
  | "zywShort"
  | "wtSoak";

export type GameStatKey = SheetStatMainKey | SheetStatSecondaryKey | GameStatExtraKey;

export type StatGlossaryEntry = {
  abbr: string;
  fullName: string;
};

const G: Record<GameStatKey, StatGlossaryEntry> = {
  ww: { abbr: "WW", fullName: "Walka wręcz" },
  us: { abbr: "US", fullName: "Umiejętności strzeleckie" },
  k: { abbr: "K", fullName: "Krzepa" },
  odp: { abbr: "Odp", fullName: "Odporność" },
  zr: { abbr: "Zr", fullName: "Zręczność" },
  int: { abbr: "Int", fullName: "Inteligencja" },
  sw: { abbr: "SW", fullName: "Siła woli" },
  ogd: { abbr: "Ogd", fullName: "Ogłada" },
  a: { abbr: "A", fullName: "Ataki" },
  zyw: { abbr: "Żyw", fullName: "Żywotność" },
  s: { abbr: "S", fullName: "Siła" },
  wt: { abbr: "Wt", fullName: "Wytrzymałość" },
  sz: { abbr: "Sz", fullName: "Szybkość" },
  mag: { abbr: "Mag", fullName: "Magia" },
  po: { abbr: "PO", fullName: "Punkty obrażeń" },
  pp: { abbr: "PP", fullName: "Punkty pancerza" },
  sb: { abbr: "SB", fullName: "Siła bojowa" },
  inic: { abbr: "Inicjatywa", fullName: "Inicjatywa" },
  pnc: { abbr: "Pnc", fullName: "Pancerz — ochrona (wartość odejmowana od obrażeń)" },
  pż: { abbr: "PŻ", fullName: "Punkty żywotności" },
  wt2: { abbr: "Wt (2)", fullName: "Wytrzymałość (cecha drugorzędna z karty)" },
  zywShort: { abbr: "Żyw.", fullName: "Żywotność" },
  wtSoak: { abbr: "Wyt. w.", fullName: "Wytrzymałość — bonus redukcji obrażeń w walce" },
};

const MAIN_ORDER: SheetStatMainKey[] = ["ww", "us", "k", "odp", "zr", "int", "sw", "ogd"];
const SECONDARY_ORDER: SheetStatSecondaryKey[] = ["a", "zyw", "s", "wt", "sz", "mag", "po", "pp"];

export const STAT_MAIN_COLUMNS: { key: SheetStatMainKey; label: string }[] = MAIN_ORDER.map((key) => ({
  key,
  label: G[key].abbr,
}));

export const STAT_SECONDARY_COLUMNS: { key: SheetStatSecondaryKey; label: string }[] = SECONDARY_ORDER.map(
  (key) => ({
    key,
    label: G[key].abbr,
  }),
);

export function getStatGlossaryEntry(key: GameStatKey): StatGlossaryEntry {
  return G[key];
}

export function getStatFullName(key: GameStatKey): string {
  return G[key].fullName;
}

/** Normalizacja etykiet z UI (np. "WW *", "Odp") do dopasowania. */
function normalizeAbbrLabel(raw: string): string {
  return raw.replace(/\s*\*+\s*$/, "").trim();
}

const ABBR_ALIASES: Record<string, GameStatKey> = {
  ww: "ww",
  us: "us",
  k: "k",
  odp: "odp",
  zr: "zr",
  int: "int",
  sw: "sw",
  ogd: "ogd",
  a: "a",
  żyw: "zyw",
  zyw: "zyw",
  s: "s",
  wt: "wt",
  sz: "sz",
  mag: "mag",
  po: "po",
  pp: "pp",
  sb: "sb",
  inicjatywa: "inic",
  inic: "inic",
  pnc: "pnc",
  pancerz: "pnc",
  "pż": "pż",
  pz: "pż",
  "wt (2)": "wt2",
  "żyw.": "zywShort",
  "wt celu": "wtSoak",
};

export function getStatTooltipByAbbr(display: string): string | undefined {
  const n = normalizeAbbrLabel(display).toLowerCase();
  if (!n) return undefined;
  const key = ABBR_ALIASES[n];
  if (key) return G[key].fullName;
  return undefined;
}

/** Dopasowanie po dokładnym skrócie jak w glossary (np. z `stat.abbr`). */
export function getStatTooltipByExactAbbr(abbr: string): string | undefined {
  const trimmed = abbr.trim();
  for (const key of Object.keys(G) as GameStatKey[]) {
    if (G[key].abbr === trimmed) return G[key].fullName;
  }
  return undefined;
}
