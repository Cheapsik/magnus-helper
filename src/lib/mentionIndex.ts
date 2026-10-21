import { parseMentionTokens } from "@/components/mention/mentionUtils";
import type { Card, CardKind } from "@/lib/cardSchema";
import type { NamedNoteSession, SessionNote } from "@/lib/sessionNoteModel";

export type MentionSourceKind = "note" | "quest" | "codex" | "card";

export const MENTION_SOURCE_LABELS: Record<MentionSourceKind, string> = {
  note: "Notatka",
  quest: "Wątek",
  codex: "Kodeks",
  card: "Karta",
};

export interface MentionHit {
  sourceKind: MentionSourceKind;
  sourceId: string;
  sourceTitle: string;
  /** Set for card sources so the caller can open the right drawer. */
  cardKind?: CardKind;
  /** Session name for session-scoped notes, "Sesja N" for quests. */
  session?: string;
  timestamp?: number;
  snippet: string;
}

/** The shapes are structural so pages with their own local types can pass data straight in. */
export interface MentionSources {
  notes?: SessionNote[];
  noteSessions?: NamedNoteSession[];
  quests?: { id: string; title: string; notes: string; linkedNpcs?: string[]; sessionNumber?: number; updatedAt?: string }[];
  codex?: { id: string; title: string; content: string }[];
  cards?: Pick<Card, "id" | "kind" | "name" | "notes">[];
}

const SNIPPET_RADIUS = 50;

/**
 * Snippet around the first mention of `cardId` with every mention token shown as its label.
 * Returns null when the text has no such mention, unless `linked` — an explicit link with no
 * inline @mention still counts, and its snippet is the start of the text.
 */
export function mentionSnippet(text: string, cardId: string, linked = false): string | null {
  let plain = "";
  let at = -1;
  let cursor = 0;
  for (const token of parseMentionTokens(text)) {
    plain += text.slice(cursor, token.start);
    if (at === -1 && token.id === cardId) at = plain.length;
    plain += token.label;
    cursor = token.end;
  }
  plain += text.slice(cursor);
  if (at === -1) {
    if (!linked) return null;
    at = 0;
  }
  const from = Math.max(0, at - SNIPPET_RADIUS);
  const to = Math.min(plain.length, at + SNIPPET_RADIUS);
  const body = plain.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${body}${to < plain.length ? "…" : ""}`;
}

function parseTime(iso: string | undefined): number | undefined {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? undefined : t;
}

/** Every place that mentions or links the card, newest first; undated sources go last. */
export function findMentions(cardId: string, sources: MentionSources): MentionHit[] {
  const hits: MentionHit[] = [];
  const sessionName = new Map((sources.noteSessions ?? []).map((s) => [s.id, s.name]));

  for (const note of sources.notes ?? []) {
    const snippet = mentionSnippet(note.text, cardId, note.linkedNpcIds?.includes(cardId) ?? false);
    if (snippet === null) continue;
    hits.push({
      sourceKind: "note",
      sourceId: note.id,
      sourceTitle: note.title?.trim() || "Notatka bez tytułu",
      session: note.scope === "session" && note.sessionId ? sessionName.get(note.sessionId) : undefined,
      timestamp: note.timestamp,
      snippet,
    });
  }

  for (const quest of sources.quests ?? []) {
    const snippet = mentionSnippet(quest.notes ?? "", cardId, quest.linkedNpcs?.includes(cardId) ?? false);
    if (snippet === null) continue;
    hits.push({
      sourceKind: "quest",
      sourceId: quest.id,
      sourceTitle: quest.title?.trim() || "Wątek bez tytułu",
      session: quest.sessionNumber ? `Sesja ${quest.sessionNumber}` : undefined,
      timestamp: parseTime(quest.updatedAt),
      snippet,
    });
  }

  for (const entry of sources.codex ?? []) {
    const snippet = mentionSnippet(entry.content ?? "", cardId);
    if (snippet === null) continue;
    hits.push({ sourceKind: "codex", sourceId: entry.id, sourceTitle: entry.title || "Wpis kodeksu", snippet });
  }

  for (const card of sources.cards ?? []) {
    if (card.id === cardId) continue;
    const snippet = mentionSnippet(card.notes ?? "", cardId);
    if (snippet === null) continue;
    hits.push({ sourceKind: "card", sourceId: card.id, cardKind: card.kind, sourceTitle: card.name || "Bez nazwy", snippet });
  }

  return hits.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}
