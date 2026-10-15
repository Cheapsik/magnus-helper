import { useMemo, useState } from "react";
import { Check, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type ReferenceEntry = {
  id: string;
  nazwa: string;
  opis: string;
  /** Free-form link to whatever the campaign tests this entry against. */
  cecha: string;
};

type SectionId = "umiejetnosci" | "zdolnosci";

export type AbilitiesReferenceStore = Record<SectionId, ReferenceEntry[]>;

export const ABILITIES_REFERENCE_KEY = "rpg_kodeks_abilities";

const EMPTY_STORE: AbilitiesReferenceStore = { umiejetnosci: [], zdolnosci: [] };

const SECTIONS: { id: SectionId; label: string; hint: string; empty: string }[] = [
  {
    id: "umiejetnosci",
    label: "Umiejętności",
    hint: "Testy i cechy",
    empty: "Brak umiejętności. Dodaj te, których używa Twoja kampania.",
  },
  {
    id: "zdolnosci",
    label: "Zdolności",
    hint: "Talenty i atuty",
    empty: "Brak zdolności. Dodaj te, których używa Twoja kampania.",
  },
];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function matchesQuery(entry: ReferenceEntry, q: string) {
  if (!q) return true;
  return (
    entry.nazwa.toLowerCase().includes(q) ||
    entry.opis.toLowerCase().includes(q) ||
    entry.cecha.toLowerCase().includes(q)
  );
}

function EntryForm({
  title,
  nazwa,
  cecha,
  opis,
  onNazwa,
  onCecha,
  onOpis,
  onSave,
  onCancel,
  saveLabel,
}: {
  title: string;
  nazwa: string;
  cecha: string;
  opis: string;
  onNazwa: (v: string) => void;
  onCecha: (v: string) => void;
  onOpis: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-2 p-3">
        <h3 className="text-xs font-semibold">{title}</h3>
        <Input
          value={nazwa}
          onChange={(e) => onNazwa(e.target.value)}
          placeholder="Nazwa"
          className="h-8 text-xs"
        />
        <Input
          value={cecha}
          onChange={(e) => onCecha(e.target.value)}
          placeholder="Cecha / test (opcjonalnie)"
          className="h-8 text-xs"
        />
        <Textarea
          value={opis}
          onChange={(e) => onOpis(e.target.value)}
          placeholder="Opis…"
          className="min-h-[100px] text-xs"
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 flex-1 gap-1 text-xs" onClick={onSave}>
            <Check className="h-3 w-3" />
            {saveLabel}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
            Anuluj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AbilitiesReference() {
  const [store, setStore] = useLocalStorage<AbilitiesReferenceStore>(
    ABILITIES_REFERENCE_KEY,
    EMPTY_STORE,
  );
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<SectionId>("umiejetnosci");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draftNazwa, setDraftNazwa] = useState("");
  const [draftCecha, setDraftCecha] = useState("");
  const [draftOpis, setDraftOpis] = useState("");

  const q = search.trim().toLowerCase();
  const activeSection = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  const counts = useMemo(
    () => ({
      umiejetnosci: store.umiejetnosci.filter((e) => matchesQuery(e, q)).length,
      zdolnosci: store.zdolnosci.filter((e) => matchesQuery(e, q)).length,
    }),
    [store, q],
  );

  const visible = useMemo(
    () => store[section].filter((e) => matchesQuery(e, q)),
    [store, section, q],
  );

  const resetDraft = () => {
    setDraftNazwa("");
    setDraftCecha("");
    setDraftOpis("");
  };

  const startAdd = () => {
    setEditingId(null);
    resetDraft();
    setAdding(true);
  };

  const startEdit = (entry: ReferenceEntry) => {
    setAdding(false);
    setEditingId(entry.id);
    setDraftNazwa(entry.nazwa);
    setDraftCecha(entry.cecha);
    setDraftOpis(entry.opis);
  };

  const cancelDraft = () => {
    setAdding(false);
    setEditingId(null);
    resetDraft();
  };

  const saveAdd = () => {
    if (!draftNazwa.trim()) return;
    const entry: ReferenceEntry = {
      id: newId(),
      nazwa: draftNazwa.trim(),
      cecha: draftCecha.trim(),
      opis: draftOpis,
    };
    setStore((prev) => ({ ...prev, [section]: [...prev[section], entry] }));
    cancelDraft();
  };

  const saveEdit = () => {
    if (!editingId || !draftNazwa.trim()) return;
    setStore((prev) => ({
      ...prev,
      [section]: prev[section].map((e) =>
        e.id === editingId
          ? { ...e, nazwa: draftNazwa.trim(), cecha: draftCecha.trim(), opis: draftOpis }
          : e,
      ),
    }));
    cancelDraft();
  };

  const remove = (id: string) => {
    setStore((prev) => ({ ...prev, [section]: prev[section].filter((e) => e.id !== id) }));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={startAdd}>
          <Plus className="h-3 w-3" /> Dodaj wpis
        </Button>
      </div>

      {adding && (
        <EntryForm
          title={`Nowy wpis — ${activeSection.label.toLowerCase()}`}
          nazwa={draftNazwa}
          cecha={draftCecha}
          opis={draftOpis}
          onNazwa={setDraftNazwa}
          onCecha={setDraftCecha}
          onOpis={setDraftOpis}
          onSave={saveAdd}
          onCancel={cancelDraft}
          saveLabel="Dodaj"
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj umiejętności i zdolności…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Rodzaj wpisu"
          className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
        >
          {SECTIONS.map(({ id, label, hint }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSection(id);
                  cancelDraft();
                }}
                className={cn(
                  "flex min-w-[8.5rem] shrink-0 flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 shadow-sm"
                    : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium", active && "text-foreground")}>
                    {label}
                  </span>
                  <Badge
                    variant={active ? "default" : "secondary"}
                    className="h-5 min-w-5 justify-center px-1.5 text-[10px] font-normal tabular-nums"
                  >
                    {counts[id]}
                  </Badge>
                </span>
                <span className="mt-0.5 text-[11px] leading-tight opacity-80">{hint}</span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {q ? "Brak wyników pasujących do wyszukiwania." : activeSection.empty}
          </p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {visible.map((entry) =>
              editingId === entry.id ? (
                <EntryForm
                  key={entry.id}
                  title="Edycja wpisu"
                  nazwa={draftNazwa}
                  cecha={draftCecha}
                  opis={draftOpis}
                  onNazwa={setDraftNazwa}
                  onCecha={setDraftCecha}
                  onOpis={setDraftOpis}
                  onSave={saveEdit}
                  onCancel={cancelDraft}
                  saveLabel="Zapisz"
                />
              ) : (
                <AccordionItem
                  key={entry.id}
                  value={entry.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-b-0 border-border/60 bg-card shadow-sm transition-colors hover:border-border data-[state=open]:border-primary/25"
                >
                  <AccordionTrigger className="min-h-[3.25rem] px-4 py-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                      <span className="truncate text-sm font-semibold leading-tight">
                        {entry.nazwa}
                      </span>
                      {entry.cecha && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {entry.cecha}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 border-t border-border/40 bg-muted/10 px-4 py-3">
                    {entry.opis && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {entry.opis}
                      </p>
                    )}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => startEdit(entry)}
                      >
                        <Edit2 className="h-3 w-3" /> Edytuj
                      </Button>
                      {deleteConfirm === entry.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 gap-1 text-xs"
                            onClick={() => remove(entry.id)}
                          >
                            <Check className="h-3 w-3" /> Potwierdź
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            <X className="h-3 w-3" /> Anuluj
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-xs text-destructive"
                          onClick={() => setDeleteConfirm(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Usuń
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ),
            )}
          </Accordion>
        )}
      </div>
    </div>
  );
}
