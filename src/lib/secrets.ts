import type { NamedNoteSession } from "@/lib/sessionNoteModel";

/** A secret or clue: campaign-level until revealed, so unrevealed ones carry forward on their own. */
export interface Secret {
  id: string;
  /** May contain @[type:id:label] mentions of cards and quests. */
  text: string;
  revealedInSessionId?: string;
}

export interface SessionPrep {
  strongStart: string;
  scenes: string[];
  secretIds: string[];
}

export type SessionPrepMap = Record<string, SessionPrep>;

export function reviveSecrets(parsed: unknown): Secret[] {
  if (!Array.isArray(parsed)) return [];
  const out: Secret[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.text !== "string") continue;
    const revealed = typeof r.revealedInSessionId === "string" && r.revealedInSessionId ? r.revealedInSessionId : undefined;
    out.push({ id: r.id, text: r.text, revealedInSessionId: revealed });
  }
  return out;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function reviveSessionPreps(parsed: unknown): SessionPrepMap {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: SessionPrepMap = {};
  for (const [id, row] of Object.entries(parsed as Record<string, unknown>)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    out[id] = {
      strongStart: typeof r.strongStart === "string" ? r.strongStart : "",
      scenes: strings(r.scenes),
      secretIds: strings(r.secretIds),
    };
  }
  return out;
}

/**
 * The stored prep for a session, or a fresh one that starts with the previous
 * session's picked secrets that are still unrevealed.
 */
export function prepForSession(
  preps: SessionPrepMap,
  sessions: NamedNoteSession[],
  sessionId: string,
  secrets: Secret[],
): SessionPrep {
  if (preps[sessionId]) return preps[sessionId];
  const index = sessions.findIndex((s) => s.id === sessionId);
  const previous = index > 0 ? preps[sessions[index - 1].id] : undefined;
  const unrevealed = new Set(secrets.filter((s) => !s.revealedInSessionId).map((s) => s.id));
  return { strongStart: "", scenes: [], secretIds: (previous?.secretIds ?? []).filter((id) => unrevealed.has(id)) };
}

/**
 * Splits secrets for one session: `ready` are picked for it and either still
 * unrevealed or revealed in it; `available` are unrevealed and not picked.
 */
export function splitSecretsForSession(secrets: Secret[], prep: SessionPrep, sessionId: string) {
  const picked = new Set(prep.secretIds);
  const ready = secrets.filter(
    (s) => picked.has(s.id) && (!s.revealedInSessionId || s.revealedInSessionId === sessionId),
  );
  const available = secrets.filter((s) => !s.revealedInSessionId && !picked.has(s.id));
  return { ready, available };
}

export function setSecretRevealed(secrets: Secret[], id: string, sessionId: string | null): Secret[] {
  return secrets.map((s) => (s.id === id ? { ...s, revealedInSessionId: sessionId ?? undefined } : s));
}
