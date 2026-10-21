import { useLocalStorage } from "@/hooks/useLocalStorage";
import { readJson, writeJson } from "@/lib/storage";
import { logChronicleEvent } from "@/lib/chronicle";
import { DEFAULT_PLAYER_SCREEN, PLAYER_SCREEN_STORAGE_KEY, revivePlayerScreen } from "@/lib/playerScreen";

/**
 * Table safety agreements of one campaign: hard lines (never on screen),
 * veils (happen off-screen), notes and a session-zero topic checklist.
 */
export const SAFETY_STORAGE_KEY = "rpg_safety";

export interface SafetyTopic {
  id: string;
  text: string;
  done: boolean;
}

export interface SafetyState {
  lines: string[];
  veils: string[];
  notes: string;
  /** yyyy-mm-dd of the last review with the players, "" when never. */
  reviewedAt: string;
  topics: SafetyTopic[];
  /** Log pauses to the chronicle (no details). Off by default for privacy. */
  logPauses: boolean;
}

const DEFAULT_TOPICS = [
  "Ton i klimat kampanii",
  "Czego gracze oczekują od sesji",
  "Tematy, których nie chcemy wcale",
  "Tematy, które mogą zdarzyć się poza kadrem",
  "Jak sygnalizujemy przerwę lub zmianę sceny",
  "Przemoc i jej szczegółowość",
  "Wątki romantyczne",
  "Konflikty między postaciami graczy",
  "Częstotliwość i długość sesji",
];

export const DEFAULT_SAFETY: SafetyState = {
  lines: [],
  veils: [],
  notes: "",
  reviewedAt: "",
  topics: DEFAULT_TOPICS.map((text, i) => ({ id: `t${i + 1}`, text, done: false })),
  logPauses: false,
};

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];
}

export function reviveSafety(parsed: unknown): SafetyState {
  if (!parsed || typeof parsed !== "object") return DEFAULT_SAFETY;
  const p = parsed as Record<string, unknown>;
  const topics = Array.isArray(p.topics)
    ? p.topics.filter(
        (t): t is SafetyTopic => !!t && typeof t === "object" && typeof t.id === "string" && typeof t.text === "string",
      ).map((t) => ({ id: t.id, text: t.text, done: Boolean(t.done) }))
    : DEFAULT_SAFETY.topics;
  return {
    lines: strings(p.lines),
    veils: strings(p.veils),
    notes: typeof p.notes === "string" ? p.notes : "",
    reviewedAt: typeof p.reviewedAt === "string" ? p.reviewedAt : "",
    topics,
    logPauses: Boolean(p.logPauses),
  };
}

/** Appends a trimmed item, ignoring blanks and case-insensitive duplicates. */
export function addItem(list: string[], text: string): string[] {
  const t = text.trim();
  if (!t || list.some((s) => s.toLowerCase() === t.toLowerCase())) return list;
  return [...list, t];
}

const storageOptions = { revive: reviveSafety };

export function useSafety() {
  return useLocalStorage<SafetyState>(SAFETY_STORAGE_KEY, DEFAULT_SAFETY, storageOptions);
}

/** Pauses or resumes the player screen; logs a detail-free event when the campaign opted in. */
export function setPlayerScreenPaused(paused: boolean): void {
  const screenOptions = { revive: revivePlayerScreen };
  const prev = readJson(PLAYER_SCREEN_STORAGE_KEY, DEFAULT_PLAYER_SCREEN, screenOptions);
  if (prev.paused === paused) return;
  writeJson(PLAYER_SCREEN_STORAGE_KEY, { ...prev, paused }, screenOptions);
  if (paused && readJson(SAFETY_STORAGE_KEY, DEFAULT_SAFETY, storageOptions).logPauses) {
    logChronicleEvent({ kind: "other", text: "Przerwa (karta X)" });
  }
}
