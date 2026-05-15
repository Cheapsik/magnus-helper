/** Ustawienia wizualne rzutów 3D (dice-box-threejs) — persystencja + walidacja. */

export const DICE_3D_VISUAL_STORAGE_KEY = "magnus-dice-3d-visual";

/** Klucze tekstur kostek — tylko wybrane (reszta plików w `textures/` zostaje w paczce, nie w UI). */
export const DICE_3D_TEXTURE_KEYS = ["", "wood", "marble", "metal", "fire", "dragon"] as const;

export type Dice3DThemeTexture = (typeof DICE_3D_TEXTURE_KEYS)[number];

export const DICE_3D_MATERIAL_KEYS = ["none", "glass", "wood", "metal", "plastic"] as const;
export type Dice3DThemeMaterial = (typeof DICE_3D_MATERIAL_KEYS)[number];

export interface Dice3DVisualConfig {
  /** Pusty string = brak nakładki tekstury (jak domyślna paczka). */
  themeTexture: Dice3DThemeTexture;
  themeMaterial: Dice3DThemeMaterial;
  sounds: boolean;
  shadows: boolean;
}

export const DEFAULT_DICE_3D_VISUAL: Dice3DVisualConfig = {
  themeTexture: "wood",
  themeMaterial: "glass",
  sounds: false,
  shadows: true,
};

export const DICE_3D_TEXTURE_OPTIONS: { value: Dice3DThemeTexture; label: string }[] = [
  { value: "", label: "Bez tekstury" },
  { value: "wood", label: "Drewno" },
  { value: "marble", label: "Marmur" },
  { value: "metal", label: "Metal" },
  { value: "fire", label: "Ogień" },
  { value: "dragon", label: "Smok" },
];

export const DICE_3D_MATERIAL_OPTIONS: { value: Dice3DThemeMaterial; label: string }[] = [
  { value: "none", label: "Mat (none)" },
  { value: "glass", label: "Szkło" },
  { value: "wood", label: "Drewno" },
  { value: "metal", label: "Metal" },
  { value: "plastic", label: "Plastik" },
];

function isTexture(v: unknown): v is Dice3DThemeTexture {
  return typeof v === "string" && (DICE_3D_TEXTURE_KEYS as readonly string[]).includes(v);
}

function isMaterial(v: unknown): v is Dice3DThemeMaterial {
  return typeof v === "string" && (DICE_3D_MATERIAL_KEYS as readonly string[]).includes(v);
}

export function normalizeDice3DVisual(raw: unknown): Dice3DVisualConfig {
  const base = { ...DEFAULT_DICE_3D_VISUAL };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (isTexture(o.themeTexture)) base.themeTexture = o.themeTexture;
  else if (typeof o.themeTexture === "string" && o.themeTexture !== "") {
    base.themeTexture = "wood";
  }
  if (isMaterial(o.themeMaterial)) base.themeMaterial = o.themeMaterial;
  if (typeof o.sounds === "boolean") base.sounds = o.sounds;
  if (typeof o.shadows === "boolean") base.shadows = o.shadows;
  return base;
}

export function loadDice3DVisualSettings(): Dice3DVisualConfig {
  try {
    const raw = localStorage.getItem(DICE_3D_VISUAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DICE_3D_VISUAL };
    return normalizeDice3DVisual(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_DICE_3D_VISUAL };
  }
}

export function saveDice3DVisualSettings(config: Dice3DVisualConfig): void {
  try {
    localStorage.setItem(DICE_3D_VISUAL_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* quota / private mode */
  }
}

/** Krótki klucz do `key` na komponencie 3D (reinicjalizacja). */
export function dice3DVisualConfigKey(c: Dice3DVisualConfig): string {
  return [c.themeTexture, c.themeMaterial, c.sounds ? "1" : "0", c.shadows ? "1" : "0"].join("|");
}
