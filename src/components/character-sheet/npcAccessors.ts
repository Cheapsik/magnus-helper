import type { CharacterSheetCore, SavedNpc, StatRow, StatRow2 } from "./types";

/** Fragment karty (bohater / NPC) do liczenia statów trackera. */
export type CombatStatsSheetSlice = Pick<CharacterSheetCore, "cechyGlowne" | "cechyDrugorzedne" | "punktyZbroi" | "bron">;

export function statStringToNum(s: string): number {
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export function getNpcDisplayName(n: SavedNpc): string {
  return n.daneOgolne.imie.trim() || "NPC";
}

function pickMainStr(sheet: CombatStatsSheetSlice, key: keyof StatRow): string {
  const a = String(sheet.cechyGlowne.a[key] ?? "").trim();
  if (a !== "") return String(sheet.cechyGlowne.a[key]);
  return String(sheet.cechyGlowne.p[key] ?? "");
}

function pickSecStr(sheet: CombatStatsSheetSlice, key: keyof StatRow2): string {
  const a = String(sheet.cechyDrugorzedne.a[key] ?? "").trim();
  if (a !== "") return String(sheet.cechyDrugorzedne.a[key]);
  return String(sheet.cechyDrugorzedne.p[key] ?? "");
}

/**
 * Statystyki do trackera z karty (bohater lub NPC) — wiersz „Aktualna” z fallbackiem na „Początkową”.
 */
export function getCharacterSheetCombatStats(sheet: CombatStatsSheetSlice) {
  const ww = statStringToNum(pickMainStr(sheet, "ww"));
  const us = statStringToNum(pickMainStr(sheet, "us"));
  const k = statStringToNum(pickMainStr(sheet, "k"));
  const odp = statStringToNum(pickMainStr(sheet, "odp"));
  const zr = statStringToNum(pickMainStr(sheet, "zr"));

  const secP = sheet.cechyDrugorzedne.p;
  const secA = sheet.cechyDrugorzedne.a;
  const maxZyw = statStringToNum(String(secP.zyw ?? ""));
  const aktZywStr = String(secA.zyw ?? "").trim();
  const hasAktZyw = aktZywStr !== "";
  const aktZyw = hasAktZyw ? statStringToNum(aktZywStr) : maxZyw;
  const hpMax = Math.max(1, maxZyw || aktZyw || 1);
  const hpCurrent = Math.min(hpMax, hasAktZyw ? aktZyw : maxZyw);

  const armor = statStringToNum(sheet.punktyZbroi.korpus);
  const weapon = sheet.bron[0]?.nazwa ?? "";
  return {
    ww,
    us,
    sb: Math.floor(k / 10),
    /** Bieżące PŻ (do trackera) */
    hp: hpCurrent,
    hpMax,
    armor,
    toughness: Math.floor(odp / 10),
    initiative: zr,
    weapon,
  };
}

/** Statystyki do trackera walki z karty NPC — jak {@link getCharacterSheetCombatStats} + notatki z pola NPC. */
export function getNpcCombatStats(n: SavedNpc) {
  const c = getCharacterSheetCombatStats(n);
  const notes = [n.cechyCharakteru, n.opisOgolny].filter(Boolean).join(" · ");
  return { ...c, notes };
}
