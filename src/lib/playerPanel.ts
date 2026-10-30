import { useLocalStorage } from "@/hooks/useLocalStorage";
import { EMPTY_NOTE_SESSION_CATALOG } from "@/lib/sessionNotesMigration";
import type { NoteSessionCatalog } from "@/lib/sessionNoteModel";

export const PLAYER_VISIBILITY_KEY = "rpg_player_visibility";
export const PLAYER_NOTES_KEY = "rpg_player_notes";

export type SectionAccess = "hidden" | "view" | "edit";

/** What the GM lets players do in the interactive panel. Sections default to read-only. */
export type PlayerVisibility = {
  panel: boolean;
  dice: boolean;
  notes: boolean;
  /** Hero card the panel shows; empty lets the player pick. */
  heroId: string;
  sections: Record<string, SectionAccess>;
};

export const DEFAULT_PLAYER_VISIBILITY: PlayerVisibility = { panel: false, dice: true, notes: true, heroId: "", sections: {} };

export type PlayerNote = { text: string; sharedWithGm: boolean };
export type PlayerNotes = Record<string, PlayerNote>;

export const usePlayerVisibility = () =>
  useLocalStorage<PlayerVisibility>(PLAYER_VISIBILITY_KEY, DEFAULT_PLAYER_VISIBILITY, {
    revive: (p) => ({ ...DEFAULT_PLAYER_VISIBILITY, ...(p && typeof p === "object" ? (p as Partial<PlayerVisibility>) : {}) }),
  });

export const usePlayerNotes = () => useLocalStorage<PlayerNotes>(PLAYER_NOTES_KEY, {});

export const useNoteSessions = () =>
  useLocalStorage<NoteSessionCatalog>("rpg_notes_session_catalog", EMPTY_NOTE_SESSION_CATALOG)[0];
