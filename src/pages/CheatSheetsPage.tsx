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

type CheatSheetView = {
  id: string;
  title: string;
  category: string;
  content: string;
  isCustom?: boolean;
};

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
      <div className="flex items-center justify-between">
        <h1 className="font-app-brand text-lg font-bold">Kodeks</h1>
        <Button size="sm" className="text-xs gap-1 h-7" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Dodaj wpis
        </Button>
      </div>

      {/* Add form */}
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

      {/* Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {allCategories.map((cat) => (
          <Button key={cat} size="sm" variant={activeCategory === cat ? "default" : "outline"} className="text-xs shrink-0" onClick={() => setActiveCategory(cat)}>
            {cat}
          </Button>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <section>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            <Pin className="h-3 w-3 inline mr-1" />Przypięte
          </label>
          <SheetAccordion sheets={pinned} pinnedSheets={pinnedSheets} onTogglePin={togglePinSheet}
            editingId={editingId} editTitle={editTitle} editContent={editContent} editCategory={editCategory}
            setEditTitle={setEditTitle} setEditContent={setEditContent} setEditCategory={setEditCategory}
            onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={() => setEditingId(null)}
            deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} onDelete={deleteEntry} />
        </section>
      )}

      {/* All */}
      <section>
        {pinned.length > 0 && (
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Wszystkie karty</label>
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
    <Accordion type="multiple" className="space-y-1.5">
      {sheets.map((sheet) => {
        const isEditing = editingId === sheet.id;
        return (
          <AccordionItem key={sheet.id} value={sheet.id} className="border rounded-lg bg-card px-3">
            {isEditing ? (
              <div className="py-3 space-y-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-xs" placeholder="Tytuł" />
                <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-8 text-xs" placeholder="Kategoria" />
                <MentionTextarea value={editContent} onChange={setEditContent} className="min-h-[120px] text-xs" placeholder="Treść…" />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={onSaveEdit}><Check className="h-3 w-3" />Zapisz</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelEdit}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <>
                <AccordionTrigger className="flex-1 text-sm font-medium py-3 hover:no-underline w-full">
                  <div className="flex items-center gap-2 text-left">
                    <span>{sheet.title}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{sheet.category}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3 whitespace-pre-line leading-relaxed">
                  {sheet.content}
                </AccordionContent>
                {/* Action buttons at the bottom for better mobile accessibility */}
                <div className="flex items-center justify-end gap-1 pb-3 pt-1 border-t border-border/30 mt-2">
                  <button onClick={(e) => { e.stopPropagation(); onStartEdit(sheet); }}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Edytuj">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {deleteConfirm === sheet.id ? (
                    <div className="flex gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); onDelete(sheet.id); }}
                        className="p-2 text-destructive hover:text-destructive/80 transition-colors"
                        aria-label="Potwierdź usunięcie">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Anuluj">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sheet.id); }}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Usuń">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onTogglePin(sheet.id); }}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={pinnedSheets.includes(sheet.id) ? "Odepnij" : "Przypnij"}>
                    {pinnedSheets.includes(sheet.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}