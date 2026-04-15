export interface DiceRoll {
    id: string;
    label: string;
    count: number;
    sides: number;
    modifier: number;
    results: number[];
    total: number;
    timestamp: number;
  }
  
  export interface DicePreset {
    label: string;
    count: number;
    sides: number;
    modifier: number;
  }
  
  export interface TestResult {
    roll: number;
    target: number;
    success: boolean;
    margin: number;
    label: string;
    timestamp: number;
  }
  
  export const rollDie = (sides: number): number =>
    Math.floor(Math.random() * sides) + 1;
  
  export const rollDice = (count: number, sides: number): number[] =>
    Array.from({ length: count }, () => rollDie(sides));
  
  export const rollPercentile = (): number => rollDie(100);
  
  export const formatDice = (count: number, sides: number, modifier: number): string => {
    let s = `${count}k${sides}`;
    if (modifier > 0) s += `+${modifier}`;
    else if (modifier < 0) s += `${modifier}`;
    return s;
  };
  
  export const DEFAULT_PRESETS: DicePreset[] = [
    { label: "1k100", count: 1, sides: 100, modifier: 0 },
    { label: "1k20", count: 1, sides: 20, modifier: 0 },
    { label: "2k10", count: 2, sides: 10, modifier: 0 },
    { label: "1k10", count: 1, sides: 10, modifier: 0 },
    { label: "4k6", count: 4, sides: 6, modifier: 0 },
    { label: "2k6", count: 2, sides: 6, modifier: 0 },
    { label: "1k6", count: 1, sides: 6, modifier: 0 },
    { label: "2k10+3", count: 2, sides: 10, modifier: 3 },
  ];
  
  export const DICE_TYPES = [3, 4, 6, 8, 10, 12, 20, 100];
  
  export const DIFFICULTY_PRESETS = [
    { label: "Very Easy", labelPl: "Bardzo łatwy", modifier: 30 },
    { label: "Easy", labelPl: "Łatwy", modifier: 20 },
    { label: "Routine", labelPl: "Rutynowy", modifier: 10 },
    { label: "Average", labelPl: "Przeciętny", modifier: 0 },
    { label: "Challenging", labelPl: "Wymagający", modifier: -10 },
    { label: "Hard", labelPl: "Trudny", modifier: -20 },
    { label: "Very Hard", labelPl: "Bardzo trudny", modifier: -30 },
  ];