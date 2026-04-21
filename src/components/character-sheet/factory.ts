import { DEFAULT_BASIC_SKILLS } from "./constants";
import type { CharacterSheetCore, Hero, KampaniaBlock, SavedNpc, StatRow, StatRow2 } from "./types";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const emptyStat = (): StatRow => ({
  ww: "",
  us: "",
  k: "",
  odp: "",
  zr: "",
  int: "",
  sw: "",
  ogd: "",
});

export const emptyStat2 = (): StatRow2 => ({
  a: "",
  zyw: "",
  s: "",
  wt: "",
  sz: "",
  mag: "",
  po: "",
  pp: "",
});

export const defaultKampania = (): KampaniaBlock => ({
  gracz: "",
  kampania: "",
  mistrzGry: "",
  rokKampanii: "",
});

export function createCharacterSheetCore(): CharacterSheetCore {
  return {
    daneOgolne: { imie: "", rasa: "", obecnaProfesja: "", poprzedniaProfesja: "" },
    opis: {
      wiek: "",
      plec: "",
      oczy: "",
      waga: "",
      wlosy: "",
      wzrost: "",
      znakGwiezdny: "",
      rodzenstwo: "",
      miejsceUrodzenia: "",
      znakiSzczegolne: "",
    },
    cechyGlowne: { p: emptyStat(), s: emptyStat(), a: emptyStat() },
    cechyDrugorzedne: { p: emptyStat2(), s: emptyStat2(), a: emptyStat2() },
    xp: { obecne: "", razem: "" },
    ruch: { ruch: "", szarza: "", bieg: "" },
    punktyZbroi: {
      glowa: "",
      korpus: "",
      prawaReka: "",
      lewaReka: "",
      prawaNoga: "",
      lewaNoga: "",
    },
    bron: [],
    pancerzProsty: [],
    pancerzZlozony: [],
    umiejetnosciPodstawowe: DEFAULT_BASIC_SKILLS.map((nazwa) => ({
      id: newId(),
      nazwa,
      wykupione: false,
      plus10: false,
      plus20: false,
      zdolnosci: "",
    })),
    umiejetnosciZaawansowane: [],
    zdolnosci: [],
    pieniadze: { zk: "", s: "", p: "" },
    wyposazenie: [],
  };
}

export function createEmptyHero(): Hero {
  return {
    id: newId(),
    ...createCharacterSheetCore(),
    kampania: defaultKampania(),
  };
}

export function createEmptyNpc(): SavedNpc {
  return {
    id: newId(),
    ...createCharacterSheetCore(),
    cechyCharakteru: "",
    opisOgolny: "",
    notatkiMG: "",
  };
}
