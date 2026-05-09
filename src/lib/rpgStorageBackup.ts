const EXTRA_BACKUP_KEYS = new Set(["nexus_scenes", "nexus_last_roll"]);

function shouldBackupStorageKey(key: string) {
  return key.startsWith("rpg_") || EXTRA_BACKUP_KEYS.has(key);
}

/** Zbiera surowe wartości localStorage dla wszystkich obsługiwanych kluczy aplikacji. */
export function collectRpgStorageSnapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !shouldBackupStorageKey(key)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
  } catch {
    // ignore
  }
  return out;
}

function localDateStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pobiera plik JSON (Blob + download). */
export function exportRpgStorageToFile() {
  const data = collectRpgStorageSnapshot();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rpg-backup-${localDateStamp()}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function valueToStorageString(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return JSON.stringify(raw);
  if (typeof raw === "number" || typeof raw === "boolean") return JSON.stringify(raw);
  return null;
}

/** Zapisuje wpisy z kopii do localStorage (tylko znane klucze aplikacji). */
export function applyRpgStorageImport(parsed: unknown): { ok: true; keysWritten: number } | { ok: false; error: string } {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Plik musi zawierać obiekt JSON." };
  }
  let keysWritten = 0;
  for (const [key, rawVal] of Object.entries(parsed as Record<string, unknown>)) {
    if (!shouldBackupStorageKey(key)) continue;
    const v = valueToStorageString(rawVal);
    if (v === null) continue;
    try {
      window.localStorage.setItem(key, v);
      keysWritten++;
    } catch {
      return { ok: false, error: "Brak miejsca w pamięci lub zapis zablokowany." };
    }
  }
  if (keysWritten === 0) {
    return { ok: false, error: "Brak poprawnych kluczy aplikacji w pliku." };
  }
  return { ok: true, keysWritten };
}
