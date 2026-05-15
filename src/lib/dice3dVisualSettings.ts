/** Ustawienia wizualne rzutów 3D (dice-box-threejs) — persystencja + walidacja. */

export const DICE_3D_VISUAL_STORAGE_KEY = "magnus-dice-3d-visual";

/** Klucze tekstur kostek — tylko wybrane (reszta plików w `textures/` zostaje w paczce, nie w UI). */
export const DICE_3D_TEXTURE_KEYS = ["", "wood", "marble", "metal", "fire", "dragon", "uwu"] as const;

export const DICE_3D_UWU_TEXTURE_KEY = "uwu" as const satisfies Dice3DThemeTexture;

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
  { value: DICE_3D_UWU_TEXTURE_KEY, label: "UwU" },
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

/** Materiały obsługiwane przez dice-box-threejs (bp). „plastic” = mat „none”. */
export function mapDiceMaterialToLibrary(material: Dice3DThemeMaterial): "none" | "glass" | "wood" | "metal" {
  if (material === "plastic") return "none";
  if (material === "glass" || material === "wood" || material === "metal") return material;
  return "none";
}

const TEXTURE_COLOR_PRESETS: Record<
  Dice3DThemeTexture,
  { foreground: string; background: string }
> = {
  "": { foreground: "#1a1208", background: "#d4c5a9" },
  wood: { foreground: "#2a1810", background: "#b8956a" },
  marble: { foreground: "#1c1c1c", background: "#e6e2d8" },
  metal: { foreground: "#0f1419", background: "#a8b4c0" },
  // Ogień: ciemna podkładka + source-over (patrz MAGNUS_DICE_CUSTOM_TEXTURES) — multiply + brąz zabija obraz
  fire: { foreground: "#fff8e8", background: "#0a0404" },
  dragon: { foreground: "#d8e8c8", background: "#1e2a1c" },
  uwu: { foreground: "#5c2848", background: "#f5b8d8" },
};

/** Nadpisania tekstur — ścieżki względem `public/assets/dice-box/`. */
export const MAGNUS_DICE_CUSTOM_TEXTURES: Record<
  string,
  { name: string; composite: string; source: string; source_bump?: string }
> = {
  fire: {
    name: "Ogień",
    /** Nakładka 1:1 jak w pliku — multiply + ciemne tło zabija obraz. */
    composite: "source-over",
    source: "textures/fire.webp",
  },
  [DICE_3D_UWU_TEXTURE_KEY]: {
    name: "UwU",
    composite: "multiply",
    source: "textures/pink.webp",
    source_bump: "textures/pink.webp",
  },
};

/** Klucz tekstury przekazywany do dice-box-threejs (`getTexture`). */
export function resolveDiceLibraryTextureKey(texture: Dice3DThemeTexture): string {
  if (texture === "") return "none";
  if (texture === DICE_3D_UWU_TEXTURE_KEY) return DICE_3D_UWU_TEXTURE_KEY;
  return texture;
}

/** Colorset przekazywany do `theme_customColorset` — zgodny z API dice-box-threejs. */
export function buildThemeCustomColorset(config: Dice3DVisualConfig): {
  name: string;
  foreground: string;
  background: string;
  outline: string;
  texture: string;
  material: string;
} {
  const textureKey = resolveDiceLibraryTextureKey(config.themeTexture);
  const colors = TEXTURE_COLOR_PRESETS[config.themeTexture];
  const material = mapDiceMaterialToLibrary(config.themeMaterial);

  return {
    name: `magnus-${textureKey}-${material}`,
    foreground: colors.foreground,
    background: colors.background,
    outline: "none",
    texture: textureKey,
    material,
  };
}
