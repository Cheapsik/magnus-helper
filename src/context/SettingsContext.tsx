import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SETTINGS_STORAGE_KEY } from "@/types/settings";
import { isNamespacedKey } from "@/lib/campaignStorage";
import { readJson, writeJson } from "@/lib/storage";

const SETTINGS_KEYS_TO_PRESERVE = new Set<string>([SETTINGS_STORAGE_KEY]);
const APP_DATA_PREFIXES = ["magnus_", "rpg_"] as const;

function isAppDataKey(key: string): boolean {
  if (SETTINGS_KEYS_TO_PRESERVE.has(key)) return false;
  // isNamespacedKey covers all per-campaign keys (Decyzja 2: pełna izolacja).
  return isNamespacedKey(key) || APP_DATA_PREFIXES.some((p) => key.startsWith(p));
}

function collectAppDataKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && isAppDataKey(k)) keys.push(k);
  }
  return keys;
}

function dateStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface SettingsContextValue {
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  resetData: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
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

            for (const k of collectAppDataKeys()) {
      try { window.localStorage.removeItem(k); } catch {}
    }
    for (const k of appKeys) {
      const raw = dataObj[k];
      const value = typeof raw === "string" ? raw : JSON.stringify(raw);
      try { window.localStorage.setItem(k, value); } catch {}
    }
    toast.success("Dane zaimportowane — przeładowuję…");
    window.setTimeout(() => window.location.reload(), 300);
  }, []);

  const resetData = useCallback(() => {
    for (const k of collectAppDataKeys()) {
      try { window.localStorage.removeItem(k); } catch {}
    }
    window.setTimeout(() => window.location.reload(), 150);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ exportData, importData, resetData }),
    [exportData, importData, resetData],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings musi być użyty wewnątrz SettingsProvider");
  return ctx;
}

