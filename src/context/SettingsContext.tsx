import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  THEMES,
  ThemeDefinition,
  ThemeId,
} from "@/types/settings";

/* ─────────────────────────────────────────────────────────────
 * Hex / HSL helpers
 * Aplikacja stylowana jest przez zmienne shadcn (`--primary`,
 * `--background`, ...) w formacie "H S% L%" wstrzykiwane do
 * `hsl(var(--x))`. Motywy z spec są w HEX, więc tu jest mostek.
 * ────────────────────────────────────────────────────────────*/

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(full, 16);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

/** Zmienne motywu mapowane na zmienne używane przez shadcn/tailwind. */
function buildShadcnVars(theme: ThemeDefinition): Record<string, string> {
  const v = theme.vars;
  return {
    "--background": hslString(v["--bg-primary"]),
    "--foreground": hslString(v["--text-primary"]),
    "--card": hslString(v["--bg-card"]),
    "--card-foreground": hslString(v["--text-primary"]),
    "--popover": hslString(v["--bg-card"]),
    "--popover-foreground": hslString(v["--text-primary"]),
    "--primary": hslString(v["--accent-gold"]),
    "--primary-foreground": hslString(v["--bg-primary"]),
    "--secondary": hslString(v["--bg-tertiary"]),
    "--secondary-foreground": hslString(v["--text-primary"]),
    "--muted": hslString(v["--bg-tertiary"]),
    "--muted-foreground": hslString(v["--text-muted"]),
    "--accent": hslString(v["--bg-tertiary"]),
    "--accent-foreground": hslString(v["--text-primary"]),
    "--destructive": hslString(v["--accent-red"]),
    "--destructive-foreground": hslString(v["--text-primary"]),
    "--border": hslString(v["--border-color"]),
    "--input": hslString(v["--border-color"]),
    "--ring": hslString(v["--accent-gold"]),
    "--sidebar-background": hslString(v["--bg-secondary"]),
    "--sidebar-foreground": hslString(v["--text-muted"]),
    "--sidebar-primary": hslString(v["--accent-gold"]),
    "--sidebar-primary-foreground": hslString(v["--bg-primary"]),
    "--sidebar-accent": hslString(v["--bg-tertiary"]),
    "--sidebar-accent-foreground": hslString(v["--text-primary"]),
    "--sidebar-border": hslString(v["--border-color"]),
    "--sidebar-ring": hslString(v["--accent-gold"]),
  };
}

function applyTheme(themeId: ThemeId) {
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_SETTINGS.theme];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, val]) => root.style.setProperty(k, String(val)));
  Object.entries(buildShadcnVars(theme)).forEach(([k, val]) => root.style.setProperty(k, val));
  root.dataset.theme = theme.id;
}

/* ─────────────────────────────────────────────────────────────
 * Storage helpers
 * ────────────────────────────────────────────────────────────*/

const SETTINGS_KEYS_TO_PRESERVE = new Set<string>([SETTINGS_STORAGE_KEY]);
const APP_DATA_PREFIXES = ["magnus_", "rpg_"] as const;

function isAppDataKey(key: string): boolean {
  if (SETTINGS_KEYS_TO_PRESERVE.has(key)) return false;
  return APP_DATA_PREFIXES.some((p) => key.startsWith(p));
}

function collectAppDataKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && isAppDataKey(k)) keys.push(k);
  }
  return keys;
}

function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const theme: ThemeId = parsed.theme && parsed.theme in THEMES ? parsed.theme : DEFAULT_SETTINGS.theme;
    return { ...DEFAULT_SETTINGS, ...parsed, theme };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: AppSettings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — ignorujemy */
  }
}

function dateStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ─────────────────────────────────────────────────────────────
 * Context
 * ────────────────────────────────────────────────────────────*/

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  resetData: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    // Aplikujemy motyw przed pierwszym renderem, żeby uniknąć "flashu"
    // domyślnego motywu przy starcie aplikacji.
    if (typeof document !== "undefined") {
      applyTheme(loaded.theme);
    }
    return loaded;
  });

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Synchronizacja zmian w innych kartach przeglądarki.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SETTINGS_STORAGE_KEY) return;
      setSettings(loadSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next: AppSettings = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const exportData = useCallback(() => {
    try {
      const data: Record<string, string> = {};
      for (const key of collectAppDataKeys()) {
        const value = window.localStorage.getItem(key);
        if (value !== null) data[key] = value;
      }
      const payload = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        data,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `magnus_backup_${dateStamp()}.json`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Dane wyeksportowane pomyślnie");
    } catch {
      toast.error("Nie udało się wyeksportować danych");
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error("Nieprawidłowy plik backupu");
      throw new Error("invalid_json");
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !("data" in parsed) ||
      typeof (parsed as { data: unknown }).data !== "object" ||
      (parsed as { data: unknown }).data === null
    ) {
      toast.error("Nieprawidłowy plik backupu");
      throw new Error("invalid_shape");
    }

    const dataObj = (parsed as { data: Record<string, unknown> }).data;
    const appKeys = Object.keys(dataObj).filter(isAppDataKey);
    if (appKeys.length === 0) {
      toast.error("Nieprawidłowy plik backupu");
      throw new Error("no_app_keys");
    }

    // Czyścimy istniejące dane aplikacji (z wyjątkiem ustawień),
    // a następnie nadpisujemy je z backupu.
    for (const k of collectAppDataKeys()) {
      try { window.localStorage.removeItem(k); } catch { /* noop */ }
    }
    for (const k of appKeys) {
      const raw = dataObj[k];
      const value = typeof raw === "string" ? raw : JSON.stringify(raw);
      try { window.localStorage.setItem(k, value); } catch { /* quota */ }
    }
    toast.success("Dane zaimportowane — przeładowuję…");
    window.setTimeout(() => window.location.reload(), 300);
  }, []);

  const resetData = useCallback(() => {
    for (const k of collectAppDataKeys()) {
      try { window.localStorage.removeItem(k); } catch { /* noop */ }
    }
    window.setTimeout(() => window.location.reload(), 150);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, exportData, importData, resetData }),
    [settings, updateSettings, exportData, importData, resetData],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings musi być użyty wewnątrz SettingsProvider");
  return ctx;
}

export { THEMES, applyTheme };
