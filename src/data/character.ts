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
  
  export const DEFAULT_CHARACTER: CharacterData = {
    name: "Aldric Grimwald",
    career: "Żołnierz",
    race: "Człowiek",
    stats: [
      { label: "Walka Wręcz", abbr: "WW", value: 42 },
      { label: "Umiejętności Strzeleckie", abbr: "US", value: 35 },
      { label: "Siła", abbr: "S", value: 38 },
      { label: "Wytrzymałość", abbr: "Wt", value: 40 },
      { label: "Zręczność", abbr: "Zr", value: 33 },
      { label: "Inteligencja", abbr: "Int", value: 28 },
      { label: "Siła Woli", abbr: "SW", value: 31 },
      { label: "Ogłada", abbr: "Ogd", value: 25 },
    ],
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