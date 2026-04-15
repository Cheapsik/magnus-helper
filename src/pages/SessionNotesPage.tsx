import { useState } from "react";
import { StickyNote, Plus, X, MapPin, Users, Target, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const NOTE_CATEGORIES = [
  { id: "general", label: "Ogólne", icon: StickyNote },
  { id: "npc", label: "NPC", icon: Users },
  { id: "location", label: "Lokacje", icon: MapPin },
  { id: "objective", label: "Cele", icon: Target },
  { id: "clue", label: "Tropy", icon: AlertCircle },
];

export default function SessionNotesPage() {
  const { sessionNotes, setSessionNotes } = useApp();
  const [activeCategory, setActiveCategory] = useState("all");
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const filtered = activeCategory === "all" ? sessionNotes : sessionNotes.filter((n) => n.category === activeCategory);

  const addNote = () => {
    const text = newText.trim();
    if (!text) return;
    setSessionNotes((prev) => [{ id: crypto.randomUUID(), text, category: newCategory, timestamp: Date.now() }, ...prev]);
    setNewText("");
  };

  const removeNote = (id: string) => setSessionNotes((prev) => prev.filter((n) => n.id !== id));

  const startEdit = (note: { id: string; text: string }) => { setEditingId(note.id); setEditText(note.text); };

  const saveEdit = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    setSessionNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    setEditingId(null);
  };

  const getCategoryIcon = (cat: string) => NOTE_CATEGORIES.find((c) => c.id === cat)?.icon ?? StickyNote;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Notatki sesyjne</h1>

      {/* Add note - textarea */}
      <section>
        <div className="space-y-2 mb-2">
          <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Nowa notatka…" rows={3}
            className="text-sm min-h-[64px]" onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote(); }} />
          <div className="flex gap-2">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="h-9 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {NOTE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <Button size="sm" onClick={addNote} className="gap-1 ml-auto"><Plus className="h-3.5 w-3.5" />Dodaj</Button>
          </div>
        </div>
      </section>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={activeCategory === "all" ? "default" : "secondary"} className="text-xs" onClick={() => setActiveCategory("all")}>
          Wszystko ({sessionNotes.length})
        </Button>
        {NOTE_CATEGORIES.map((cat) => {
          const count = sessionNotes.filter((n) => n.category === cat.id).length;
          return (
            <Button key={cat.id} size="sm" variant={activeCategory === cat.id ? "default" : "secondary"} className="text-xs gap-1" onClick={() => setActiveCategory(cat.id)}>
              <cat.icon className="h-3 w-3" />{cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Notes list */}
      <div className="space-y-1.5">
        {filtered.map((note) => {
          const Icon = getCategoryIcon(note.category);
          return (
            <div key={note.id} className="flex items-start gap-2 px-3 py-2.5 rounded-md border bg-card">
              <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {editingId === note.id ? (
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus rows={3}
                    className="text-sm min-h-[48px]"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) saveEdit(note.id); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => saveEdit(note.id)} />
                ) : (
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors whitespace-pre-line" onClick={() => startEdit(note)}>
                    {note.text}
                  </p>
                )}
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground" onClick={() => removeNote(note.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Brak notatek</CardContent></Card>
        )}
      </div>
    </div>
  );
}