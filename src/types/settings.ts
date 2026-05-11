export type ThemeId =
  | "steel_and_gold"
  | "forest_and_copper"
  | "ink_and_silver"
  | "blood_and_bone"
  | "purple_and_bone"
  | "stone_and_enamel";

export interface AppSettings {
  theme: ThemeId;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "steel_and_gold",
};

export const SETTINGS_STORAGE_KEY = "nexus_settings";

/**
 * Definicja motywu — surowe wartości HEX (CSS variables w postaci, jakiej
 * oczekuje spec). Provider zadba o ich aplikację (w tym mapowanie na zmienne
 * shadcn HSL używane przez resztę aplikacji).
 */
export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  vars: {
    "--bg-primary": string;
    "--bg-secondary": string;
    "--bg-tertiary": string;
    "--bg-card": string;
    "--accent-gold": string;
    "--accent-gold-hover": string;
    "--accent-red": string;
    "--text-primary": string;
    "--text-muted": string;
    "--text-faint": string;
    "--border-color": string;
    "--border-accent": string;
  };
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  steel_and_gold: {
    id: "steel_and_gold",
    label: "Stal i Złoto",
    vars: {
      "--bg-primary": "#0B0D12",
      "--bg-secondary": "#151922",
      "--bg-tertiary": "#2A2F3A",
      "--bg-card": "#151922",
      "--accent-gold": "#C8A24A",
      "--accent-gold-hover": "#DDB965",
      "--accent-red": "#8B1A1A",
      "--text-primary": "#E8E1D2",
      "--text-muted": "#8A8378",
      "--text-faint": "#4A4540",
      "--border-color": "#2A2F3A",
      "--border-accent": "#3A352A",
    },
  },
  forest_and_copper: {
    id: "forest_and_copper",
    label: "Las i Miedź",
    vars: {
      "--bg-primary": "#0C120F",
      "--bg-secondary": "#151C17",
      "--bg-tertiary": "#263126",
      "--bg-card": "#151C17",
      "--accent-gold": "#7DA56A",
      "--accent-gold-hover": "#95C081",
      "--accent-red": "#8B3A1A",
      "--text-primary": "#D0A06A",
      "--text-muted": "#80614A",
      "--text-faint": "#4A3A2E",
      "--border-color": "#263126",
      "--border-accent": "#2D3526",
    },
  },
  ink_and_silver: {
    id: "ink_and_silver",
    label: "Atrament i Srebro",
    vars: {
      "--bg-primary": "#0B0E14",
      "--bg-secondary": "#141923",
      "--bg-tertiary": "#262C3A",
      "--bg-card": "#141923",
      "--accent-gold": "#8C95B8",
      "--accent-gold-hover": "#A8B0CC",
      "--accent-red": "#8B2A4A",
      "--text-primary": "#D8DCE6",
      "--text-muted": "#7C8092",
      "--text-faint": "#404550",
      "--border-color": "#262C3A",
      "--border-accent": "#2D3245",
    },
  },
  blood_and_bone: {
    id: "blood_and_bone",
    label: "Krew i Kość",
    vars: {
      "--bg-primary": "#100D0E",
      "--bg-secondary": "#1A1416",
      "--bg-tertiary": "#2D1F22",
      "--bg-card": "#1A1416",
      "--accent-gold": "#9E2F2F",
      "--accent-gold-hover": "#BC4A4A",
      "--accent-red": "#6B1818",
      "--text-primary": "#E7D8C8",
      "--text-muted": "#8A7E70",
      "--text-faint": "#4A413A",
      "--border-color": "#2D1F22",
      "--border-accent": "#3A2525",
    },
  },
  purple_and_bone: {
    id: "purple_and_bone",
    label: "Purpura i Kość",
    vars: {
      "--bg-primary": "#0D0B12",
      "--bg-secondary": "#17131D",
      "--bg-tertiary": "#2A2233",
      "--bg-card": "#17131D",
      "--accent-gold": "#8D5AA8",
      "--accent-gold-hover": "#A875C0",
      "--accent-red": "#8B1A4A",
      "--text-primary": "#E4D8EA",
      "--text-muted": "#857A90",
      "--text-faint": "#4A4055",
      "--border-color": "#2A2233",
      "--border-accent": "#322A40",
    },
  },
  stone_and_enamel: {
    id: "stone_and_enamel",
    label: "Kamień i Emalia",
    vars: {
      "--bg-primary": "#0F1114",
      "--bg-secondary": "#181C22",
      "--bg-tertiary": "#2C313A",
      "--bg-card": "#181C22",
      "--accent-gold": "#6E8FA3",
      "--accent-gold-hover": "#8AA8BD",
      "--accent-red": "#8B3A3A",
      "--text-primary": "#D9C9A3",
      "--text-muted": "#857A60",
      "--text-faint": "#4A4335",
      "--border-color": "#2C313A",
      "--border-accent": "#34394A",
    },
  },
};

export const THEME_ORDER: ThemeId[] = [
  "steel_and_gold",
  "forest_and_copper",
  "ink_and_silver",
  "blood_and_bone",
  "purple_and_bone",
  "stone_and_enamel",
];
