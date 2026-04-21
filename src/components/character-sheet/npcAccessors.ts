import type { SavedNpc } from "./types";

export function statStringToNum(s: string): number {
  const n = parseInt(String(s).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export function getNpcDisplayName(n: SavedNpc): string {
  return n.daneOgolne.imie.trim() || "NPC";
}

/** Statystyki do trackera walki z zagnieżdżonej karty NPC. */
export function getNpcCombatStats(n: SavedNpc) {
  const p = n.cechyGlowne.p;
  const sec = n.cechyDrugorzedne.p;
  const ww = statStringToNum(p.ww);
  const us = statStringToNum(p.us);
  const k = statStringToNum(p.k);
  const odp = statStringToNum(p.odp);
  const zr = statStringToNum(p.zr);
  const zyw = statStringToNum(sec.zyw);
  const armor = statStringToNum(n.punktyZbroi.korpus);
  const weapon = n.bron[0]?.nazwa ?? "";
  const notes = [n.cechyCharakteru, n.opisOgolny].filter(Boolean).join(" · ");
  return {
    ww,
    us,
    sb: Math.floor(k / 10),
    hp: zyw,
    armor,
    toughness: Math.floor(odp / 10),
    initiative: zr,
    weapon,
    notes,
  };
}
