import type { Combatant } from "@/context/AppContext";

/** Gotowy przeciwnik (preset MG) — rozszerzalny schemat. */
export interface GmEnemy {
  id: string;
  name: string;
  ww: number;
  /** Bieżące PŻ; max = hpMax ?? hp (kompatybilność wsteczna). */
  hp: number;
  hpMax?: number;
  armor: number;
  weapon: string;
  description?: string;
  us?: number;
  sb?: number;
  initiative?: number;
  toughness?: number;
  k?: number;
  odp?: number;
  zr?: number;
  int?: number;
  sw?: number;
  ogd?: number;
  mag?: number;
  sz?: number;
  s?: number;
  wt?: number;
  a?: number;
  po?: number;
  pp?: number;
}
export function gmEnemyToCombatant(e: GmEnemy): Combatant {
  const hpMax = Math.max(1, e.hpMax ?? e.hp);
  const hpCur = Math.min(hpMax, e.hp);
  return {
    id: crypto.randomUUID(),
    name: e.name,
    initiative: e.initiative ?? e.zr ?? e.ww,
    ww: e.ww,
    us: e.us ?? 20,
    sb: e.sb ?? Math.floor(e.ww / 10),
    hp: { current: hpCur, max: hpMax },
    armor: e.armor,
    toughness: e.toughness ?? 3,
    statuses: [],
    notes: [e.weapon, e.description].filter(Boolean).join("\n\n") || "",
    isEnemy: true,
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Migracja wpisów z localStorage po rozszerzeniu schematu. */
export function reviveGmEnemies(parsed: unknown): GmEnemy[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.map((raw) => {
    const x = raw as Record<string, unknown>;
    return {
      id: String(x.id || crypto.randomUUID()),
      name: String(x.name ?? ""),
      ww: num(x.ww, 30),
      hp: num(x.hp, 8),
      hpMax: optNum(x.hpMax),
      armor: num(x.armor, 0),
      weapon: String(x.weapon ?? ""),
      description: typeof x.description === "string" ? x.description : undefined,
      us: optNum(x.us),
      sb: optNum(x.sb),
      initiative: optNum(x.initiative),
      toughness: optNum(x.toughness),
      k: optNum(x.k),
      odp: optNum(x.odp),
      zr: optNum(x.zr),
      int: optNum(x.int),
      sw: optNum(x.sw),
      ogd: optNum(x.ogd),
      mag: optNum(x.mag),
      sz: optNum(x.sz),
      s: optNum(x.s),
      wt: optNum(x.wt),
      a: optNum(x.a),
      po: optNum(x.po),
      pp: optNum(x.pp),
    };
  });
}
