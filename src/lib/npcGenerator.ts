const M_NAMES = [
  "Bartosz", "Dawid", "Jakub", "Kacper", "Maciej", "Michał", "Piotr", "Tomasz",
  "Wojciech", "Marcin", "Kamil", "Łukasz", "Adam", "Szymon", "Mateusz",
];
const F_NAMES = [
  "Anna", "Maria", "Katarzyna", "Magdalena", "Agnieszka", "Joanna", "Aleksandra",
  "Natalia", "Zofia", "Julia", "Emilia", "Hanna", "Weronika", "Marta", "Karolina",
];
const JOBS = [
  "kupiec", "kowal", "strażnik", "garncarz", "szewc", "rybak", "myśliwy", "zielarz",
  "paser", "bajarz", "sługa", "stajenny", "palacz", "bednarz", "złotnik", "akolita",
  "pielgrzym", "rzeźnik", "piwowar", "łazęba",
];
const TRAITS = [
  "gadatliwy", "skryty", "chciwy", "honorowy", "tchórzliwy", "zarozumiały", "ciekawski",
  "zgorzkniały", "łagodny", "podejrzliwy", "pracowity", "leniwy", "optymistyczny",
  "pesymista", "impulsywny", "ostrożny", "hojny", "złośliwy", "lojalny", "zdradziecki",
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

/** A passer-by the GM needs right now: name, trade, one trait. */
export function randomNpcLine(): string {
  return `${pick(Math.random() < 0.5 ? M_NAMES : F_NAMES)}, ${pick(JOBS)} — ${pick(TRAITS)}`;
}
