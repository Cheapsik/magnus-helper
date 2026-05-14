import type { StatRow, StatRow2 } from "./types";
import { STAT_MAIN_COLUMNS, STAT_SECONDARY_COLUMNS } from "@/lib/gameStatGlossary";

/** Kolumny cech — etykiety ze wspólnego słownika ([`gameStatGlossary`](@/lib/gameStatGlossary)). */
export const STAT_MAIN: { key: keyof StatRow; label: string }[] = STAT_MAIN_COLUMNS;
export const STAT_SECONDARY: { key: keyof StatRow2; label: string }[] = STAT_SECONDARY_COLUMNS;

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
