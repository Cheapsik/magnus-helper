import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  StickyNote,
  Plus,
  X,
  MapPin,
  Users,
  Target,
  AlertCircle,
  Search,
  Pin,
  PinOff,
  ChevronDown,
  Settings2,
  Pencil,
  CalendarPlus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { SessionNote, NamedNoteSession } from "@/context/AppContext";
import { getNpcDisplayName, NpcQuickPreview } from "@/components/character-sheet";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  categoryLabel,
  reviveNoteCategories,
  reviveNoteTemplates,
  DEFAULT_NOTE_CATEGORY_IDS,
  type SessionNoteTemplate,
} from "@/lib/sessionNotesMigration";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const NOTE_CATEGORY_ICONS: Record<string, typeof StickyNote> = {
  general: StickyNote,
  npc: Users,
  location: MapPin,
  objective: Target,
  clue: AlertCircle,
};

const DEFAULT_NOTE_TEMPLATES: SessionNoteTemplate[] = [
  { id: "tmpl-scena", title: "Scena", body: "Miejsce:\nNPC:\nCo się dzieje:\n" },
  { id: "tmpl-npc", title: "NPC — szybki zapis", body: "Imię:\nProfesja / rola:\nNotatka:\n" },
];

type ScopeFilter = "all" | "global" | "session";

type EditorDraft = {
  title: string;
  text: string;
  category: string;
  scope: SessionNote["scope"];
  sessionId: string;
  pinned: boolean;
  linkedNpcIds: string[];
};

function buildEmptyDraft(activeSessionId: string): EditorDraft {
  return {
    title: "",
    text: "",
    category: "general",
    scope: "session",
    sessionId: activeSessionId,
    pinned: false,
    linkedNpcIds: [],
  };
}

function formatNoteTime(ts: number): string {
  return new Date(ts).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

function sortNotes(notes: SessionNote[]): SessionNote[] {
  return [...notes].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.timestamp - a.timestamp;
  });
}

function getCategoryIcon(cat: string) {
  const key = cat.toLowerCase();
  return NOTE_CATEGORY_ICONS[key] ?? StickyNote;
}

