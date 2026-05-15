import { useState, useMemo, useEffect } from "react";
import { Search, Pin, PinOff, Plus, Edit2, Check, X, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CHEAT_SHEETS, CATEGORIES } from "@/data/cheatsheets";
import type { CodexEntry } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { MentionTextarea } from "@/components/mention/MentionTextarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CheatSheetView = {
  id: string;
  title: string;
  category: string;
  content: string;
  isCustom?: boolean;
};

function splitCodexContent(content: string): { firstLine: string; rest: string } {
  if (!content.trim()) return { firstLine: "", rest: "" };
  const newlineIdx = content.indexOf("\n");
  if (newlineIdx === -1) return { firstLine: content, rest: "" };
  return { firstLine: content.slice(0, newlineIdx), rest: content.slice(newlineIdx + 1) };
}

export default function CheatSheetsPage() {
  const { pinnedSheets, togglePinSheet, codexEntries, setCodexEntries } = useApp();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Walka");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Merge built-in sheets with custom entries
  const allSheets = useMemo(() => {
    const builtIn = CHEAT_SHEETS.map((s) => ({ ...s, isCustom: false }));
    // Override built-in with custom entries that share same id
    const customIds = new Set(codexEntries.map((e) => e.id));
    const merged = builtIn.map((s) => {
      const custom = codexEntries.find((e) => e.id === s.id);
      return custom ? { ...custom, isCustom: true } : s;
    });
    // Add purely new custom entries
    const purelyNew = codexEntries.filter((e) => !builtIn.some((b) => b.id === e.id));
    return [...merged, ...purelyNew.map((e) => ({ ...e, isCustom: true }))];
  }, [codexEntries]);

  const allCategories = useMemo(() => {
    const cats = new Set(allSheets.map((s) => s.category));
    return ["Wszystkie", ...Array.from(cats).sort()];
  }, [allSheets]);

  const filtered = useMemo(() => {
    let sheets = allSheets;
    if (activeCategory !== "Wszystkie") {
      sheets = sheets.filter((s) => s.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      sheets = sheets.filter(
        (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }
    return sheets;
  }, [search, activeCategory, allSheets]);

  const pinned = filtered.filter((s) => pinnedSheets.includes(s.id));
  const unpinned = filtered.filter((s) => !pinnedSheets.includes(s.id));

  const startEdit = (sheet: typeof allSheets[0]) => {
    setEditingId(sheet.id);
    setEditTitle(sheet.title);
    setEditContent(sheet.content);
    setEditCategory(sheet.category);
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    const entry: CodexEntry = { id: editingId, title: editTitle, content: editContent, category: editCategory };
    setCodexEntries((prev) => {
      const exists = prev.find((e) => e.id === editingId);
      if (exists) return prev.map((e) => e.id === editingId ? entry : e);
      return [...prev, entry];
    });
    setEditingId(null);
  };

  const addEntry = () => {
    if (!newTitle.trim()) return;
    const entry: CodexEntry = { id: crypto.randomUUID(), title: newTitle, content: newContent, category: newCategory };
    setCodexEntries((prev) => [...prev, entry]);
    setNewTitle(""); setNewContent(""); setNewCategory("Walka");
    setAdding(false);
  };

  const deleteEntry = (id: string) => {
    setCodexEntries((prev) => prev.filter((e) => e.id !== id));
    // If it was a built-in override, just remove the custom version (built-in returns)
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-app-brand text-lg font-bold">Baza wiedzy</h1>

      <Tabs defaultValue="kodeks" className="space-y-4">
        <TabsList className="flex h-9 w-full items-stretch gap-0.5 rounded-lg bg-muted p-0.5">
          <TabsTrigger
            value="kodeks"
            className="flex-1 basis-0 min-w-0 rounded-md px-2 py-0 text-sm font-medium shadow-none data-[state=active]:shadow-sm"
          >
            Kodeks
          </TabsTrigger>
          <TabsTrigger
            value="zdolnosci"
            className="flex-1 basis-0 min-w-0 rounded-md px-2 py-0 text-sm font-medium shadow-none data-[state=active]:shadow-sm"
          >
            Zdolności
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kodeks" className="mt-0 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setAdding(true)}>
                <Plus className="h-3 w-3" /> Dodaj wpis
              </Button>
            </div>

            {adding && (
        <Card className="border-primary/30">
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs font-semibold">Nowy wpis</h3>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Tytuł" className="h-8 text-xs" />
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Kategoria" className="h-8 text-xs" />
            <MentionTextarea value={newContent} onChange={setNewContent} placeholder="Treść…" className="min-h-[100px] text-xs" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={addEntry}><Check className="h-3 w-3" />Dodaj</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Szukaj zasad…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {allCategories.map((cat) => (
          <Button key={cat} size="sm" variant={activeCategory === cat ? "default" : "outline"} className="shrink-0 text-xs" onClick={() => setActiveCategory(cat)}>
            {cat}
          </Button>
        ))}
      </div>

            {pinned.length > 0 && (
              <section className="space-y-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Pin className="mr-1 inline h-3 w-3" />Przypięte
                </label>
          <SheetAccordion sheets={pinned} pinnedSheets={pinnedSheets} onTogglePin={togglePinSheet}
            editingId={editingId} editTitle={editTitle} editContent={editContent} editCategory={editCategory}
            setEditTitle={setEditTitle} setEditContent={setEditContent} setEditCategory={setEditCategory}
            onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)}
                  deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={deleteEntry} />
              </section>
            )}

            <section className="space-y-2">
              {pinned.length > 0 && (
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Wszystkie karty
                </label>
              )}
        {unpinned.length === 0 && pinned.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Brak kart pasujących do wyszukiwania.</CardContent></Card>
        )}
        <SheetAccordion sheets={unpinned} pinnedSheets={pinnedSheets} onTogglePin={togglePinSheet}
          editingId={editingId} editTitle={editTitle} editContent={editContent} editCategory={editCategory}
          setEditTitle={setEditTitle} setEditContent={setEditContent} setEditCategory={setEditCategory}
          onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)}
                deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={deleteEntry} />
            </section>
        </TabsContent>

        <TabsContent value="zdolnosci" className="mt-0">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Sekcja zdolności — wkrótce.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const CODEX_CARD_ROW = "min-h-[4.75rem]";
const CODEX_INLINE_EXPAND_THRESHOLD = 120;

function CodexCardActions({
  sheetId,
  isPinned,
  variant,
  className,
  deleteConfirm,
  onStartEdit,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
  onTogglePin,
}: {
  sheetId: string;
  isPinned: boolean;
  variant: "footer" | "strip";
  className?: string;
  deleteConfirm: string | null;
  onStartEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        variant === "footer"
          ? "justify-end gap-2 border-t border-border/50 bg-muted/25 px-3 py-2"
          : "shrink-0 gap-0.5 self-stretch border-l border-border/50 bg-muted/10 px-1",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Akcje wpisu"
    >
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={onStartEdit} aria-label="Edytuj">
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
      {deleteConfirm === sheetId ? (
        <>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onConfirmDelete} aria-label="Potwierdź usunięcie">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onCancelDelete} aria-label="Anuluj">
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Usuń">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant={isPinned ? "secondary" : "ghost"}
        className="h-8 w-8"
        onClick={onTogglePin}
        aria-label={isPinned ? "Odepnij" : "Przypnij"}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function CodexCardPreview({
  title,
  category,
  firstLine,
  isPinned,
}: {
  title: string;
  category: string;
  firstLine: string;
  isPinned: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pl-4 pr-2">
      <div className="flex min-h-5 w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-none">{title}</span>
        <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {category}
        </span>
        {isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" aria-hidden />}
      </div>
      <p className={cn("mt-1.5 line-clamp-1 text-sm leading-5 text-muted-foreground", !firstLine && "opacity-0")}>
        {firstLine || "\u00a0"}
      </p>
    </div>
  );
}

function SheetAccordion({
  sheets, pinnedSheets, onTogglePin,
  editingId, editTitle, editContent, editCategory,
  setEditTitle, setEditContent, setEditCategory,
  onStartEdit, onSaveEdit, onCancelEdit,
  deleteConfirm, setDeleteConfirm, onDelete,
}: {
  sheets: { id: string; title: string; category: string; content: string; isCustom?: boolean }[];
  pinnedSheets: string[];
  onTogglePin: (id: string) => void;
  editingId: string | null;
  editTitle: string; editContent: string; editCategory: string;
  setEditTitle: (v: string) => void; setEditContent: (v: string) => void; setEditCategory: (v: string) => void;
  onStartEdit: (sheet: CheatSheetView) => void; onSaveEdit: () => void; onCancelEdit: () => void;
  deleteConfirm: string | null; setDeleteConfirm: (id: string | null) => void; onDelete: (id: string) => void;
}) {
  return (
    <Accordion type="multiple" className="space-y-2">
      {sheets.map((sheet) => {
        const isEditing = editingId === sheet.id;
        const { firstLine, rest } = splitCodexContent(sheet.content);
        const hasMultiLineContent = rest.trim().length > 0;
        const hasLongSingleLineContent = !hasMultiLineContent && firstLine.trim().length > CODEX_INLINE_EXPAND_THRESHOLD;
        const isExpandable = hasMultiLineContent || hasLongSingleLineContent;
        const expandedContent = hasMultiLineContent ? rest : sheet.content;
        const isPinned = pinnedSheets.includes(sheet.id);
        const actionProps = {
          sheetId: sheet.id,
          isPinned,
          deleteConfirm,
          onStartEdit: () => onStartEdit(sheet),
          onDelete: () => setDeleteConfirm(sheet.id),
          onCancelDelete: () => setDeleteConfirm(null),
          onConfirmDelete: () => onDelete(sheet.id),
          onTogglePin: () => onTogglePin(sheet.id),
        };

        return (
          <AccordionItem
            key={sheet.id}
            value={sheet.id}
            className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-border data-[state=open]:border-primary/25 border-b-0"
          >
            {isEditing ? (
              <div className="space-y-2 p-4">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-xs" placeholder="Tytuł" />
                <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-8 text-xs" placeholder="Kategoria" />
                <MentionTextarea value={editContent} onChange={setEditContent} className="min-h-[100px] text-xs" placeholder="Treść…" />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 flex-1 gap-1 text-xs" onClick={onSaveEdit}><Check className="h-3 w-3" />Zapisz</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <>
                <div className={cn("flex min-w-0 items-stretch", CODEX_CARD_ROW)}>
                  <CodexCardPreview title={sheet.title} category={sheet.category} firstLine={firstLine} isPinned={isPinned} />
                  <CodexCardActions variant="strip" {...actionProps} className="hidden md:flex" />
                  {isExpandable && (
                    <AccordionTrigger
                      className="flex h-full w-10 shrink-0 flex-none items-center justify-center self-stretch border-l border-border/50 bg-muted/10 py-0 hover:bg-muted/20 hover:no-underline [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
                      aria-label="Rozwiń wpis"
                    >
                      <span className="sr-only">Rozwiń wpis</span>
                    </AccordionTrigger>
                  )}
                </div>
                {isExpandable && (
                  <AccordionContent className="border-t border-border/40 bg-muted/10 pb-0">
                    <div className="px-4 py-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {expandedContent}
                    </div>
                  </AccordionContent>
                )}
                <CodexCardActions variant="footer" {...actionProps} className="md:hidden" />
              </>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}