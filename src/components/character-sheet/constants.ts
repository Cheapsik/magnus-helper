import type { StatRow, StatRow2 } from "./types";

export const DEFAULT_BASIC_SKILLS = [
  "Charakteryzacja",
  "Dowodzenie",
  "Hazard",
  "Jeździectwo",
  "Mocna głowa",
  "Opieka nad zwierzętami",
  "Plotkowanie",
  "Pływanie",
  "Powożenie",
  "Przekonywanie",
  "Przeszukiwanie",
  "Skradanie się",
  "Spostrzegawczość",
  "Sztuka przetrwania",
  "Targowanie",
  "Ukrywanie się",
  "Wioślarstwo",
  "Wspinaczka",
  "Wycena",
  "Zastraszanie",
];

export const STAT_MAIN: { key: keyof StatRow; label: string }[] = [
  { key: "ww", label: "WW" },
  { key: "us", label: "US" },
  { key: "k", label: "K" },
  { key: "odp", label: "Odp" },
  { key: "zr", label: "Zr" },
  { key: "int", label: "Int" },
  { key: "sw", label: "SW" },
  { key: "ogd", label: "Ogd" },
];

export const STAT_SECONDARY: { key: keyof StatRow2; label: string }[] = [
  { key: "a", label: "A" },
  { key: "zyw", label: "Żyw" },
  { key: "s", label: "S" },
  { key: "wt", label: "Wt" },
  { key: "sz", label: "Sz" },
  { key: "mag", label: "Mag" },
  { key: "po", label: "PO" },
  { key: "pp", label: "PP" },
];

/** Zestawienie akcji — treść jak na karcie PDF (tylko odczyt). */
export const AKCJE_GRUPY: { naglowek: string; wiersze: [string, string][] }[] = [
  {
    naglowek: "Akcje podstawowe",
    wiersze: [
      ["Atak wielokrotny", "Akcja podwójna"],
      ["Odwrót", "Akcja podwójna"],
      ["Przeładowanie", "Różnie"],
      ["Ruch", "Akcja"],
      ["Rzucenie zaklęcia", "Różnie"],
      ["Szarża", "Akcja podwójna"],
      ["Użycie przedmiotu", "Akcja"],
      ["Wstawanie / dosiadanie wierzchowca", "Akcja"],
      ["Wycelowanie", "Akcja"],
      ["Wykorzystanie umiejętności", "Różnie"],
      ["Zwykły atak", "Akcja"],
    ],
  },
  {
    naglowek: "Akcje złożone",
    wiersze: [
      ["Bieg", "Akcja podwójna"],
      ["Finta", "Akcja"],
      ["Odepchnięcie", "Akcja"],
      ["Opóźnienie", "Akcja"],
      ["Ostrożny atak", "Akcja podwójna"],
      ["Parowanie", "Akcja"],
      ["Pozycja obronna", "Akcja podwójna"],
      ["Skok", "Akcja podwójna"],
      ["Szaleńczy atak", "Akcja podwójna"],
    ],
  },
];
