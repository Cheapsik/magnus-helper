import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Copy, Check, Dice5, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface RumorSegment {
  id: string;
  name: string;
  entries: string[];
}

interface RumorTemplate {
  id: string;
  name: string;
  prefix: string;
  segments: RumorSegment[];
  history: string[];
}

interface RumorsConfig {
  templates: RumorTemplate[];
  activeTemplateId: string | null;
}

/* ── Defaults ── */

const uid = () => crypto.randomUUID();

const DEFAULT_CONFIG: RumorsConfig = {
  templates: [
    {
      id: "t1",
      name: "Plotka karczmana",
      prefix: "Podobno ",
      segments: [
        { id: "s1", name: "Kto", entries: ["stary kowal", "tajemnicza elfka", "kupiec z południa", "miejscowy pijak", "wędrowny mnich", "szlachcic w przebraniu"] },
        { id: "s2", name: "Co zrobił", entries: ["ukradł coś cennego", "zniknął bez śladu", "zawarł pakt z diabłem", "ożenił się potajemnie", "sprzedał coś czego nie powinien"] },
        { id: "s3", name: "Gdzie", entries: ["w miejskiej zbrojowni", "za starym młynem", "na targowisku w środku nocy", "w podziemiach zamku", "w opuszczonej świątyni"] },
        { id: "s4", name: "Dlaczego", entries: ["bo był zdesperowany", "dla złota", "z miłości do kogoś nieodpowiedniego", "pod przymusem", "bo nie miał wyboru"] },
      ],
      history: [],
    },
    {
      id: "t2",
      name: "Haczyk fabularny",
      prefix: "Mówi się, że ",
      segments: [
        { id: "s5", name: "Zleceniodawca", entries: ["miejscowy mag", "kapitan straży", "bogata wdowa", "tajemnicza organizacja", "sam burmistrz"] },
        { id: "s6", name: "Zadanie", entries: ["szuka kogoś do odzyskania zagubionego artefaktu", "potrzebuje eskorty przez niebezpieczne tereny", "oferuje nagrodę za informacje", "chce cicho pozbyć się problemu", "szuka świadków pewnego zdarzenia"] },
        { id: "s7", name: "Komplikacja", entries: ["ale coś jest nie tak z jego historią", "ale ktoś inny też tego szuka", "ale czas nagli", "ale poprzedni najemnicy zniknęli", "ale prawdziwy cel jest inny"] },
      ],
      history: [],
    },
  ],
  activeTemplateId: "t1",
};

/* ── Persistence ── */

const STORAGE_KEY = "rpg_rumors_config";

function loadConfig(): RumorsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: RumorsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/* ── Helpers ── */

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Components ── */

