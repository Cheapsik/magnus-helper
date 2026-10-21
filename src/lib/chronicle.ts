import { readJson, writeJson } from "@/lib/storage";
import { EMPTY_NOTE_SESSION_CATALOG } from "@/lib/sessionNotesMigration";
import type { NoteSessionCatalog } from "@/lib/sessionNoteModel";

/**
 * What happened in the campaign, as it happened: modules append events here
 * and the chronicle page turns one session's events into its recap. Events are
 * filed under the session active in the notes catalog at the moment.
 */

export const CHRONICLE_EVENTS_KEY = "rpg_chronicle_events";
const SESSION_CATALOG_KEY = "rpg_notes_session_catalog";
const MAX_EVENTS = 2000;

export type ChronicleKind = "clock" | "calendar" | "combat" | "secret" | "faction" | "travel" | "note" | "other";

export type ChronicleEvent = {
  id: string;
  at: number;
  sessionId: string;
  kind: ChronicleKind;
  /** One line of Polish, written by the module that logged it. */
  text: string;
};

export function reviveChronicleEvents(parsed: unknown): ChronicleEvent[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (e): e is ChronicleEvent =>
      !!e && typeof e === "object" && typeof e.id === "string" && typeof e.text === "string" && typeof e.sessionId === "string",
  );
}

export function appendEvent(
  events: ChronicleEvent[],
  event: Pick<ChronicleEvent, "kind" | "text">,
  sessionId: string,
  at: number,
  id: string,
): ChronicleEvent[] {
  return [...events, { ...event, sessionId, at, id }].slice(-MAX_EVENTS);
}

export function eventsForSession(events: ChronicleEvent[], sessionId: string): ChronicleEvent[] {
  return events.filter((e) => e.sessionId === sessionId).sort((a, b) => a.at - b.at);
}

/** Records one event under the active session. Safe to call from any handler. */
export function logChronicleEvent(event: Pick<ChronicleEvent, "kind" | "text">): void {
  const catalog = readJson<NoteSessionCatalog>(SESSION_CATALOG_KEY, EMPTY_NOTE_SESSION_CATALOG);
  const events = reviveChronicleEvents(readJson<unknown>(CHRONICLE_EVENTS_KEY, []));
  writeJson(CHRONICLE_EVENTS_KEY, appendEvent(events, event, catalog.activeSessionId, Date.now(), crypto.randomUUID()));
}
