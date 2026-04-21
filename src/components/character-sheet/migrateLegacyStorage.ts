import { createEmptyNpc, newId } from "./factory";
import type { SavedNpc, StatRow, StatRow2 } from "./types";

/** Stary płaski zapis NPC (przed migracją do karty WFRP). */
interface LegacyFlatNpc {
  id: string;
  name: string;
  occupation: string;
  traits: string;
  description: string;
  ww: number;
  us: number;
  s: number;
  wt: number;
  zr: number;
  int: number;
  sw: number;
  ogd: number;
  a: number;
  sz: number;
  mag: number;
  po: number;
  pp: number;
  hp: number;
  armor: number;
  weapon: string;
  notes: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isLegacyFlatNpc(x: unknown): x is LegacyFlatNpc {
  if (!isRecord(x)) return false;
  if (!("name" in x) || typeof x.name !== "string") return false;
  if ("daneOgolne" in x) return false;
  return "ww" in x && typeof x.ww === "number";
}

function isNewFormatNpc(x: unknown): x is SavedNpc {
  if (!isRecord(x)) return false;
  if (!("daneOgolne" in x) || !isRecord(x.daneOgolne)) return false;
  if (!("cechyGlowne" in x) || !isRecord(x.cechyGlowne)) return false;
  return "imie" in x.daneOgolne;
}

function legacyFlatToSaved(old: LegacyFlatNpc): SavedNpc {
  const n = createEmptyNpc();
  n.id = old.id || newId();
  n.daneOgolne.imie = old.name;
  n.daneOgolne.obecnaProfesja = old.occupation;
  n.daneOgolne.poprzedniaProfesja = "";
  n.daneOgolne.rasa = "";
  n.cechyCharakteru = old.traits;
  n.opisOgolny = old.description;
  n.notatkiMG = old.notes;

  const row: StatRow = {
    ww: String(old.ww),
    us: String(old.us),
    k: String(old.s),
    odp: String(old.wt),
    zr: String(old.zr),
    int: String(old.int),
    sw: String(old.sw),
    ogd: String(old.ogd),
  };
  n.cechyGlowne = { p: { ...row }, s: { ...row }, a: { ...row } };

  const sec: StatRow2 = {
    a: String(old.a),
    zyw: String(old.hp),
    s: String(Math.floor(old.s / 10)),
    wt: String(Math.floor(old.wt / 10)),
    sz: String(old.sz),
    mag: String(old.mag),
    po: String(old.po),
    pp: String(old.pp),
  };
  n.cechyDrugorzedne = { p: { ...sec }, s: { ...sec }, a: { ...sec } };

  if (old.weapon.trim()) {
    n.bron = [
      {
        id: newId(),
        nazwa: old.weapon,
        obc: "",
        kategoria: "",
        sila: "",
        zasieg: "",
        przeladowanie: "",
        cechy: "",
      },
    ];
  }
  n.punktyZbroi = {
    ...n.punktyZbroi,
    korpus: String(old.armor),
  };
  return n;
}

/** Normalizuje pojedynczy wpis (legacy flat → SavedNpc, uzupełnia brakujące pola). */
export function normalizeSavedNpcEntry(item: unknown): SavedNpc | null {
  if (isLegacyFlatNpc(item)) {
    return legacyFlatToSaved(item);
  }
  if (isNewFormatNpc(item)) {
    const n = item as SavedNpc;
    const defaults = createEmptyNpc();
    return {
      ...defaults,
      ...n,
      id: n.id || newId(),
      daneOgolne: { ...defaults.daneOgolne, ...n.daneOgolne },
      opis: { ...defaults.opis, ...n.opis },
      cechyGlowne: {
        p: { ...defaults.cechyGlowne.p, ...n.cechyGlowne.p },
        s: { ...defaults.cechyGlowne.s, ...n.cechyGlowne.s },
        a: { ...defaults.cechyGlowne.a, ...n.cechyGlowne.a },
      },
      cechyDrugorzedne: {
        p: { ...defaults.cechyDrugorzedne.p, ...n.cechyDrugorzedne.p },
        s: { ...defaults.cechyDrugorzedne.s, ...n.cechyDrugorzedne.s },
        a: { ...defaults.cechyDrugorzedne.a, ...n.cechyDrugorzedne.a },
      },
      xp: { ...defaults.xp, ...n.xp },
      ruch: { ...defaults.ruch, ...n.ruch },
      punktyZbroi: { ...defaults.punktyZbroi, ...n.punktyZbroi },
      pieniadze: { ...defaults.pieniadze, ...n.pieniadze },
      cechyCharakteru: n.cechyCharakteru ?? "",
      opisOgolny: n.opisOgolny ?? "",
      notatkiMG: n.notatkiMG ?? "",
      bron: Array.isArray(n.bron) ? n.bron : defaults.bron,
      pancerzProsty: Array.isArray(n.pancerzProsty) ? n.pancerzProsty : defaults.pancerzProsty,
      pancerzZlozony: Array.isArray(n.pancerzZlozony) ? n.pancerzZlozony : defaults.pancerzZlozony,
      umiejetnosciPodstawowe:
        Array.isArray(n.umiejetnosciPodstawowe) && n.umiejetnosciPodstawowe.length > 0
          ? n.umiejetnosciPodstawowe
          : defaults.umiejetnosciPodstawowe,
      umiejetnosciZaawansowane: Array.isArray(n.umiejetnosciZaawansowane) ? n.umiejetnosciZaawansowane : [],
      zdolnosci: Array.isArray(n.zdolnosci) ? n.zdolnosci : [],
      wyposazenie: Array.isArray(n.wyposazenie) ? n.wyposazenie : [],
    };
  }
  return null;
}

export function normalizeSavedNpcArray(parsed: unknown): SavedNpc[] {
  if (!Array.isArray(parsed)) return [];
  const out: SavedNpc[] = [];
  for (const item of parsed) {
    const n = normalizeSavedNpcEntry(item);
    if (n) out.push(n);
  }
  return out;
}

const STORAGE_KEY = "rpg_saved_npcs";

/** Wywołać przed pierwszym renderem (main.tsx) — przepisuje localStorage jeśli są legacy NPC. */
export function migrateSavedNpcsStorage(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    const hasLegacy = parsed.some(isLegacyFlatNpc);
    const normalized = normalizeSavedNpcArray(parsed);
    const dropped = normalized.length !== parsed.length;
    if (hasLegacy || dropped) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // ignore
  }
}
