import { rollDie } from "@/lib/dice";
import { createEmptyNpc, newId } from "./factory";
import type { Bron, SavedNpc, StatRow, StatRow2, Zdolnosc } from "./types";

const NPC_NAMES = [
  "Brunhilde Weissmann",
  "Kaspar Hecht",
  "Gretchen Müller",
  "Albrecht Stahl",
  "Elsbeth Krause",
  "Dieter Fuchs",
  "Hilda Brandt",
  "Wolfgang Eisenberg",
  "Magda Schneider",
  "Fritz Hammerschmidt",
  "Ottilie Wirth",
  "Heinrich Voss",
  "Kunigunde Asche",
  "Sigmund Rauchfang",
  "Liesel Dunkel",
  "Ruprecht Grau",
];

const NPC_TRAITS = [
  "podejrzliwy",
  "gadatliwy",
  "milczący",
  "nerwowy",
  "chciwy",
  "uprzejmy",
  "agresywny",
  "pijany",
  "religijny",
  "przebiegły",
  "tchórzliwy",
  "honorowy",
  "skąpy",
  "hojny",
  "paranoiczny",
];

const NPC_OCCUPATIONS = [
  "Kupiec",
  "Żołnierz",
  "Kapłan",
  "Złodziej",
  "Rzemieślnik",
  "Szlachcic",
  "Chłop",
  "Łowca",
  "Cyrkowiec",
  "Żebrak",
  "Strażnik",
  "Mag",
  "Kowal",
  "Karczmarz",
  "Medyk",
];

const RACES = ["Człowiek", "Krasnolud", "Elf", "Niziołek", "Półelf", "Półork"];

const WEAPONS: [string, string][] = [
  ["Miecz krótki", "Broń ręczna"],
  ["Sztylet", "Broń ręczna"],
  ["Topór bojowy", "Broń ręczna"],
  ["Buława", "Broń ręczna"],
  ["Łuk", "Broń dystansowa"],
  ["Kusza lekka", "Broń dystansowa"],
  ["Włócznia", "Broń ręczna"],
  ["Rapier", "Broń ręczna"],
];

const TALENTS: [string, string][] = [
  ["Silny cios", "Atak z +1 do obrażeń przy pierwszym trafieniu."],
  ["Twardziel", "Ignoruj pierwszy stan ogłuszenia w scenie."],
  ["Szybki refleks", "+2 do inicjatywy przy pierwszym starciu."],
  ["Odporny", "+10% do testów przeciw chorobom."],
  ["Biegły w broni", "+5% do ataku wybraną bronią."],
];

function pick<T>(arr: readonly T[]): T {
  return arr[rollDie(arr.length) - 1];
}

function pickDistinct<T>(arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length > 0) {
    const i = rollDie(copy.length) - 1;
    out.push(copy[i]);
    copy.splice(i, 1);
  }
  return out;
}

function rollMainStat(): string {
  return String(20 + rollDie(20));
}

function tripleStatRow(row: StatRow): { p: StatRow; s: StatRow; a: StatRow } {
  return { p: { ...row }, s: { ...row }, a: { ...row } };
}

function tripleStatRow2(row: StatRow2): { p: StatRow2; s: StatRow2; a: StatRow2 } {
  return { p: { ...row }, s: { ...row }, a: { ...row } };
}

/** Losowy NPC (bez id) — pełna karta wg planu. */
export function generateRandomNpcSheet(): Omit<SavedNpc, "id"> {
  const base = createEmptyNpc();
  const name = pick(NPC_NAMES);
  const trait1 = pick(NPC_TRAITS);
  let trait2 = pick(NPC_TRAITS);
  while (trait2 === trait1) trait2 = pick(NPC_TRAITS);
  const occupation = pick(NPC_OCCUPATIONS);
  const prevOcc = pick(NPC_OCCUPATIONS);
  const race = pick(RACES);

  const ww = rollMainStat();
  const us = rollMainStat();
  const k = rollMainStat();
  const odp = rollMainStat();
  const zr = rollMainStat();
  const int = rollMainStat();
  const sw = rollMainStat();
  const ogd = rollMainStat();

  const mainRow: StatRow = { ww, us, k, odp, zr, int, sw, ogd };

  const kNum = parseInt(k, 10) || 0;
  const odpNum = parseInt(odp, 10) || 0;
  const zyw = String(8 + rollDie(6) + rollDie(6));
  const secRow: StatRow2 = {
    a: "1",
    zyw,
    s: String(Math.floor(kNum / 10)),
    wt: String(Math.floor(odpNum / 10)),
    sz: "4",
    mag: "0",
    po: "0",
    pp: String(rollDie(3) - 1),
  };

  const nBron = rollDie(2);
  const bron: Bron[] = [];
  for (let i = 0; i < nBron; i++) {
    const [nazwa, kat] = pick(WEAPONS);
    bron.push({
      id: newId(),
      nazwa,
      obc: "",
      kategoria: kat,
      sila: "",
      zasieg: "",
      przeladowanie: "",
      cechy: "",
    });
  }

  const pickedIdx = new Set(pickDistinct(base.umiejetnosciPodstawowe.map((_, i) => i), 3));
  const umiejetnosciPodstawowe = base.umiejetnosciPodstawowe.map((u, idx) => ({
    ...u,
    wykupione: pickedIdx.has(idx),
  }));

  const [talName, talDesc] = pick(TALENTS);
  const zdolnosci: Zdolnosc[] = [{ id: newId(), nazwa: talName, opis: talDesc }];

  const pz = () => String(rollDie(3) - 1);
  const punktyZbroi = {
    glowa: pz(),
    korpus: pz(),
    prawaReka: pz(),
    lewaReka: pz(),
    prawaNoga: pz(),
    lewaNoga: pz(),
  };

  const zk = String(rollDie(6) - 1);
  const s = String(rollDie(20) - 1);
  const p = String(rollDie(12) - 1);

  const { id: _id, ...rest } = base;
  return {
    ...rest,
    daneOgolne: {
      imie: name,
      rasa: race,
      obecnaProfesja: occupation,
      poprzedniaProfesja: prevOcc === occupation ? "" : prevOcc,
    },
    cechyCharakteru: `${trait1}, ${trait2}`,
    opisOgolny: `Losowo wygenerowany NPC — ${race}, ${occupation}.`,
    notatkiMG: "",
    cechyGlowne: tripleStatRow(mainRow),
    cechyDrugorzedne: tripleStatRow2(secRow),
    bron,
    umiejetnosciPodstawowe,
    zdolnosci,
    punktyZbroi,
    pieniadze: { zk, s, p },
  };
}