function SessionEditRow({
  session,
  noteCount,
  canDelete,
  onRename,
  onRequestDelete,
}: {
  session: NamedNoteSession;
  noteCount: number;
  canDelete: boolean;
  onRename: (id: string, name: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const [name, setName] = useState(session.name);
  useEffect(() => {
    setName(session.name);
  }, [session.id, session.name]);

  return (
    <li className="space-y-1.5 rounded-md border border-border/50 bg-card/40 p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 flex-1 text-sm" placeholder="Nazwa sesji" />
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            disabled={!name.trim() || name.trim() === session.name}
            onClick={() => onRename(session.id, name)}
          >
            Zapisz nazwę
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs text-destructive hover:text-destructive"
            disabled={!canDelete}
            onClick={() => onRequestDelete(session.id)}
          >
            Usuń
          </Button>
        </div>
      </div>
      {noteCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {noteCount} {noteCount === 1 ? "notatka przypisana" : "notatek przypisanych"} do tej sesji.
        </p>
      )}
    </li>
  );
}

export default function SessionNotesPage() {
  const { sessionNotes, setSessionNotes, noteSessionCatalog, setNoteSessionCatalog, savedNpcs } = useApp();
  const [noteCategories, setNoteCategories] = useLocalStorage<string[]>("rpg_notes_categories", [...DEFAULT_NOTE_CATEGORY_IDS], {
    revive: reviveNoteCategories,
  });
  const [templates, setTemplates] = useLocalStorage<SessionNoteTemplate[]>("rpg_notes_templates", DEFAULT_NOTE_TEMPLATES, {
    revive: reviveNoteTemplates,
  });

  const { sessions, activeSessionId } = noteSessionCatalog;

  const sessionNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions) m.set(s.id, s.name);
    return m;
  }, [sessions]);

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<EditorDraft>(() => buildEmptyDraft(noteSessionCatalog.activeSessionId));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionsManageOpen, setSessionsManageOpen] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [emptyDeleteSessionId, setEmptyDeleteSessionId] = useState<string | null>(null);
  const [notesDeleteSessionId, setNotesDeleteSessionId] = useState<string | null>(null);
  const [reassignToSessionId, setReassignToSessionId] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [openNpcId, setOpenNpcId] = useState<string | null>(null);
  const [npcPickerOpen, setNpcPickerOpen] = useState(false);
  const [npcQuery, setNpcQuery] = useState("");

  const [lastUsedTemplateIds, setLastUsedTemplateIds] = useState<string[]>([]);

  const setActiveSessionId = useCallback((id: string) => {
    setNoteSessionCatalog((c) => {
      if (!c.sessions.some((s) => s.id === id)) return c;
      return { ...c, activeSessionId: id };
    });
  }, [setNoteSessionCatalog]);

  const categoryOptions = useMemo(() => {
    const set = new Set(noteCategories);
    for (const n of sessionNotes) set.add(n.category);
    return [...set];
  }, [noteCategories, sessionNotes]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = sessionNotes;

    if (scopeFilter === "global") list = list.filter((n) => n.scope === "global");
    else if (scopeFilter === "session") list = list.filter((n) => n.scope === "session" && n.sessionId === activeSessionId);

    if (categoryFilter !== "all") list = list.filter((n) => n.category === categoryFilter);

    if (q) {
      list = list.filter((n) => {
        const inText = n.text.toLowerCase().includes(q);
        const inTitle = (n.title ?? "").toLowerCase().includes(q);
        return inText || inTitle;
      });
    }

    return sortNotes(list);
  }, [sessionNotes, scopeFilter, categoryFilter, searchQuery, activeSessionId]);

  const counts = useMemo(() => {
    const global = sessionNotes.filter((n) => n.scope === "global").length;
    const session = sessionNotes.filter((n) => n.scope === "session" && n.sessionId === activeSessionId).length;
    return { all: sessionNotes.length, global, session };
  }, [sessionNotes, activeSessionId]);

  const openNpc = openNpcId ? savedNpcs.find((n) => n.id === openNpcId) : null;

  const applyTemplate = useCallback((t: SessionNoteTemplate) => {
    setEditorDraft((d) => ({ ...d, title: t.title, text: t.body }));
    setLastUsedTemplateIds((prev) => {
      const next = [t.id, ...prev.filter((id) => id !== t.id)];
      return next.slice(0, 3);
    });
  }, []);

  const openNewNote = () => {
    setEditingNoteId(null);
    setEditorDraft(buildEmptyDraft(activeSessionId));
    setEditorOpen(true);
  };

  const openEditNote = (note: SessionNote) => {
    setEditingNoteId(note.id);
    setEditorDraft({
      title: note.title ?? "",
      text: note.text,
      category: note.category,
      scope: note.scope,
      sessionId: note.scope === "session" && note.sessionId ? note.sessionId : activeSessionId,
      pinned: Boolean(note.pinned),
      linkedNpcIds: note.linkedNpcIds ? [...note.linkedNpcIds] : [],
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNoteId(null);
    setNpcPickerOpen(false);
    setNpcQuery("");
  };

  const saveFromEditor = () => {
    const text = editorDraft.text.trim();
    if (!text) return;
    const sid = editorDraft.scope === "session" ? editorDraft.sessionId : undefined;
    if (editorDraft.scope === "session" && (!sid || !sessions.some((s) => s.id === sid))) return;

    const base: Omit<SessionNote, "id" | "timestamp"> = {
      text,
      category: editorDraft.category,
      scope: editorDraft.scope,
      sessionId: editorDraft.scope === "session" ? sid : undefined,
      title: editorDraft.title.trim() || undefined,
      pinned: editorDraft.pinned,
      linkedNpcIds: editorDraft.linkedNpcIds.length ? [...editorDraft.linkedNpcIds] : undefined,
    };

    if (editingNoteId) {
      setSessionNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, ...base, timestamp: Date.now() } : n)));
    } else {
      setSessionNotes((prev) => [{ id: crypto.randomUUID(), ...base, timestamp: Date.now() }, ...prev]);
    }
    closeEditor();
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    setSessionNotes((prev) => prev.filter((n) => n.id !== deleteTargetId));
    setDeleteTargetId(null);
    if (deleteTargetId === editingNoteId) closeEditor();
  };

  const togglePin = (id: string) => {
    setSessionNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  };

  const handleTodaySession = () => {
    const latest = [...sessionNotes]
      .filter((n) => n.scope === "session" && n.sessionId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latest?.sessionId) setActiveSessionId(latest.sessionId);
    setScopeFilter("session");
  };

  const addCustomCategory = () => {
    const id = newCategoryId.trim();
    if (!id) return;
    const low = id.toLowerCase();
    if (noteCategories.some((c) => c.toLowerCase() === low)) return;
    setNoteCategories((prev) => [...prev, id]);
    setNewCategoryId("");
  };

  const removeCategory = (id: string) => {
    if ((DEFAULT_NOTE_CATEGORY_IDS as readonly string[]).includes(id.toLowerCase())) return;
    setNoteCategories((prev) => prev.filter((c) => c !== id));
  };

  const addTemplate = () => {
    const title = templateTitle.trim();
    const body = templateBody.trim();
    if (!title && !body) return;
    setTemplates((prev) => [...prev, { id: crypto.randomUUID(), title: title || "Bez tytułu", body }]);
    setTemplateTitle("");
    setTemplateBody("");
  };

  const removeTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const submitNewSession = () => {
    const name = newSessionName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setNoteSessionCatalog((c) => ({
      sessions: [...c.sessions, { id, name }],
      activeSessionId: id,
    }));
    setNewSessionName("");
    setAddSessionOpen(false);
  };

  const renameSession = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setNoteSessionCatalog((c) => ({
      ...c,
      sessions: c.sessions.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
    }));
  };

  const countNotesForSession = useCallback(
    (sessionId: string) => sessionNotes.filter((n) => n.scope === "session" && n.sessionId === sessionId).length,
    [sessionNotes],
  );

  /** Usuwa wpis sesji z katalogu (notatki trzeba wcześniej przenieść / zmienić). */
  const removeSessionHard = useCallback((id: string) => {
    setNoteSessionCatalog((c) => {
      const nextSessions = c.sessions.filter((s) => s.id !== id);
      if (nextSessions.length === 0) return c;
      let activeSessionId = c.activeSessionId;
      if (activeSessionId === id) activeSessionId = nextSessions[0].id;
      return { sessions: nextSessions, activeSessionId };
    });
  }, [setNoteSessionCatalog]);

  const requestDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const n = countNotesForSession(id);
    if (n === 0) setEmptyDeleteSessionId(id);
    else {
      setNotesDeleteSessionId(id);
      const other = sessions.find((s) => s.id !== id);
      setReassignToSessionId(other?.id ?? "");
    }
  };

  const confirmDeleteEmptySession = () => {
    if (!emptyDeleteSessionId) return;
    removeSessionHard(emptyDeleteSessionId);
    setEmptyDeleteSessionId(null);
  };

  const reassignNotesAndDeleteSession = () => {
    if (!notesDeleteSessionId || !reassignToSessionId || notesDeleteSessionId === reassignToSessionId) return;
    setSessionNotes((prev) =>
      prev.map((n) =>
        n.scope === "session" && n.sessionId === notesDeleteSessionId ? { ...n, sessionId: reassignToSessionId } : n,
      ),
    );
    removeSessionHard(notesDeleteSessionId);
    setNotesDeleteSessionId(null);
  };

  const globalizeNotesAndDeleteSession = () => {
    if (!notesDeleteSessionId) return;
    setSessionNotes((prev) =>
      prev.map((n) =>
        n.scope === "session" && n.sessionId === notesDeleteSessionId ? { ...n, scope: "global", sessionId: undefined } : n,
      ),
    );
    removeSessionHard(notesDeleteSessionId);
    setNotesDeleteSessionId(null);
  };

  const addNpcFromPicker = (npcId: string) => {
    setEditorDraft((d) => ({ ...d, linkedNpcIds: [...d.linkedNpcIds, npcId] }));
    setNpcQuery("");
    setNpcPickerOpen(false);
  };

  const filteredNpcsForPicker = useMemo(() => {
    const ids = editorDraft.linkedNpcIds;
    const q = npcQuery.trim().toLowerCase();
    return savedNpcs.filter(
      (n) => !ids.includes(n.id) && (!q || getNpcDisplayName(n).toLowerCase().includes(q)),
    );
  }, [savedNpcs, npcQuery, editorDraft.linkedNpcIds]);

  const lastUsedTemplates = useMemo(() => {
    return lastUsedTemplateIds.map((id) => templates.find((t) => t.id === id)).filter(Boolean) as SessionNoteTemplate[];
  }, [lastUsedTemplateIds, templates]);

  const sessionLabelShort = (sessionId: string | undefined) => {
    if (!sessionId) return "—";
    return sessionNameById.get(sessionId) ?? "Sesja";
  };

  return (
    <div className="space-y-3 animate-fade-in pb-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold tracking-tight">Notatki</h1>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSettingsOpen(true)} aria-label="Szablony, kategorie i sesje">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={openNewNote}>
            <Plus className="h-3.5 w-3.5" />
            Dodaj
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-card/50 px-2.5 py-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] text-muted-foreground">Aktywna sesja</Label>
          <div className="flex gap-1.5">
            <Select value={activeSessionId} onValueChange={setActiveSessionId}>
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                <SelectValue placeholder="Wybierz sesję" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Nowa sesja"
              onClick={() => setAddSessionOpen(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Zmień nazwę lub usuń sesję"
              onClick={() => setSessionsManageOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <button type="button" className="self-start text-left text-[11px] text-primary hover:underline" onClick={handleTodaySession}>
          Dziś ta sesja (filtr + ostatnia not. sesyjna)
        </button>
        <div className="flex gap-1">
          {(
            [
              ["all", `Wszystkie (${counts.all})`],
              ["global", `Globalne (${counts.global})`],
              ["session", `Ta sesja (${counts.session})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={scopeFilter === key ? "secondary" : "ghost"}
              className={cn("h-7 flex-1 px-1.5 text-[11px] font-normal", scopeFilter === key && "bg-secondary ring-1 ring-border")}
              onClick={() => setScopeFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Szukaj…" className="h-8 pl-8 text-xs" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-full sm:w-[200px] text-xs">
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y divide-border/60 rounded-md border border-border/60 bg-card/30">
        {filteredSorted.map((note) => {
          const Icon = getCategoryIcon(note.category);
          return (
            <div key={note.id} className={cn("flex gap-2 px-2 py-2.5", note.pinned && "bg-primary/[0.04]")}>
              <button
                type="button"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => togglePin(note.id)}
                aria-label={note.pinned ? "Odepnij" : "Przypnij"}
              >
                {note.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : <PinOff className="h-3.5 w-3.5 opacity-60" />}
              </button>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEditNote(note)}>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{formatNoteTime(note.timestamp)}</span>
                  <span>·</span>
                  <span>{categoryLabel(note.category)}</span>
                  <span>·</span>
                  <span>{note.scope === "global" ? "Globalna" : sessionLabelShort(note.sessionId)}</span>
                </div>
                {note.title && <div className="mt-0.5 text-sm font-medium leading-snug">{note.title}</div>}
                <p className={cn("mt-0.5 text-xs text-muted-foreground leading-relaxed", note.title ? "line-clamp-2" : "line-clamp-3")}>
                  {note.text || <span className="italic">Pusta notatka</span>}
                </p>
                {note.linkedNpcIds && note.linkedNpcIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {note.linkedNpcIds.map((id) => {
                      const npc = savedNpcs.find((n) => n.id === id);
                      return (
                        <span
                          key={id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer rounded bg-muted/80 px-1.5 py-0 text-[10px] text-foreground/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenNpcId(id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenNpcId(id);
                            }
                          }}
                        >
                          {npc ? getNpcDisplayName(npc) : "NPC"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditNote(note)} aria-label="Edytuj">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive" onClick={() => setDeleteTargetId(note.id)} aria-label="Usuń">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {filteredSorted.length === 0 && <div className="px-3 py-8 text-center text-xs text-muted-foreground">Brak notatek</div>}
      </div>

      <Dialog open={editorOpen} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="max-h-[min(90vh,640px)] max-w-md gap-0 overflow-y-auto p-0 sm:rounded-lg">
          <DialogHeader className="border-b border-border/60 px-4 py-3 text-left">
            <DialogTitle className="text-base">{editingNoteId ? "Edytuj notatkę" : "Nowa notatka"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-3">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
                    Wstaw szablon
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">
                  {lastUsedTemplates.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs">Ostatnio</DropdownMenuLabel>
                      {lastUsedTemplates.map((t) => (
                        <DropdownMenuItem key={`lu-${t.id}`} className="text-xs" onClick={() => applyTemplate(t)}>
                          {t.title || "Bez tytułu"}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuLabel className="text-xs">Szablony</DropdownMenuLabel>
                  {templates.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Dodaj w ustawieniach</div>
                  ) : (
                    templates.map((t) => (
                      <DropdownMenuItem key={t.id} className="text-xs" onClick={() => applyTemplate(t)}>
                        {t.title || "Bez tytułu"}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tytuł (opcjonalnie)</label>
              <Input value={editorDraft.title} onChange={(e) => setEditorDraft((d) => ({ ...d, title: e.target.value }))} className="h-9 text-sm" placeholder="Krótki nagłówek" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Treść *</label>
              <Textarea
                value={editorDraft.text}
                onChange={(e) => setEditorDraft((d) => ({ ...d, text: e.target.value }))}
                className="min-h-[100px] resize-y text-sm"
                placeholder="Treść…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) saveFromEditor();
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategoria</label>
              <Select value={editorDraft.category} onValueChange={(v) => setEditorDraft((d) => ({ ...d, category: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ed-global" className="text-xs font-normal leading-none">
                    Globalna
                  </Label>
                  <Switch id="ed-global" checked={editorDraft.scope === "global"} onCheckedChange={(v) => setEditorDraft((d) => ({ ...d, scope: v ? "global" : "session" }))} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ed-pin" className="text-xs font-normal leading-none">
                    Przypnij
                  </Label>
                  <Switch id="ed-pin" checked={editorDraft.pinned} onCheckedChange={(v) => setEditorDraft((d) => ({ ...d, pinned: v }))} />
                </div>
              </div>
              {editorDraft.scope === "session" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ed-session" className="text-xs text-muted-foreground">
                    Sesja
                  </Label>
                  <Select value={editorDraft.sessionId} onValueChange={(id) => setEditorDraft((d) => ({ ...d, sessionId: id }))}>
                    <SelectTrigger id="ed-session" className="h-9 w-full text-sm">
                      <SelectValue placeholder="Wybierz sesję" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setNpcPickerOpen(true)}>
                Powiąż NPC{editorDraft.linkedNpcIds.length > 0 ? ` · ${editorDraft.linkedNpcIds.length}` : ""}
              </Button>
              {editorDraft.linkedNpcIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {editorDraft.linkedNpcIds.map((id) => {
                    const npc = savedNpcs.find((n) => n.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px]">
                        <button type="button" className="truncate max-w-[120px]" onClick={() => setOpenNpcId(id)}>
                          {npc ? getNpcDisplayName(npc) : id.slice(0, 6)}
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Usuń"
                          onClick={() => setEditorDraft((d) => ({ ...d, linkedNpcIds: d.linkedNpcIds.filter((x) => x !== id) }))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-border/60 px-4 py-3 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={closeEditor}>
              Anuluj
            </Button>
            <Button type="button" size="sm" className="h-9" onClick={saveFromEditor}>
              {editingNoteId ? "Zapisz" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addSessionOpen}
        onOpenChange={(o) => {
          setAddSessionOpen(o);
          if (!o) setNewSessionName("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nowa sesja</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="new-session-name" className="text-xs text-muted-foreground">
              Nazwa sesji
            </Label>
            <Input
              id="new-session-name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="np. Sesja 12 — Zjazd w Ubersreiku"
              className="h-9 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewSession();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => setAddSessionOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" size="sm" className="h-9" onClick={submitNewSession}>
              Dodaj i ustaw jako aktywną
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionsManageOpen} onOpenChange={setSessionsManageOpen}>
        <DialogContent className="max-h-[min(85vh,520px)] max-w-md gap-0 overflow-y-auto p-0 sm:rounded-lg">
          <DialogHeader className="border-b border-border/60 px-4 py-3 text-left">
            <DialogTitle className="text-base">Sesje</DialogTitle>
            <DialogDescription className="text-left text-xs">
              Zmiana nazwy: edytuj pole i kliknij „Zapisz nazwę”. Usunięcie pustej sesji od razu; przy notatkach — przeniesienie lub ustawienie ich jako globalnych.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[min(52vh,360px)] space-y-2 overflow-y-auto px-4 py-3">
            {sessions.map((s) => (
              <SessionEditRow
                key={s.id}
                session={s}
                noteCount={countNotesForSession(s.id)}
                canDelete={sessions.length > 1}
                onRename={renameSession}
                onRequestDelete={requestDeleteSession}
              />
            ))}
          </ul>
          <DialogFooter className="flex-col gap-2 border-t border-border/60 px-4 py-3 sm:flex-col">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-full gap-1.5 text-xs"
              onClick={() => {
                setSessionsManageOpen(false);
                setAddSessionOpen(true);
              }}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Dodaj nową sesję…
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-9 w-full text-xs" onClick={() => setSessionsManageOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={emptyDeleteSessionId !== null} onOpenChange={(o) => !o && setEmptyDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć sesję?</AlertDialogTitle>
            <AlertDialogDescription>
              {emptyDeleteSessionId
                ? `Sesja „${sessionNameById.get(emptyDeleteSessionId) ?? "bez nazwy"}” zostanie usunięta. Nie ma do niej przypisanych notatek.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeleteEmptySession}>
              Usuń sesję
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={notesDeleteSessionId !== null}
        onOpenChange={(o) => {
          if (!o) setNotesDeleteSessionId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Sesja ma notatki</DialogTitle>
            <DialogDescription className="text-left text-sm">
              {notesDeleteSessionId
                ? `Sesja „${sessionNameById.get(notesDeleteSessionId) ?? ""}”: ${countNotesForSession(notesDeleteSessionId)} notatek. Wybierz inną sesję docelową albo zmień je na globalne.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs text-muted-foreground">Przenieś notatki do sesji</Label>
            <Select value={reassignToSessionId} onValueChange={setReassignToSessionId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Wybierz sesję" />
              </SelectTrigger>
              <SelectContent>
                {sessions
                  .filter((s) => s.id !== notesDeleteSessionId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              size="sm"
              className="h-9 w-full"
              disabled={!reassignToSessionId || reassignToSessionId === notesDeleteSessionId}
              onClick={reassignNotesAndDeleteSession}
            >
              Przenieś notatki i usuń sesję
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-9 w-full" onClick={globalizeNotesAndDeleteSession}>
              Ustaw notatki jako globalne i usuń sesję
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-9 w-full" onClick={() => setNotesDeleteSessionId(null)}>
              Anuluj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[min(90vh,620px)] max-w-md gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b border-border/60 px-4 py-3 text-left">
            <DialogTitle className="text-base">Ustawienia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-4 py-3">
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Sesje</h3>
              <p className="text-[11px] text-muted-foreground">Wybór aktywnej sesji jest na górze strony. Zmiana nazwy i usuwanie — ikona ołówka lub przycisk poniżej.</p>
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 w-full justify-start gap-2 text-xs"
                  onClick={() => {
                    setSettingsOpen(false);
                    setSessionsManageOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Zarządzaj sesjami (nazwa, usuń)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-start gap-2 text-xs"
                  onClick={() => {
                    setSettingsOpen(false);
                    setAddSessionOpen(true);
                  }}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Nowa sesja…
                </Button>
              </div>
            </section>

            <section className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-xs font-medium text-muted-foreground">Szablony</h3>
              <Input value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Tytuł" className="h-8 text-xs" />
              <Textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} placeholder="Treść" rows={2} className="min-h-[52px] text-xs" />
              <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={addTemplate}>
                Dodaj szablon
              </Button>
              {templates.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-border/60 p-1">
                  {templates.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                      <span className="truncate">{t.title}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeTemplate(t.id)} aria-label="Usuń">
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-xs font-medium text-muted-foreground">Kategorie</h3>
              <p className="text-[11px] text-muted-foreground">Wielkość liter jest zachowana.</p>
              <div className="flex gap-2">
                <Input value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} placeholder="Nowa kategoria" className="h-8 text-xs" />
                <Button type="button" size="sm" className="h-8 shrink-0 text-xs" onClick={addCustomCategory}>
                  Dodaj
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {noteCategories.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px]">
                    {categoryLabel(id)}
                    {!(DEFAULT_NOTE_CATEGORY_IDS as readonly string[]).includes(id.toLowerCase()) && (
                      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => removeCategory(id)} aria-label={`Usuń ${id}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </section>
          </div>
          <DialogFooter className="border-t border-border/60 px-4 py-3">
            <Button type="button" size="sm" variant="secondary" className="h-8" onClick={() => setSettingsOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć notatkę?</AlertDialogTitle>
            <AlertDialogDescription>Tej operacji nie cofniesz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={npcPickerOpen} onOpenChange={setNpcPickerOpen}>
        <SheetContent side="bottom" className="h-[min(70vh,420px)] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Wybierz NPC</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-2">
            <Input value={npcQuery} onChange={(e) => setNpcQuery(e.target.value)} placeholder="Szukaj…" className="h-9 text-sm" />
            {filteredNpcsForPicker.length === 0 ? (
              <p className="text-xs text-muted-foreground">{savedNpcs.length === 0 ? "Brak NPC w bazie." : "Brak wyników."}</p>
            ) : (
              <ul className="space-y-1">
                {filteredNpcsForPicker.map((npc) => (
                  <li key={npc.id}>
                    <Button type="button" variant="ghost" className="h-9 w-full justify-start px-2 text-sm font-normal" onClick={() => addNpcFromPicker(npc.id)}>
                      {getNpcDisplayName(npc)}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openNpcId} onOpenChange={(v) => !v && setOpenNpcId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{openNpc ? getNpcDisplayName(openNpc) : "NPC"}</SheetTitle>
          </SheetHeader>
          {openNpc ? (
            <>
              <NpcQuickPreview npc={openNpc} />
              <Button type="button" variant="outline" size="sm" className="mt-4 w-full h-9 text-xs" asChild>
                <Link to="/npcs">Otwórz w NPC</Link>
              </Button>
            </>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">NPC nie znaleziony</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
