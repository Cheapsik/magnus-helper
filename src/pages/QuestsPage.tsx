import { useState, useRef, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import {
  Plus,
  Search,
  X,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import EmojiPicker, { Theme as EmojiPickerTheme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getNpcDisplayName, NpcQuickPreview } from "@/components/character-sheet";
import { MentionTextarea } from "@/components/mention/MentionTextarea";

/* ────────────────────────────────────────────── Layout config (types + columns) */

const STORAGE_QUEST_LAYOUT = "rpg_quests_layout";
const STORAGE_QUESTS = "rpg_quests";
const STORAGE_CARD_COLLAPSED = "rpg_quests_card_collapsed";

interface QuestTypeConfig {
  id: string;
  label: string;
  emoji: string;
  accent: string;
}

interface QuestColumnConfig {
  id: string;
  label: string;
  /** Hex color e.g. #ef4444 — drives header + column tint */
  color: string;
}

interface QuestsLayoutConfig {
  types: QuestTypeConfig[];
  columns: QuestColumnConfig[];
}

const DEFAULT_QUEST_LAYOUT: QuestsLayoutConfig = {
  types: [
    { id: "walka", emoji: "🗡️", label: "Walka", accent: "#e5484d" },
    { id: "intryga", emoji: "🕵️", label: "Intryga", accent: "#a855c7" },
    { id: "eksploracja", emoji: "🌍", label: "Eksploracja", accent: "#22c55e" },
    { id: "spoleczny", emoji: "👥", label: "Społeczny", accent: "#eab308" },
    { id: "zagrozenie", emoji: "💀", label: "Zagrożenie", accent: "#ea580c" },
    { id: "ekonomiczny", emoji: "💰", label: "Ekonomiczny", accent: "#f59e0b" },
    { id: "tajemnica", emoji: "❓", label: "Tajemnica", accent: "#3b82f6" },
    { id: "inne", emoji: "📜", label: "Inne", accent: "#9ca3af" },
  ],
  columns: [
    { id: "aktywne", label: "Aktywne", color: "#ca8a04" },
    { id: "uspione", label: "Uśpione", color: "#2563eb" },
    { id: "zamkniete", label: "Zamknięte", color: "#6b7280" },
  ],
};

/* ────────────────────────────────────────────── Quest state */

interface Quest {
  id: string;
  title: string;
  type: string;
  column: string;
  notes: string;
  linkedNpcs: string[];
  linkedQuests: string[];
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface QuestsState {
  quests: Quest[];
  order: Record<string, string[]>;
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function ensureHexColor(c: string, fallback: string): string {
  const t = (c || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const r = t[1],
      g = t[2],
      b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function buildDefaultQuestState(layout: QuestsLayoutConfig): QuestsState {
  const colIds = layout.columns.map((c) => c.id);
  const order: Record<string, string[]> = {};
  colIds.forEach((id) => {
    order[id] = [];
  });
  return { quests: [], order };
}

function normalizeOrderKeys(order: Record<string, string[]>, columnIds: string[]): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  columnIds.forEach((id) => {
    next[id] = order[id] ? [...order[id]] : [];
  });
  return next;
}

function repairQuestsState(raw: QuestsState, layout: QuestsLayoutConfig): QuestsState {
  const colIds = new Set(layout.columns.map((c) => c.id));
  const typeIds = new Set(layout.types.map((t) => t.id));
  const fallbackType = layout.types.find((t) => t.id === "inne")?.id ?? layout.types[0]?.id ?? "inne";
  const fallbackCol = layout.columns[0]?.id ?? "aktywne";

  const quests = raw.quests.map((q) => ({
    ...q,
    type: typeIds.has(q.type) ? q.type : fallbackType,
    column: colIds.has(q.column) ? q.column : fallbackCol,
  }));

  const order = normalizeOrderKeys(raw.order, layout.columns.map((c) => c.id));

  const seen = new Set<string>();
  (Object.keys(order) as string[]).forEach((col) => {
    order[col] = order[col].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return quests.some((q) => q.id === id);
    });
  });

  quests.forEach((q) => {
    if (!seen.has(q.id)) {
      if (order[q.column]) order[q.column].push(q.id);
      seen.add(q.id);
    }
  });

  return { quests, order };
}

function readQuestsStateFromStorage(layout: QuestsLayoutConfig): QuestsState | null {
  try {
    const item = window.localStorage.getItem(STORAGE_QUESTS);
    if (!item) return null;
    const parsed = JSON.parse(item) as QuestsState;
    if (!parsed?.quests || !parsed?.order) return null;
    return repairQuestsState(parsed, layout);
  } catch {
    return null;
  }
}

const defaultTypeById = Object.fromEntries(DEFAULT_QUEST_LAYOUT.types.map((t) => [t.id, t]));
const defaultColById = Object.fromEntries(DEFAULT_QUEST_LAYOUT.columns.map((c) => [c.id, c])) as Record<
  string,
  QuestColumnConfig
>;
/** Legacy column id from older installs */
const LEGACY_COL_FALLBACK: Record<string, Pick<QuestColumnConfig, "label" | "color">> = {
  gorace: { label: "Gorące", color: "#ef4444" },
};

function isLikelyHexColor(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((s || "").trim());
}

function normalizeQuestsLayout(raw: QuestsLayoutConfig): QuestsLayoutConfig {
  const typesIn =
    Array.isArray(raw.types) && raw.types.length > 0 ? raw.types : DEFAULT_QUEST_LAYOUT.types;
  const colsIn =
    Array.isArray(raw.columns) && raw.columns.length > 0 ? raw.columns : DEFAULT_QUEST_LAYOUT.columns;

  const types: QuestTypeConfig[] = typesIn.map((t) => {
    const def = defaultTypeById[t.id];
    const accentRaw = (t.accent || "").trim();
    const accent = isLikelyHexColor(accentRaw)
      ? ensureHexColor(accentRaw, def?.accent ?? "#94a3b8")
      : ensureHexColor(def?.accent ?? "#94a3b8", "#94a3b8");
    const rawLabel = typeof t.label === "string" ? t.label : def?.label ?? "";
    const label =
      rawLabel.trim() !== "" ? rawLabel.trim().slice(0, 80) : (def?.label ?? "Typ").slice(0, 80);
    return {
      id: String(t.id || "typ").slice(0, 64),
      label,
      emoji: t.emoji || def?.emoji || "📌",
      accent,
    };
  });

  const columns: QuestColumnConfig[] = colsIn.map((c) => {
    const def = defaultColById[c.id] ?? LEGACY_COL_FALLBACK[c.id];
    const colorRaw = (c.color || "").trim();
    const color = isLikelyHexColor(colorRaw)
      ? ensureHexColor(colorRaw, def?.color ?? "#6b7280")
      : ensureHexColor(def?.color ?? "#6b7280", "#6b7280");
    const rawLabel = typeof c.label === "string" ? c.label : def?.label ?? "";
    const label =
      rawLabel.trim() !== "" ? rawLabel.trim().slice(0, 80) : (def?.label ?? "Kolumna").slice(0, 80);
    return {
      id: String(c.id || "kol").slice(0, 64),
      label,
      color,
    };
  });

  return {
    types: types.length ? types : DEFAULT_QUEST_LAYOUT.types,
    columns: columns.length ? columns : DEFAULT_QUEST_LAYOUT.columns,
  };
}

function loadNormalizedLayoutFromStorage(): QuestsLayoutConfig {
  try {
    const item = window.localStorage.getItem(STORAGE_QUEST_LAYOUT);
    if (!item) return normalizeQuestsLayout(DEFAULT_QUEST_LAYOUT);
    const parsed = JSON.parse(item) as QuestsLayoutConfig;
    return normalizeQuestsLayout(parsed);
  } catch {
    return normalizeQuestsLayout(DEFAULT_QUEST_LAYOUT);
  }
}

/* ────────────────────────────────────────────── Column chrome (color-mix) */

function columnChromeStyles(hex: string): CSSProperties {
  const c = ensureHexColor(hex, "#6b7280");
  return {
    ["--col" as string]: c,
    borderColor: "transparent",
    background: `color-mix(in srgb, ${c} 14%, transparent)`,
  };
}

function columnHeaderStyles(hex: string): CSSProperties {
  const c = ensureHexColor(hex, "#6b7280");
  return {
    background: `color-mix(in srgb, ${c} 72%, #0a0a0a)`,
    color: `color-mix(in srgb, ${c} 8%, #fafafa)`,
    borderBottomColor: `color-mix(in srgb, ${c} 55%, transparent)`,
  };
}

/* ────────────────────────────────────────────── Fine pointer */

function useFinePointer() {
  const [fine, setFine] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return fine;
}

/* ────────────────────────────────────────────── Emoji popover */

function EmojiPickerButton({
  emoji,
  onPick,
  className,
}: {
  emoji: string;
  onPick: (e: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "light" ? EmojiPickerTheme.LIGHT : EmojiPickerTheme.DARK;

  const onEmojiClick = useCallback(
    (data: EmojiClickData) => {
      onPick(data.emoji);
      setOpen(false);
    },
    [onPick],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-background px-2 text-lg leading-none hover:bg-accent",
            className,
          )}
        >
          {emoji || "➕"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[min(100vw-2rem,420px)] border p-0 shadow-lg" align="start">
        <EmojiPicker theme={pickerTheme} width={360} height={420} onEmojiClick={onEmojiClick} searchPlaceHolder="Szukaj emoji…" />
      </PopoverContent>
    </Popover>
  );
}

/* ────────────────────────────────────────────── Corner ribbon (type accent) */

function TypeCornerRibbon({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-[1] h-[4.25rem] w-[5.5rem] overflow-hidden rounded-tr-[inherit]"
      aria-hidden
    >
      <div
        className="absolute right-[-40%] top-[5%] w-[100%] rotate-45 py-1 shadow-md"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────── Quest Card */

interface QuestCardProps {
  quest: Quest;
  allQuests: Quest[];
  typeMap: Record<string, QuestTypeConfig>;
  columns: QuestColumnConfig[];
  highlight: boolean;
  searchActive: boolean;
  matchesSearch: boolean;
  finePointer: boolean;
  bodyCollapsed: boolean;
  onToggleBodyCollapsed: () => void;
  onUpdate: (patch: Partial<Quest>) => void;
  onDelete: () => void;
  onMove: (col: string) => void;
  onJumpTo: (id: string) => void;
  onOpenNpc: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function QuestCard({
  quest,
  allQuests,
  typeMap,
  columns,
  highlight,
  searchActive,
  matchesSearch,
  finePointer,
  bodyCollapsed,
  onToggleBodyCollapsed,
  onUpdate,
  onDelete,
  onMove,
  onJumpTo,
  onOpenNpc,
  onDragStart,
  onDragEnd,
}: QuestCardProps) {
  const { savedNpcs } = useApp();
  const [editTitle, setEditTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(quest.title);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showNpcPicker, setShowNpcPicker] = useState(false);
  const [showQuestPicker, setShowQuestPicker] = useState(false);
  const [npcQuery, setNpcQuery] = useState("");
  const [questQuery, setQuestQuery] = useState("");

  const debounceRef = useRef<number | null>(null);
  const [notesDraft, setNotesDraft] = useState(quest.notes);

  useEffect(() => setNotesDraft(quest.notes), [quest.id, quest.notes]);
  useEffect(() => setTitleDraft(quest.title), [quest.title]);

  const handleNotesChange = (v: string) => {
    setNotesDraft(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onUpdate({ notes: v, updatedAt: now() });
    }, 500);
  };

  const type = typeMap[quest.type];
  const accent = type ? ensureHexColor(type.accent, "#9ca3af") : "#9ca3af";
  const dimmed = searchActive && !matchesSearch;
  const showActions = finePointer || actionsOpen;

  const linkedNpcsObjs = quest.linkedNpcs
    .map((id) => savedNpcs.find((n) => n.id === id))
    .filter(Boolean)
    .map((n) => ({ id: n!.id, name: getNpcDisplayName(n!) }));

  const linkedQuestsObjs = quest.linkedQuests
    .map((id) => allQuests.find((q) => q.id === id))
    .filter(Boolean) as Quest[];

  const npcOptions = savedNpcs
    .filter((n) => !quest.linkedNpcs.includes(n.id))
    .filter(
      (n) => !npcQuery || getNpcDisplayName(n).toLowerCase().includes(npcQuery.toLowerCase()),
    );

  const questOptions = allQuests
    .filter((q) => q.id !== quest.id && !quest.linkedQuests.includes(q.id))
    .filter((q) => !questQuery || q.title.toLowerCase().includes(questQuery.toLowerCase()));

  const saveTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== quest.title) onUpdate({ title: t, updatedAt: now() });
    else setTitleDraft(quest.title);
    setEditTitle(false);
  };

  return (
    <Card
      id={`quest-${quest.id}`}
      draggable={finePointer}
      onDragStart={(e) => {
        if (!finePointer) return;
        e.dataTransfer.setData("text/plain", quest.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={() => !finePointer && setActionsOpen((v) => !v)}
      className={cn(
        "relative overflow-hidden border transition-all duration-150",
        dimmed && "opacity-30",
        highlight && "ring-2 ring-primary shadow-lg",
      )}
    >
      <TypeCornerRibbon color={accent} />

      <CardContent className="relative z-[3] space-y-2 p-3">
        {/* Header — title row; collapse overlaps corner ribbon */}
        <div className="relative min-h-[2rem] pr-1 pt-0.5">
          {bodyCollapsed ? (
            <div className="pr-10">
              <span className="text-sm font-semibold leading-tight">{quest.title}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 pr-10">
                <span className="flex size-8 shrink-0 items-center justify-center text-lg leading-none" aria-hidden>
                  {type?.emoji ?? "❔"}
                </span>
                <div className="min-w-0 flex-1">
                  {editTitle ? (
                    <div className="flex gap-1">
                      <Input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle();
                          if (e.key === "Escape") {
                            setTitleDraft(quest.title);
                            setEditTitle(false);
                          }
                        }}
                        autoFocus
                        className="h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTitle();
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="w-full text-left text-sm font-semibold leading-tight transition-colors hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(true);
                      }}
                    >
                      {quest.title}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-0.5 pl-10 pr-10 text-[10px] text-muted-foreground">{type?.label ?? "Typ"}</div>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 z-20 h-9 w-9 text-muted-foreground hover:bg-background/60 hover:text-foreground"
            title={bodyCollapsed ? "Rozwiń wątek" : "Zwiń wątek"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBodyCollapsed();
            }}
          >
            {bodyCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!bodyCollapsed && (
          <>
            <MentionTextarea
              value={notesDraft}
              onChange={handleNotesChange}
              placeholder="Co wiadomo? Co jest niejasne? Co dalej?"
              className="text-xs"
            />

            <div className="space-y-1.5">
              {linkedNpcsObjs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {linkedNpcsObjs.map((npc) => (
                    <span
                      key={npc.id}
                      className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNpc(npc.id);
                        }}
                        className="hover:text-primary"
                      >
                        👤 {npc.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            linkedNpcs: quest.linkedNpcs.filter((i) => i !== npc.id),
                            updatedAt: now(),
                          });
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Usuń NPC"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <DropdownMenu open={showNpcPicker} onOpenChange={setShowNpcPicker}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="mr-1 h-3 w-3" /> NPC
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 w-64 overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-2">
                    <Input
                      placeholder="Szukaj NPC…"
                      value={npcQuery}
                      onChange={(e) => setNpcQuery(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {npcOptions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {savedNpcs.length === 0 ? "Brak zapisanych NPC" : "Brak wyników"}
                    </div>
                  )}
                  {npcOptions.map((npc) => (
                    <DropdownMenuItem
                      key={npc.id}
                      onClick={() => {
                        onUpdate({
                          linkedNpcs: [...quest.linkedNpcs, npc.id],
                          updatedAt: now(),
                        });
                        setNpcQuery("");
                        setShowNpcPicker(false);
                      }}
                    >
                      👤 {getNpcDisplayName(npc)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              {linkedQuestsObjs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {linkedQuestsObjs.map((q) => (
                    <span key={q.id} className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[11px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpTo(q.id);
                        }}
                        className="hover:text-primary"
                      >
                        🔗 {q.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({
                            linkedQuests: quest.linkedQuests.filter((i) => i !== q.id),
                            updatedAt: now(),
                          });
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Usuń powiązanie"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <DropdownMenu open={showQuestPicker} onOpenChange={setShowQuestPicker}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Powiąż wątek
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 w-64 overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-2">
                    <Input
                      placeholder="Szukaj wątku…"
                      value={questQuery}
                      onChange={(e) => setQuestQuery(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {questOptions.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Brak wyników</div>
                  )}
                  {questOptions.map((q) => (
                    <DropdownMenuItem
                      key={q.id}
                      onClick={() => {
                        onUpdate({
                          linkedQuests: [...quest.linkedQuests, q.id],
                          updatedAt: now(),
                        });
                        setQuestQuery("");
                        setShowQuestPicker(false);
                      }}
                    >
                      {(typeMap[q.type]?.emoji ?? "📌") + " "}
                      {q.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {showActions && (
              <div
                className="flex items-center justify-between gap-1 border-t border-border/50 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => setEditTitle(true)} title="Edytuj tytuł">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>

                {!finePointer && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 flex-1 gap-1 px-3 text-xs">
                        Przenieś <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {columns
                        .filter((c) => c.id !== quest.column)
                        .map((c) => (
                          <DropdownMenuItem key={c.id} onClick={() => onMove(c.id)}>
                            {c.label}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-9 px-2 text-xs text-muted-foreground hover:text-destructive", finePointer && "ml-auto")}
                  onClick={() => {
                    if (confirm(`Usunąć wątek '${quest.title}'?`)) onDelete();
                  }}
                  title="Usuń wątek"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────── Slug ids */

function uniqueSlug(baseRaw: string, existing: Set<string>): string {
  const base =
    baseRaw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28) || "item";
  let id = base;
  let n = 0;
  while (existing.has(id)) {
    n += 1;
    id = `${base}-${n}`;
  }
  return id;
}

function cloneLayout(l: QuestsLayoutConfig): QuestsLayoutConfig {
  return JSON.parse(JSON.stringify(l)) as QuestsLayoutConfig;
}

function validateLayoutDraft(d: QuestsLayoutConfig): string | null {
  if (!d.types.length) return "Dodaj co najmniej jeden typ.";
  if (!d.columns.length) return "Dodaj co najmniej jedną kolumnę.";
  for (const t of d.types) {
    if (!String(t.label ?? "").trim()) return "Każdy typ musi mieć nazwę.";
  }
  for (const c of d.columns) {
    if (!String(c.label ?? "").trim()) return "Każda kolumna musi mieć nazwę.";
  }
  return null;
}

/* ────────────────────────────────────────────── Page */

export default function QuestsPage() {
  const { savedNpcs } = useApp();
  const finePointer = useFinePointer();
  const [layoutRaw, setLayoutRaw] = useLocalStorage<QuestsLayoutConfig>(STORAGE_QUEST_LAYOUT, DEFAULT_QUEST_LAYOUT);
  const layout = useMemo(() => normalizeQuestsLayout(layoutRaw), [layoutRaw]);

  const setLayout = useCallback(
    (action: QuestsLayoutConfig | ((prev: QuestsLayoutConfig) => QuestsLayoutConfig)) => {
      setLayoutRaw((prev) => {
        const next = typeof action === "function" ? (action as (p: QuestsLayoutConfig) => QuestsLayoutConfig)(prev) : action;
        return normalizeQuestsLayout(next);
      });
    },
    [setLayoutRaw],
  );

  const [state, setState] = useState<QuestsState>(() => {
    const lay = loadNormalizedLayoutFromStorage();
    return readQuestsStateFromStorage(lay) ?? buildDefaultQuestState(lay);
  });

  const [cardCollapsedMap, setCardCollapsedMap] = useLocalStorage<Record<string, boolean>>(STORAGE_CARD_COLLAPSED, {});

  useEffect(() => {
    setState((prev) => repairQuestsState(prev, layout));
  }, [layout]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_QUESTS, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [state]);

  const typeMap = useMemo(() => Object.fromEntries(layout.types.map((t) => [t.id, t])) as Record<string, QuestTypeConfig>, [layout.types]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimeout = useRef<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const defaultTypeId = layout.types.find((t) => t.id === "inne")?.id ?? layout.types[0]?.id ?? "inne";
  const defaultColId =
    layout.columns.find((c) => c.id === "aktywne")?.id ?? layout.columns[0]?.id ?? "aktywne";
  const [draftType, setDraftType] = useState(defaultTypeId);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCol, setDraftCol] = useState(defaultColId);
  const [draftNotes, setDraftNotes] = useState("");

  const [openNpcId, setOpenNpcId] = useState<string | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const [configOpen, setConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<QuestsLayoutConfig | null>(null);

  useEffect(() => {
    if (!layout.types.some((t) => t.id === draftType)) {
      setDraftType(defaultTypeId);
    }
  }, [layout.types, draftType, defaultTypeId]);

  useEffect(() => {
    if (!layout.columns.some((c) => c.id === draftCol)) {
      setDraftCol(defaultColId);
    }
  }, [layout.columns, draftCol, defaultColId]);

  const updateQuest = useCallback(
    (id: string, patch: Partial<Quest>) => {
      setState((prev) => ({
        ...prev,
        quests: prev.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      }));
    },
    [],
  );

  const deleteQuest = useCallback((id: string) => {
    setState((prev) => {
      const newOrder = { ...prev.order };
      Object.keys(newOrder).forEach((c) => {
        newOrder[c] = newOrder[c].filter((qid) => qid !== id);
      });
      return {
        order: newOrder,
        quests: prev.quests
          .filter((q) => q.id !== id)
          .map((q) => ({
            ...q,
            linkedQuests: q.linkedQuests.filter((qid) => qid !== id),
          })),
      };
    });
    setCardCollapsedMap((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    toast.success("Wątek usunięty");
  }, [setCardCollapsedMap]);

  const moveQuest = useCallback((id: string, target: string) => {
    setState((prev) => {
      const quest = prev.quests.find((q) => q.id === id);
      if (!quest || quest.column === target) return prev;
      const newOrder = { ...prev.order };
      Object.keys(newOrder).forEach((c) => {
        newOrder[c] = newOrder[c].filter((qid) => qid !== id);
      });
      if (!newOrder[target]) newOrder[target] = [];
      newOrder[target] = [...newOrder[target], id];
      return {
        order: newOrder,
        quests: prev.quests.map((q) => (q.id === id ? { ...q, column: target, updatedAt: now() } : q)),
      };
    });
  }, []);

  const createQuest = () => {
    const title = draftTitle.trim();
    if (!title) {
      toast.error("Podaj tytuł wątku");
      return;
    }
    const id = uid();
    const newQuest: Quest = {
      id,
      title,
      type: draftType,
      column: draftCol,
      notes: draftNotes,
      linkedNpcs: [],
      linkedQuests: [],
      sessionNumber: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    setState((prev) => ({
      quests: [...prev.quests, newQuest],
      order: {
        ...prev.order,
        [draftCol]: [...(prev.order[draftCol] ?? []), id],
      },
    }));
    setDraftTitle("");
    setDraftNotes("");
    setDraftType(defaultTypeId);
    setDraftCol(defaultColId);
    setCreateOpen(false);
    toast.success("Wątek utworzony");
  };

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(`quest-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      if (highlightTimeout.current) window.clearTimeout(highlightTimeout.current);
      highlightTimeout.current = window.setTimeout(() => setHighlightId(null), 2000);
    } else {
      toast.info("Wątek jest w innej kolumnie");
    }
  }, []);

  const matchesSearch = (q: Quest) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return q.title.toLowerCase().includes(s) || q.notes.toLowerCase().includes(s);
  };

  const onDropToColumn = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveQuest(id, target);
  };

  const questsByCol = useMemo(() => {
    const map: Record<string, Quest[]> = {};
    layout.columns.forEach((c) => {
      map[c.id] = [];
    });
    layout.columns.forEach((col) => {
      const orderIds = state.order[col.id] ?? [];
      map[col.id] = orderIds
        .map((id) => state.quests.find((q) => q.id === id))
        .filter(Boolean) as Quest[];
      state.quests
        .filter((q) => q.column === col.id && !orderIds.includes(q.id))
        .forEach((q) => map[col.id].push(q));
    });
    return map;
  }, [state, layout.columns]);

  const totalQuests = state.quests.length;
  const openNpc = openNpcId ? savedNpcs.find((n) => n.id === openNpcId) : null;

  const toggleCardCollapsed = useCallback(
    (questId: string) => {
      setCardCollapsedMap((prev) => ({ ...prev, [questId]: !prev[questId] }));
    },
    [setCardCollapsedMap],
  );

  /* ── Config: types / columns ── */

  const typeUsage = useMemo(() => {
    const m: Record<string, number> = {};
    state.quests.forEach((q) => {
      m[q.type] = (m[q.type] ?? 0) + 1;
    });
    return m;
  }, [state.quests]);

  const columnUsage = useMemo(() => {
    const m: Record<string, number> = {};
    state.quests.forEach((q) => {
      m[q.column] = (m[q.column] ?? 0) + 1;
    });
    return m;
  }, [state.quests]);

  const addTypeToDraft = () => {
    if (!configDraft) return;
    const existing = new Set(configDraft.types.map((t) => t.id));
    const id = uniqueSlug("nowy-typ", existing);
    setConfigDraft({
      ...configDraft,
      types: [...configDraft.types, { id, label: "Nowy typ", emoji: "📌", accent: "#64748b" }],
    });
  };

  const addColumnToDraft = () => {
    if (!configDraft) return;
    const existing = new Set(configDraft.columns.map((c) => c.id));
    const id = uniqueSlug("kolumna", existing);
    setConfigDraft({
      ...configDraft,
      columns: [...configDraft.columns, { id, label: "Nowa kolumna", color: "#6366f1" }],
    });
  };

  const removeTypeFromDraft = (id: string) => {
    if (!configDraft) return;
    if ((typeUsage[id] ?? 0) > 0) {
      toast.error("Nie można usunąć typu używanego przez wątki");
      return;
    }
    setConfigDraft({ ...configDraft, types: configDraft.types.filter((t) => t.id !== id) });
  };

  const removeColumnFromDraft = (id: string) => {
    if (!configDraft) return;
    if ((columnUsage[id] ?? 0) > 0) {
      toast.error("Nie można usunąć kolumny używanej przez wątki");
      return;
    }
    if (configDraft.columns.length <= 1) {
      toast.error("Potrzebna jest co najmniej jedna kolumna");
      return;
    }
    setConfigDraft({ ...configDraft, columns: configDraft.columns.filter((c) => c.id !== id) });
  };

  const saveConfigFromDraft = () => {
    if (!configDraft) return;
    const err = validateLayoutDraft(configDraft);
    if (err) {
      toast.error(err);
      return;
    }
    setLayout(configDraft);
    setConfigOpen(false);
    setConfigDraft(null);
  };

  const renderColumn = (col: QuestColumnConfig) => {
    const quests = questsByCol[col.id] ?? [];
    const collapsed = collapsedCols[col.id] ?? false;
    const chrome = columnChromeStyles(col.color);
    const headerStyle = columnHeaderStyles(col.color);

    return (
      <div
        key={col.id}
        className={cn(
          "flex flex-col rounded-lg border-0 transition-colors",
          dragOverCol === col.id && "ring-2 ring-primary",
        )}
        style={chrome}
        onDragOver={(e) => {
          if (!finePointer) return;
          e.preventDefault();
          setDragOverCol(col.id);
        }}
        onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
        onDrop={(e) => onDropToColumn(e, col.id)}
      >
        <button
          type="button"
          className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2 backdrop-blur-sm"
          style={headerStyle}
          onClick={() => setCollapsedCols((p) => ({ ...p, [col.id]: !p[col.id] }))}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span>{col.label}</span>
            <span className="font-normal opacity-80">· {quests.length}</span>
          </span>
          {collapsed ? <ChevronDown className="h-4 w-4 shrink-0 opacity-90" /> : <ChevronUp className="h-4 w-4 shrink-0 opacity-90" />}
        </button>
        {!collapsed && (
          <div className="flex min-h-[80px] flex-col gap-2 p-2">
            {quests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
                Brak wątków
              </div>
            ) : (
              quests.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  allQuests={state.quests}
                  typeMap={typeMap}
                  columns={layout.columns}
                  highlight={highlightId === q.id}
                  searchActive={!!search.trim()}
                  matchesSearch={matchesSearch(q)}
                  finePointer={finePointer}
                  bodyCollapsed={!!cardCollapsedMap[q.id]}
                  onToggleBodyCollapsed={() => toggleCardCollapsed(q.id)}
                  onUpdate={(patch) => updateQuest(q.id, patch)}
                  onDelete={() => deleteQuest(q.id)}
                  onMove={(c) => moveQuest(q.id, c)}
                  onJumpTo={jumpTo}
                  onOpenNpc={(id) => setOpenNpcId(id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-2"
            onClick={() => {
              setConfigDraft(cloneLayout(layout));
              setConfigOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" />
            Układ i kolory
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Szukaj…"
                className="h-10 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  setSearch("");
                  setSearchOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setSearchOpen(true)} title="Szukaj">
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" className="h-10 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nowy wątek
          </Button>
        </div>
      </div>

      {totalQuests === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-2 text-3xl">📋</div>
            <p className="text-sm text-muted-foreground">
              Tablica wątków jest pusta.
              <br />
              Kliknij <strong>+ Nowy wątek</strong> aby zacząć.
            </p>
          </CardContent>
        </Card>
      )}

      {totalQuests > 0 && (
        <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-3 min-[1300px]:grid-cols-4 min-[1600px]:grid-cols-5">
          {layout.columns.map(renderColumn)}
        </div>
      )}

      {/* Layout config */}
      <Dialog
        open={configOpen}
        onOpenChange={(open) => {
          setConfigOpen(open);
          if (!open) setConfigDraft(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-md gap-4 overflow-y-auto rounded-xl p-5 sm:max-w-lg">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Układ tablicy</DialogTitle>
            <p className="text-xs font-normal text-muted-foreground">Typy i kolory kolumn. Zapis dotyczy całej konfiguracji.</p>
          </DialogHeader>
          {configDraft && (
            <div className="space-y-6 text-sm">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typy wątków</h3>
                  <Button type="button" size="sm" variant="secondary" onClick={addTypeToDraft}>
                    Dodaj typ
                  </Button>
                </div>
                <div className="space-y-2">
                  {configDraft.types.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 p-2.5">
                      <EmojiPickerButton
                        emoji={t.emoji}
                        onPick={(e) =>
                          setConfigDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  types: d.types.map((x) => (x.id === t.id ? { ...x, emoji: e } : x)),
                                }
                              : d,
                          )
                        }
                      />
                      <Input
                        className="h-9 min-w-[8rem] flex-1 text-xs"
                        value={t.label}
                        onChange={(e) =>
                          setConfigDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  types: d.types.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)),
                                }
                              : d,
                          )
                        }
                      />
                      <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                        Kolor
                        <input
                          type="color"
                          className="h-8 w-10 cursor-pointer rounded border border-input bg-background p-0"
                          value={ensureHexColor(t.accent, "#64748b")}
                          onChange={(e) =>
                            setConfigDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    types: d.types.map((x) => (x.id === t.id ? { ...x, accent: e.target.value } : x)),
                                  }
                                : d,
                            )
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-8 text-destructive hover:text-destructive"
                        disabled={(typeUsage[t.id] ?? 0) > 0}
                        title={(typeUsage[t.id] ?? 0) > 0 ? "Usuń dopiero gdy żaden wątek nie ma tego typu" : "Usuń typ"}
                        onClick={() => removeTypeFromDraft(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kolumny</h3>
                  <Button type="button" size="sm" variant="secondary" onClick={addColumnToDraft}>
                    Dodaj kolumnę
                  </Button>
                </div>
                <div className="space-y-2">
                  {configDraft.columns.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 p-2.5">
                      <Input
                        className="h-9 min-w-[8rem] flex-1 text-xs font-medium"
                        value={c.label}
                        onChange={(e) =>
                          setConfigDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  columns: d.columns.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)),
                                }
                              : d,
                          )
                        }
                      />
                      <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                        Kolor
                        <input
                          type="color"
                          className="h-8 w-10 cursor-pointer rounded border border-input bg-background p-0"
                          value={ensureHexColor(c.color, "#6b7280")}
                          onChange={(e) =>
                            setConfigDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    columns: d.columns.map((x) => (x.id === c.id ? { ...x, color: e.target.value } : x)),
                                  }
                                : d,
                            )
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-8 text-destructive hover:text-destructive"
                        disabled={(columnUsage[c.id] ?? 0) > 0 || configDraft.columns.length <= 1}
                        title={
                          (columnUsage[c.id] ?? 0) > 0
                            ? "Usuń dopiero gdy żaden wątek nie jest w tej kolumnie"
                            : configDraft.columns.length <= 1
                              ? "Zostaw co najmniej jedną kolumnę"
                              : "Usuń kolumnę"
                        }
                        onClick={() => removeColumnFromDraft(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfigOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={saveConfigFromDraft} disabled={!configDraft}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy wątek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Typ wątku</label>
              <div className="grid grid-cols-4 gap-1.5">
                {layout.types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraftType(t.id)}
                    className={cn(
                      "flex min-h-[60px] flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition-colors",
                      draftType === t.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tytuł *</label>
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="np. Zaginięcie kupca…"
                onKeyDown={(e) => e.key === "Enter" && createQuest()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Kolumna startowa</label>
              <div className="grid grid-cols-2 gap-1.5">
                {layout.columns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDraftCol(c.id)}
                    className={cn(
                      "flex min-h-[40px] items-center gap-1.5 rounded-md border px-2 py-2 text-xs transition-colors",
                      draftCol === c.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notatki (opcjonalne)</label>
              <Textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Pierwsze przemyślenia…"
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={createQuest}>Utwórz wątek</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NPC drawer */}
      <Sheet open={!!openNpcId} onOpenChange={(v) => !v && setOpenNpcId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{openNpc ? getNpcDisplayName(openNpc) : "NPC"}</SheetTitle>
          </SheetHeader>
          {openNpc ? (
            <NpcQuickPreview npc={openNpc} />
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">NPC nie znaleziony</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
