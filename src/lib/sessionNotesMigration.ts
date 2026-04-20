import type { SessionNote, SessionNoteScope, NamedNoteSession, NoteSessionCatalog } from "@/lib/sessionNoteModel";

/** Kanoniczne ID kategorii (domyślne + migracja ze starych zapisów). */
export const DEFAULT_NOTE_CATEGORY_IDS = ["general", "npc", "location", "objective", "clue"] as const;

export const NOTE_CATEGORY_LABELS: Record<string, string> = {
  general: "Ogólne",
  npc: "NPC",
  location: "Lokacje",
  objective: "Cele",
  clue: "Tropy",
};

export function categoryLabel(id: string): string {
  return NOTE_CATEGORY_LABELS[id.toLowerCase()] ?? id;
}

function coerceScope(raw: unknown): SessionNoteScope {
  return raw === "session" ? "session" : "global";
}

function readRawNotesFromStorage(): unknown[] {
  try {
    const raw = window.localStorage.getItem("rpg_session_notes");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && "notes" in parsed) {
      const n = (parsed as { notes: unknown }).notes;
      if (Array.isArray(n)) return n;
    }
  } catch {
    // ignore
  }
  return [];
}

function legacySessionId(n: number): string {
  return `legacy-${n}`;
}

/** Z surowego wiersza notatki: numer sesji (stary model) lub undefined. */
function rawSessionNumber(row: unknown): number | undefined {
  if (!row || typeof row !== "object") return undefined;
  const sn = (row as Record<string, unknown>).sessionNumber;
  if (typeof sn === "number" && Number.isFinite(sn) && sn >= 1) return Math.floor(sn);
  return undefined;
}

/** Normalizuje pojedynczą notatkę (w tym migracja `sessionNumber` → `sessionId`). */
export function normalizeSessionNote(row: unknown): SessionNote {
  if (!row || typeof row !== "object") {
    return {
      id: crypto.randomUUID(),
      text: "",
      category: "general",
      timestamp: Date.now(),
      scope: "global",
      pinned: false,
    };
  }
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : crypto.randomUUID();
  const text = typeof r.text === "string" ? r.text : "";
  const category = typeof r.category === "string" && r.category.trim() ? r.category.trim() : "general";
  const timestamp = typeof r.timestamp === "number" && Number.isFinite(r.timestamp) ? r.timestamp : Date.now();
  const scope = coerceScope(r.scope);

  let sessionId: string | undefined;
  if (scope === "session") {
    if (typeof r.sessionId === "string" && r.sessionId.trim()) {
      sessionId = r.sessionId.trim();
    } else {
      const sn = r.sessionNumber;
      const n = typeof sn === "number" && Number.isFinite(sn) && sn >= 1 ? Math.floor(sn) : 1;
      sessionId = legacySessionId(n);
    }
  }

  const titleRaw = typeof r.title === "string" ? r.title.trim() : "";
  const title = titleRaw ? titleRaw : undefined;
  const pinned = Boolean(r.pinned);
  const linkedNpcIds = Array.isArray(r.linkedNpcIds)
    ? r.linkedNpcIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    : undefined;

  return {
    id,
    text,
    category,
    timestamp,
    scope,
    sessionId: scope === "session" ? sessionId : undefined,
    title,
    pinned,
    linkedNpcIds: linkedNpcIds?.length ? linkedNpcIds : undefined,
  };
}

/**
 * Odczyt z localStorage: tablica, lub `{ notes, version }`.
 * Stare wpisy bez `scope` → `global`.
 */
export function migrateSessionNotesFromUnknown(parsed: unknown): SessionNote[] {
  let rawList: unknown[] | null = null;
  if (Array.isArray(parsed)) rawList = parsed;
  else if (parsed && typeof parsed === "object" && "notes" in parsed) {
    const n = (parsed as { notes: unknown }).notes;
    if (Array.isArray(n)) rawList = n;
  }
  if (!rawList) return [];
  return rawList.map(normalizeSessionNote);
}

/** Domyślny katalog (SSR / brak danych). */
export const EMPTY_NOTE_SESSION_CATALOG: NoteSessionCatalog = {
  sessions: [{ id: "ns-default-1", name: "Sesja 1" }],
  activeSessionId: "ns-default-1",
};

function normalizeSessionRow(row: unknown): NamedNoteSession | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : null;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : null;
  if (!id || !name) return null;
  return { id, name };
}

function mergeSessionsWithNotes(sessions: NamedNoteSession[], notes: SessionNote[]): NamedNoteSession[] {
  const list = [...sessions];
  const have = new Set(list.map((s) => s.id));
  for (const n of notes) {
    if (n.scope !== "session" || !n.sessionId) continue;
    if (have.has(n.sessionId)) continue;
    have.add(n.sessionId);
    const m = /^legacy-(\d+)$/.exec(n.sessionId);
    const name = m ? `Sesja ${m[1]}` : "Sesja";
    list.push({ id: n.sessionId, name });
  }
  return list;
}

