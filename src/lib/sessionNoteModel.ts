export type SessionNoteScope = "global" | "session";

export interface NamedNoteSession {
  id: string;
  name: string;
}

export interface SessionNote {
  id: string;
  text: string;
  category: string;
  timestamp: number;
  scope: SessionNoteScope;
  sessionId?: string;
  title?: string;
  pinned?: boolean;
  linkedNpcIds?: string[];
}

export interface NoteSessionCatalog {
  sessions: NamedNoteSession[];
  activeSessionId: string;
}
