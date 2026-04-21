/** Wspólny model karty WFRP2 (PDF) — pola stringowe jak w formularzu. */

export type StatRow = {
  ww: string;
  us: string;
  k: string;
  odp: string;
  zr: string;
  int: string;
  sw: string;
  ogd: string;
};

export type StatRow2 = {
  a: string;
  zyw: string;
  s: string;
  wt: string;
  sz: string;
  mag: string;
  po: string;
  pp: string;
};

export interface Bron {
  id: string;
  nazwa: string;
  obc: string;
  kategoria: string;
  sila: string;
  zasieg: string;
  przeladowanie: string;
  cechy: string;
}

export interface PancerzProsty {
  id: string;
  typ: string;
  pz: string;
}

export interface PancerzZlozony {
  id: string;
  typ: string;
  obc: string;
  lokacja: string;
  pz: string;
}

export interface Umiejetnosc {
  id: string;
  nazwa: string;
  wykupione: boolean;
  plus10: boolean;
  plus20: boolean;
  zdolnosci: string;
}

export interface Zdolnosc {
  id: string;
  nazwa: string;
  opis: string;
}

export interface Wyposazenie {
  id: string;
  nazwa: string;
  obc: string;
  opis: string;
}

/** Rdzeń karty (bez id, bez pól specyficznych bohatera/NPC). */
export interface CharacterSheetCore {
  daneOgolne: {
    imie: string;
    rasa: string;
    obecnaProfesja: string;
    poprzedniaProfesja: string;
  };
  opis: {
    wiek: string;
    plec: string;
    oczy: string;
    waga: string;
    wlosy: string;
    wzrost: string;
    znakGwiezdny: string;
    rodzenstwo: string;
    miejsceUrodzenia: string;
    znakiSzczegolne: string;
  };
  cechyGlowne: { p: StatRow; s: StatRow; a: StatRow };
  cechyDrugorzedne: { p: StatRow2; s: StatRow2; a: StatRow2 };
  xp: { obecne: string; razem: string };
  ruch: { ruch: string; szarza: string; bieg: string };
  punktyZbroi: {
    glowa: string;
    korpus: string;
    prawaReka: string;
    lewaReka: string;
    prawaNoga: string;
    lewaNoga: string;
  };
  bron: Bron[];
  pancerzProsty: PancerzProsty[];
  pancerzZlozony: PancerzZlozony[];
  umiejetnosciPodstawowe: Umiejetnosc[];
  umiejetnosciZaawansowane: Umiejetnosc[];
  zdolnosci: Zdolnosc[];
  pieniadze: { zk: string; s: string; p: string };
  wyposazenie: Wyposazenie[];
}

/** NPC: karta + id + pola poza oficjalnym PDF. */
export type SavedNpc = CharacterSheetCore & {
  id: string;
  cechyCharakteru: string;
  opisOgolny: string;
  notatkiMG: string;
};
