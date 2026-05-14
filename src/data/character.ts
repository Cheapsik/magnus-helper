import { getStatFullName, getStatGlossaryEntry, type GameStatKey } from "@/lib/gameStatGlossary";

export interface CharacterData {
    name: string;
    career: string;
    race: string;
    stats: { label: string; abbr: string; value: number }[];
    wounds: { current: number; max: number };
    fatePoints: number;
    conditions: string[];
    equipment: string[];
    weapons: { name: string; damage: string; qualities: string }[];
    armor: { name: string; ap: number; locations: string }[];
    notes: string;
}

const DEFAULT_CHARACTER_STATS_SPEC: { key: GameStatKey; value: number }[] = [
  { key: "ww", value: 42 },
  { key: "us", value: 35 },
  { key: "s", value: 38 },
  { key: "wt", value: 40 },
  { key: "zr", value: 33 },
  { key: "int", value: 28 },
  { key: "sw", value: 31 },
  { key: "ogd", value: 25 },
];

function buildDefaultCharacterStats(): { label: string; abbr: string; value: number }[] {
  return DEFAULT_CHARACTER_STATS_SPEC.map(({ key, value }) => ({
    label: getStatFullName(key),
    abbr: getStatGlossaryEntry(key).abbr,
    value,
  }));
}

export const DEFAULT_CHARACTER: CharacterData = {
    name: "Aldric Grimwald",
    career: "Żołnierz",
    race: "Człowiek",
    stats: buildDefaultCharacterStats(),
    wounds: { current: 11, max: 14 },
    fatePoints: 2,
    conditions: ["Zmęczony"],
    equipment: [
      "Plecak",
      "Lina (10m)",
      "Racje żywnościowe (3 dni)",
      "Bukłak",
      "Krzesiwo",
      "Latarnia",
      "Okład leczniczy ×2",
      "12 srebrnych monet",
    ],
    weapons: [
      { name: "Broń jednoręczna (Miecz)", damage: "SB+4", qualities: "Wyważona" },
      { name: "Sztylet", damage: "SB+1", qualities: "Szybka" },
      { name: "Łuk krótki", damage: "3", qualities: "—" },
    ],
    armor: [
      { name: "Skórzany kaftan", ap: 1, locations: "Korpus, Ręce" },
      { name: "Kolczy czepiec", ap: 3, locations: "Głowa" },
      { name: "Skórzane nogawice", ap: 1, locations: "Nogi" },
    ],
    notes:
      "Aktualnie podróżuje z drużyną w kierunku Ubersreiku. Jest winien przysługę kupcowi Heinzowi. Nie ufa elfowi. Kończy mu się prowiant — trzeba uzupełnić zapasy w następnym mieście.",
  };