function SegmentEditor({
  segment,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  segment: RumorSegment;
  index: number;
  total: number;
  onUpdate: (s: RumorSegment) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);
  const [newEntry, setNewEntry] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(segment.name);

  useEffect(() => { setNameDraft(segment.name); }, [segment.name]);

  const commitName = () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft !== segment.name) {
      onUpdate({ ...segment, name: nameDraft.trim() });
    } else {
      setNameDraft(segment.name);
    }
  };

  const addEntry = () => {
    const v = newEntry.trim();
    if (!v) return;
    onUpdate({ ...segment, entries: [...segment.entries, v] });
    setNewEntry("");
  };

  const removeEntry = (i: number) => {
    onUpdate({ ...segment, entries: segment.entries.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commitName(); }}
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-sm font-medium max-w-[200px]"
            />
          ) : (
            <span className="text-sm font-medium text-foreground truncate">{segment.name}</span>
          )}
          <span className="text-xs text-muted-foreground">({segment.entries.length})</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(-1); }}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(1); }}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded hover:bg-accent text-destructive min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {/* Body */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 py-2 space-y-1.5">
          {segment.entries.map((entry, i) => (
            <div key={`${segment.id}-entry-${i}`} className="flex items-center gap-2">
              <span className="text-sm text-foreground flex-1 truncate">{entry}</span>
              <button
                onClick={() => removeEntry(i)}
                className="p-1.5 rounded hover:bg-accent text-destructive shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Input
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              placeholder="Nowy wpis..."
              className="text-sm h-9 flex-1"
            />
            <Button onClick={addEntry} size="sm" variant="outline" className="min-h-[36px] min-w-[44px] shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onUpdate,
}: {
  template: RumorTemplate;
  onUpdate: (t: RumorTemplate) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(template.name);
  const [result, setResult] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setNameDraft(template.name); setResult(""); }, [template.id, template.name]);

  const commitName = () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft !== template.name) {
      onUpdate({ ...template, name: nameDraft.trim() });
    } else {
      setNameDraft(template.name);
    }
  };

  const updateSegment = (updated: RumorSegment) => {
    onUpdate({
      ...template,
      segments: template.segments.map((s) => (s.id === updated.id ? updated : s)),
    });
  };

  const removeSegment = (id: string) => {
    onUpdate({ ...template, segments: template.segments.filter((s) => s.id !== id) });
  };

  const moveSegment = (index: number, dir: -1 | 1) => {
    const segs = [...template.segments];
    const target = index + dir;
    if (target < 0 || target >= segs.length) return;
    [segs[index], segs[target]] = [segs[target], segs[index]];
    onUpdate({ ...template, segments: segs });
  };

  const addSegment = () => {
    onUpdate({
      ...template,
      segments: [...template.segments, { id: uid(), name: "Nowy segment", entries: [] }],
    });
  };

  const generate = () => {
    const filledSegments = template.segments.filter((s) => s.entries.length > 0);
    if (filledSegments.length === 0) {
      setResult("");
      return;
    }
    const parts = filledSegments.map((s) => pickRandom(s.entries));
    const text = (template.prefix || "") + parts.join(" ");
    setResult(text);
    const newHistory = [text, ...(template.history || [])].slice(0, 10);
    onUpdate({ ...template, history: newHistory });
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const hasEntries = template.segments.some((s) => s.entries.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable editor area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Name */}
        <div>
          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === "Enter" && commitName()}
              className="text-lg font-bold"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-lg font-bold text-foreground hover:text-primary transition-colors text-left w-full min-h-[44px] flex items-center"
            >
              {template.name}
            </button>
          )}
        </div>

        {/* Prefix */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prefiks zdania</label>
          <Input
            value={template.prefix}
            onChange={(e) => onUpdate({ ...template, prefix: e.target.value })}
            placeholder='np. "Podobno ", "Mówi się, że "'
            className="text-sm"
          />
        </div>

        {/* Segments */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Segmenty</h3>
          {template.segments.map((seg, i) => (
            <SegmentEditor
              key={seg.id}
              segment={seg}
              index={i}
              total={template.segments.length}
              onUpdate={updateSegment}
              onRemove={() => removeSegment(seg.id)}
              onMove={(dir) => moveSegment(i, dir)}
            />
          ))}
          <Button onClick={addSegment} variant="outline" size="sm" className="w-full min-h-[44px]">
            <Plus className="h-4 w-4 mr-1" /> Dodaj segment
          </Button>
        </div>
      </div>

      {/* Generator – sticky bottom */}
      <div className="border-t border-border pt-4 space-y-3 bg-background sticky bottom-0">
        <Textarea
          readOnly
          value={result}
          placeholder="Naciśnij Generuj aby stworzyć plotkę..."
          className="text-sm min-h-[60px] resize-none"
        />
        <div className="flex gap-2">
          <Button
            onClick={generate}
            className="flex-1 min-h-[44px]"
            disabled={!hasEntries}
          >
            <Dice5 className="h-4 w-4 mr-1" /> Generuj
          </Button>
          <Button
            onClick={() => result && copyText(result, "main")}
            variant="outline"
            className="min-h-[44px] min-w-[44px]"
            disabled={!result}
          >
            {copiedId === "main" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* History */}
        {template.history && template.history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showHistory && "rotate-180")} />
              Ostatnie wyniki ({template.history.length})
            </button>
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              showHistory ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="space-y-1 pt-1">
                {template.history.map((h, i) => (
                  <div key={`hist-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="flex-1">{h}</span>
                    <button
                      onClick={() => copyText(h, `h-${i}`)}
                      className="p-1 rounded hover:bg-accent shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                      {copiedId === `h-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!hasEntries && (
          <p className="text-xs text-muted-foreground text-center">
            Dodaj wpisy do segmentów aby generować plotki
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function RumorsPage() {
  const [config, setConfig] = useState<RumorsConfig>(loadConfig);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  useEffect(() => { saveConfig(config); }, [config]);

  const activeTemplate = config.templates.find((t) => t.id === config.activeTemplateId) || null;

  const selectTemplate = (id: string) => {
    setConfig((c) => ({ ...c, activeTemplateId: id }));
    setMobileView("editor");
  };

  const addTemplate = () => {
    const t: RumorTemplate = {
      id: uid(),
      name: "Nowy szablon",
      prefix: "",
      segments: [{ id: uid(), name: "Segment 1", entries: [] }],
      history: [],
    };
    setConfig((c) => ({
      ...c,
      templates: [...c.templates, t],
      activeTemplateId: t.id,
    }));
    setMobileView("editor");
  };

  const removeTemplate = (id: string) => {
    const tpl = config.templates.find((t) => t.id === id);
    if (!tpl) return;
    if (!confirm(`Czy na pewno usunąć szablon '${tpl.name}'?`)) return;
    setConfig((c) => ({
      ...c,
      templates: c.templates.filter((t) => t.id !== id),
      activeTemplateId: c.activeTemplateId === id
        ? (c.templates.find((t) => t.id !== id)?.id || null)
        : c.activeTemplateId,
    }));
  };

  const updateTemplate = useCallback((updated: RumorTemplate) => {
    setConfig((c) => ({
      ...c,
      templates: c.templates.map((t) => (t.id === updated.id ? updated : t)),
    }));
  }, []);

  /* ── Template List Panel ── */
  const templateList = (
    <div className="space-y-2">
      {config.templates.map((t) => (
        <Card
          key={t.id}
          className={cn(
            "cursor-pointer transition-colors border bg-card shadow-sm",
            t.id === config.activeTemplateId
              ? "border-primary bg-primary/5"
              : "border-border hover:border-border/80",
          )}
          onClick={() => selectTemplate(t.id)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.segments.length} segmentów</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeTemplate(t.id); }}
              className="p-2 rounded hover:bg-accent text-destructive shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ))}
      <Button onClick={addTemplate} variant="outline" className="w-full min-h-[44px]">
        <Plus className="h-4 w-4 mr-1" /> Dodaj szablon
      </Button>
    </div>
  );

  /* ── Desktop ── */
  const desktopLayout = (
    <div className="hidden md:grid grid-cols-[30%_1fr] gap-4 h-[calc(100vh-8rem)]">
      <div className="overflow-y-auto pr-2 pl-1">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Szablony</h2>
        {templateList}
      </div>
      <div className="overflow-hidden flex flex-col">
        {activeTemplate ? (
          <TemplateEditor template={activeTemplate} onUpdate={updateTemplate} />
        ) : (
          <p className="text-muted-foreground text-center py-12">Wybierz lub dodaj szablon</p>
        )}
      </div>
    </div>
  );

  /* ── Mobile ── */
  const mobileLayout = (
    <div className="md:hidden">
      {mobileView === "list" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Szablony</h2>
            {activeTemplate && (
              <Button
                onClick={() => setMobileView("editor")}
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
              >
                Edytuj szablon <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
          {templateList}
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            onClick={() => setMobileView("list")}
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Szablony
          </Button>
          {activeTemplate ? (
            <TemplateEditor template={activeTemplate} onUpdate={updateTemplate} />
          ) : (
            <p className="text-muted-foreground text-center py-12">Wybierz szablon</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-app-brand text-xl font-bold text-foreground">Plotki & Haczyki</h1>
      {desktopLayout}
      {mobileLayout}
    </div>
  );
}