/** Pierwszy odczyt katalogu (z dysku lub bootstrap / migracja). */
export function readNoteSessionCatalogFromStorage(): NoteSessionCatalog {
  if (typeof window === "undefined") return EMPTY_NOTE_SESSION_CATALOG;
  try {
    const raw = window.localStorage.getItem("rpg_notes_session_catalog");
    if (raw) return reviveNoteSessionCatalog(JSON.parse(raw));
    return reviveNoteSessionCatalog(null);
  } catch {
    return EMPTY_NOTE_SESSION_CATALOG;
  }
}

/** Katalog sesji + aktywna sesja; migracja ze starego `rpg_notes_active_session` (liczba). */
export function reviveNoteSessionCatalog(parsed: unknown): NoteSessionCatalog {
  if (typeof window === "undefined") return EMPTY_NOTE_SESSION_CATALOG;

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const p = parsed as Record<string, unknown>;
    const sessionsRaw = p.sessions;
    const activeRaw = p.activeSessionId;
    if (Array.isArray(sessionsRaw) && sessionsRaw.length > 0) {
      const baseSessions = sessionsRaw.map(normalizeSessionRow).filter(Boolean) as NamedNoteSession[];
      let activeSessionId =
        typeof activeRaw === "string" && activeRaw.trim() && baseSessions.some((s) => s.id === activeRaw.trim())
          ? activeRaw.trim()
          : baseSessions[0].id;
      const notes = migrateSessionNotesFromUnknown(JSON.parse(window.localStorage.getItem("rpg_session_notes") || "null"));
      const sessions = mergeSessionsWithNotes(baseSessions, notes);
      if (!sessions.some((s) => s.id === activeSessionId)) activeSessionId = sessions[0].id;
      const prevActiveOk =
        typeof activeRaw === "string" && activeRaw.trim() && baseSessions.some((s) => s.id === activeRaw.trim());
      if (sessions.length > baseSessions.length || !prevActiveOk) {
        try {
          window.localStorage.setItem("rpg_notes_session_catalog", JSON.stringify({ sessions, activeSessionId }));
        } catch {
          // ignore
        }
      }
      return { sessions, activeSessionId };
    }
  }

  const rawRows = readRawNotesFromStorage();
  const nums = new Set<number>();
  for (const row of rawRows) {
    const n = rawSessionNumber(row);
    if (n != null) nums.add(n);
    const r = row as Record<string, unknown>;
    if (r.scope === "session" && typeof r.sessionId === "string" && r.sessionId.startsWith("legacy-")) {
      const m = /^legacy-(\d+)$/.exec(r.sessionId);
      if (m) nums.add(Number.parseInt(m[1], 10));
    }
  }

  let oldActiveNum = 1;
  try {
    const legacy = window.localStorage.getItem("rpg_notes_active_session");
    if (legacy != null) {
      const n = JSON.parse(legacy);
      if (typeof n === "number" && Number.isFinite(n) && n >= 1) oldActiveNum = Math.floor(n);
    }
  } catch {
    // ignore
  }

  const maxFromNotes = nums.size ? Math.max(...nums) : 0;
  const maxN = Math.max(maxFromNotes, oldActiveNum, 1);

  const sessions: NamedNoteSession[] = [];
  for (let i = 1; i <= maxN; i++) {
    sessions.push({ id: legacySessionId(i), name: `Sesja ${i}` });
  }

  const activeSessionId = sessions.some((s) => s.id === legacySessionId(oldActiveNum))
    ? legacySessionId(oldActiveNum)
    : sessions[0].id;

  try {
    window.localStorage.removeItem("rpg_notes_active_session");
  } catch {
    // ignore
  }

  const notes = migrateSessionNotesFromUnknown(JSON.parse(window.localStorage.getItem("rpg_session_notes") || "null"));
  const mergedSessions = mergeSessionsWithNotes(sessions, notes);
  const finalSessions = mergedSessions.length ? mergedSessions : EMPTY_NOTE_SESSION_CATALOG.sessions;
  const finalActive = finalSessions.some((s) => s.id === activeSessionId) ? activeSessionId : finalSessions[0].id;

  try {
    window.localStorage.setItem(
      "rpg_notes_session_catalog",
      JSON.stringify({ sessions: finalSessions, activeSessionId: finalActive }),
    );
  } catch {
    // ignore
  }

  return { sessions: finalSessions, activeSessionId: finalActive };
}

export function reviveNoteCategories(parsed: unknown): string[] {
  const base = [...DEFAULT_NOTE_CATEGORY_IDS];
  const seen = new Set(base.map((s) => s.toLowerCase()));
  if (!Array.isArray(parsed)) return base;
  for (const x of parsed) {
    if (typeof x !== "string" || !x.trim()) continue;
    const t = x.trim();
    const low = t.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    base.push(t as (typeof DEFAULT_NOTE_CATEGORY_IDS)[number]);
  }
  return base;
}

export interface SessionNoteTemplate {
  id: string;
  title: string;
  body: string;
}

export function reviveNoteTemplates(parsed: unknown): SessionNoteTemplate[] {
  if (!Array.isArray(parsed)) return [];
  const out: SessionNoteTemplate[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : crypto.randomUUID();
    const title = typeof r.title === "string" ? r.title : "";
    const body = typeof r.body === "string" ? r.body : "";
    out.push({ id, title, body });
  }
  return out;
}
