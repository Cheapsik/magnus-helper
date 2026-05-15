import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Swords,
  Dices,
  Gem,
  Volume2,
  Timer as TimerIcon,
  ScrollText,
  Users,
  Backpack,
  BookOpen,
  Sparkles,
  Play,
  Square,
  Pause,
  MapPin,
  Tag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { useAmbient } from "@/context/AmbientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { rollDie } from "@/lib/dice";
import type { DiceRoll } from "@/lib/dice";
import { formatTimerMs } from "@/lib/rpgTimersStorage";
import { appendQuestToStorage, type QuestLayoutRaw } from "@/lib/gmAppendQuest";
import { useGmTimersMirror } from "@/hooks/useGmTimersMirror";

const SESSION_NOTES_KEY = "mg_session_notes";

const M_NAMES = [
  "Bartosz", "Dawid", "Jakub", "Kacper", "Maciej", "Michał", "Piotr", "Tomasz",
  "Wojciech", "Marcin", "Kamil", "Łukasz", "Adam", "Szymon", "Mateusz",
];
const F_NAMES = [
  "Anna", "Maria", "Katarzyna", "Magdalena", "Agnieszka", "Joanna", "Aleksandra",
  "Natalia", "Zofia", "Julia", "Emilia", "Hanna", "Weronika", "Marta", "Karolina",
];
const FANTASY_JOBS = [
  "kupiec", "kowal", "strażnik", "garncarz", "szewc", "rybak", "mysliwy", "zielarz",
  "paser", "bajarz", "sługa", "stajenny", "palacz", "bednarz", "złotnik", "akolita",
  "pielgrzym", "rzeźnik", "piwowar", "łazęba",
];
const NPC_TRAITS = [
  "gadatliwy", "skryty", "chciwy", "honorowy", "tchórzliwy", "zarozumiały", "ciekawski",
  "zgorzkniały", "łagodny", "podejrzliwy", "pracowity", "leniwy", "optymistyczny",
  "pesymista", "impulsywny", "ostrożny", "hojny", "złośliwy", "lojalny", "zdradziecki",
];

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomNpcLine(): string {
  const pool = Math.random() < 0.5 ? M_NAMES : F_NAMES;
  return `${pick(pool)}, ${pick(FANTASY_JOBS)} — ${pick(NPC_TRAITS)}`;
}

function buildDiceRoll(sides: number, value: number): DiceRoll {
  return {
    id: crypto.randomUUID(),
    label: `1k${sides}`,
    count: 1,
    sides,
    modifier: 0,
    results: [value],
    total: value,
    timestamp: Date.now(),
  };
}

function QuickActionTile({
  icon,
  label,
  onClick,
  className,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-4 text-center transition-colors",
        "hover:border-primary/50 hover:bg-primary/5 min-h-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden>
        {icon}
      </span>
      <span className="text-xs font-medium text-foreground leading-snug">{label}</span>
    </button>
  );
}

export default function GmToolboxPage() {
  const navigate = useNavigate();
  const {
    difficultyPresets,
    setDifficultyPresets,
    combatants,
    setCombatants,
    combatRound,
    setCombatRound,
    combatTurn,
    setCombatTurn,
    character,
    addRoll,
  } = useApp();

  const ambient = useAmbient();
  const { playingLayers, activeLayers, config, toggleSound, stopAll } = ambient;

  const { timers, gmTick, addTimer } = useGmTimersMirror();

  const [editingDiffIdx, setEditingDiffIdx] = useState<number | null>(null);
  const [diffDraft, setDiffDraft] = useState<{ labelPl: string; modifier: number }>({ labelPl: "", modifier: 0 });

  const [sessionNotes, setSessionNotes] = useState(() => {
    try {
      return localStorage.getItem(SESSION_NOTES_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [notesSaved, setNotesSaved] = useState(false);
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notesDebounce.current) clearTimeout(notesDebounce.current);
    notesDebounce.current = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_NOTES_KEY, sessionNotes);
        setNotesSaved(true);
        window.setTimeout(() => setNotesSaved(false), 2000);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      if (notesDebounce.current) clearTimeout(notesDebounce.current);
    };
  }, [sessionNotes]);

  const [diceOpen, setDiceOpen] = useState(false);
  const [diceSpin, setDiceSpin] = useState<number | null>(null);
  const [diceResult, setDiceResult] = useState<{ sides: number; value: number } | null>(null);
  const diceSpinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const runAnimatedRoll = useCallback(
    (sides: number) => {
      if (diceSpinTimer.current) clearInterval(diceSpinTimer.current);
      setDiceResult(null);
      const final = rollDie(sides);
      diceSpinTimer.current = setInterval(() => {
        setDiceSpin(rollDie(sides));
      }, 45);
      window.setTimeout(() => {
        if (diceSpinTimer.current) clearInterval(diceSpinTimer.current);
        diceSpinTimer.current = null;
        setDiceSpin(null);
        setDiceResult({ sides, value: final });
        addRoll(buildDiceRoll(sides, final));
      }, 500);
    },
    [addRoll],
  );

  useEffect(
    () => () => {
      if (diceSpinTimer.current) clearInterval(diceSpinTimer.current);
    },
    [],
  );

  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [timerDraft, setTimerDraft] = useState({
    label: "",
    mode: "countdown" as "stopwatch" | "countdown",
    mm: 5,
    ss: 0,
  });

  const [questModalOpen, setQuestModalOpen] = useState(false);
  const [questLayout, setQuestLayout] = useState<QuestLayoutRaw>({});
  const [questDraft, setQuestDraft] = useState({ title: "", notes: "", typeId: "", colId: "" });
  const [npcPopOpen, setNpcPopOpen] = useState(false);
  const [npcLine, setNpcLine] = useState("");

  const openQuestModal = () => {
    let layout: QuestLayoutRaw = {};
    try {
      const raw = localStorage.getItem("rpg_quests_layout");
      if (raw) layout = JSON.parse(raw) as QuestLayoutRaw;
    } catch {
      layout = {};
    }
    setQuestLayout(layout);
    const types = layout.types ?? [];
    const cols = layout.columns ?? [];
    setQuestDraft({
      title: "",
      notes: "",
      typeId: types.find((t) => t.id === "inne")?.id ?? types[0]?.id ?? "",
      colId: cols.find((c) => c.id === "aktywne")?.id ?? cols[0]?.id ?? "",
    });
    setQuestModalOpen(true);
  };

  const questTypes = questLayout.types?.length ? questLayout.types : [];
  const questCols = questLayout.columns?.length ? questLayout.columns : [];

  const startDiffEdit = (idx: number) => {
    setEditingDiffIdx(idx);
    setDiffDraft({ labelPl: difficultyPresets[idx].labelPl, modifier: difficultyPresets[idx].modifier });
  };

  const saveDiffEdit = () => {
    if (editingDiffIdx === null) return;
    setDifficultyPresets((prev) =>
      prev.map((d, i) => (i === editingDiffIdx ? { ...d, labelPl: diffDraft.labelPl, modifier: diffDraft.modifier } : d)),
    );
    setEditingDiffIdx(null);
  };

  const addDiffPreset = () => {
    setDifficultyPresets((prev) => [...prev, { label: `custom-${Date.now()}`, labelPl: "Nowy poziom", modifier: 0 }]);
  };

  const removeDiffPreset = (idx: number) => {
    setDifficultyPresets((prev) => prev.filter((_, i) => i !== idx));
  };

  const enemyAlive = combatants.filter((c) => c.isEnemy && c.hp.current > 0).length;
  const combatActive = enemyAlive > 0 && combatants.length > 1;
  const sorted = useMemo(() => [...combatants].sort((a, b) => b.initiative - a.initiative), [combatants]);
  const currentTurnName = combatActive ? sorted[combatTurn % sorted.length]?.name : null;

  const startFreshCombat = () => {
    setCombatants([]);
    setCombatRound(1);
    setCombatTurn(0);
    navigate("/combat");
    toast.success("Nowa walka — dodaj uczestników w trackerze");
  };

  const ambientMain = playingLayers[0] ?? activeLayers[0];
  const ambientLabel =
    playingLayers.length > 0
      ? playingLayers.length === 1
        ? playingLayers[0].name
        : `${playingLayers.length} warstw: ${playingLayers.map((s) => s.name).join(" · ")}`
      : activeLayers.length > 0
        ? activeLayers.map((s) => s.name).join(" · ")
        : null;

  const runningTimers = timers.filter((t) => t.running && !t.finished);

  const conditionRows = useMemo(() => {
    const rows: { key: string; title: string; detail: string; to: string }[] = [];
    if (character.conditions?.length) {
      rows.push({
        key: "pc",
        title: character.name?.trim() || "Postać",
        detail: character.conditions.join(" · "),
        to: "/conditions",
      });
    }
    combatants.forEach((c) => {
      if (c.statuses?.length) {
        rows.push({
          key: c.id,
          title: c.name,
          detail: c.statuses.join(" · "),
          to: "/conditions",
        });
      }
    });
    return rows;
  }, [character.conditions, character.name, combatants]);

  const healthy = conditionRows.length === 0;

  const handleCreateTimer = () => {
    const sec = timerDraft.mode === "countdown" ? timerDraft.mm * 60 + timerDraft.ss : 0;
    addTimer({
      label: timerDraft.label,
      mode: timerDraft.mode,
      countdownSec: timerDraft.mode === "countdown" ? Math.max(1, sec) : 60,
    });
    setTimerModalOpen(false);
    setTimerDraft({ label: "", mode: "countdown", mm: 5, ss: 0 });
    toast.success("Timer dodany");
  };

  const submitQuest = () => {
    const res = appendQuestToStorage({
      title: questDraft.title,
      notes: questDraft.notes,
      typeId: questDraft.typeId || undefined,
      columnId: questDraft.colId || undefined,
    });
    if (!res.ok) {
      toast.error("error" in res ? res.error : "Błąd");
      return;
    }
    setQuestModalOpen(false);
    setQuestDraft({ title: "", notes: "", typeId: "", colId: "" });
    toast.success("Wątek utworzony");
    navigate("/quests");
  };

  return (
    <div className="space-y-8 animate-fade-in pb-4">
      <div>
        <h1 className="font-app-brand text-lg font-bold text-foreground">Centrum dowodzenia sesji</h1>
        <p className="text-xs text-muted-foreground mt-1">Skróty, stan sesji i narzędzia MG w jednym miejscu.</p>
      </div>

      {/* SEKCJA 1 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Szybkie akcje</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          <QuickActionTile icon={<Swords className="h-5 w-5" />} label="Rozpocznij walkę" onClick={startFreshCombat} />
          <QuickActionTile icon={<Dices className="h-5 w-5" />} label="Rzut kością" onClick={() => { setDiceOpen(true); setDiceResult(null); setDiceSpin(null); }} />
          <QuickActionTile icon={<Gem className="h-5 w-5" />} label="Generuj łup" onClick={() => navigate("/loot")} />
          <QuickActionTile icon={<Volume2 className="h-5 w-5" />} label="Ambient" onClick={() => navigate("/ambient")} />
          <QuickActionTile icon={<MapPin className="h-5 w-5" />} label="Scena" onClick={() => navigate("/scena")} />
          <QuickActionTile icon={<TimerIcon className="h-5 w-5" />} label="Nowy timer" onClick={() => setTimerModalOpen(true)} />
          <QuickActionTile icon={<ScrollText className="h-5 w-5" />} label="Nowy wątek" onClick={openQuestModal} />
          <Popover
            open={npcPopOpen}
            onOpenChange={(o) => {
              setNpcPopOpen(o);
              if (o) setNpcLine(randomNpcLine());
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-4 text-center transition-colors min-h-[100px]",
                  "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden>
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-foreground leading-snug">Losuj NPC</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm" align="start">
              <p className="text-muted-foreground text-xs mb-2">Losowy NPC (tylko podgląd)</p>
              <p className="font-medium text-foreground leading-relaxed min-h-[3rem]">{npcLine}</p>
              <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => setNpcLine(randomNpcLine())}>
                Losuj ponownie
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      {/* SEKCJA 2 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stan sesji</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Walka */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                Aktywna walka
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {combatActive ? (
                <>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Runda <span className="font-mono text-foreground">{combatRound}</span> · uczestnicy:{" "}
                      <span className="text-foreground font-medium">{combatants.length}</span>
                    </div>
                    <div className="text-foreground font-medium">Tura: {currentTurnName}</div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/combat")}>
                    Otwórz tracker
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Brak aktywnej walki</p>
                  <Button size="sm" className="w-full gap-1" onClick={startFreshCombat}>
                    <Swords className="h-3.5 w-3.5" />
                    Rozpocznij
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ambient */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                Ambient
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {ambientLabel ? (
                <>
                  <p className="text-sm text-foreground leading-snug line-clamp-3">{ambientLabel}</p>
                  <div className="flex gap-2">
                    {ambientMain ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => {
                          const s = config.sounds.find((x) => x.id === ambientMain.id);
                          if (s) toggleSound(s);
                        }}
                      >
                        {playingLayers.some((s) => s.id === ambientMain.id) ? (
                          <>
                            <Pause className="h-3.5 w-3.5" /> Pauza
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> Wznów
                          </>
                        )}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => stopAll()}>
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={() => navigate("/ambient")}>
                    Moduł Ambient
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Brak ambientu</p>
                  <Button size="sm" className="w-full" onClick={() => navigate("/ambient")}>
                    Włącz
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timery */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TimerIcon className="h-4 w-4 text-primary" />
                Aktywne timery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {runningTimers.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">Brak aktywnych timerów</p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/timers")}>
                    Timery
                  </Button>
                </>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {runningTimers.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.label || "Timer"}</div>
                        <div className="font-mono text-muted-foreground">{formatTimerMs(t.displayMs)}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 shrink-0 text-[10px] px-2" onClick={() => gmTick(t.id)}>
                        Tick
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {runningTimers.length > 0 && (
                <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={() => navigate("/timers")}>
                  Wszystkie timery
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Stany */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Stany postaci
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {healthy ? (
                <p className="text-sm text-muted-foreground">Wszystkie postacie zdrowe</p>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {conditionRows.map((r) => (
                    <li key={r.key} className="text-xs border-b border-border/60 pb-2 last:border-0 last:pb-0">
                      <div className="font-medium text-foreground">{r.title}</div>
                      <div className="text-muted-foreground mt-0.5">{r.detail}</div>
                      <Link
                        to={r.to}
                        className="inline-block mt-1 text-[10px] uppercase tracking-wide text-primary hover:underline"
                      >
                        Moduł Stany →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => navigate("/conditions")}>
                Moduł Stany
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SEKCJA 3 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notatki MG (prywatne)</h2>
          {notesSaved && <span className="text-[10px] text-muted-foreground">Zapisano</span>}
        </div>
        <Textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Szybkie notatki tylko dla Ciebie — gracze tego nie widzą"
          className="min-h-[140px] text-sm resize-y bg-card/80 border-border"
        />
        <p className="text-[10px] text-muted-foreground">Autosave co ok. 3 s do pamięci przeglądarki.</p>
      </section>

      {/* SEKCJA 4 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poziomy trudności</label>
          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addDiffPreset}>
            <Plus className="h-3 w-3" />
            Dodaj
          </Button>
        </div>
        <div className="space-y-1">
          {difficultyPresets.map((d, idx) =>
            editingDiffIdx === idx ? (
              <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border">
                <Input
                  value={diffDraft.labelPl}
                  onChange={(e) => setDiffDraft({ ...diffDraft, labelPl: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
                <NumberInput
                  value={diffDraft.modifier}
                  onChange={(v) => setDiffDraft({ ...diffDraft, modifier: v })}
                  className="h-7 w-16 text-xs text-center"
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveDiffEdit}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingDiffIdx(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div key={idx} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-md bg-card border group">
                <span className="text-muted-foreground">{d.labelPl}</span>
                <div className="flex items-center gap-1">
                  <span
                    className={`font-bold ${d.modifier > 0 ? "text-success" : d.modifier < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {d.modifier > 0 ? `+${d.modifier}` : d.modifier}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startDiffEdit(idx)}
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    onClick={() => removeDiffPreset(idx)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* SEKCJA 5 */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zarządzanie</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
            <Link to="/npcs">
              <ScrollText className="h-4 w-4 shrink-0" />
              Zarządzaj NPC
            </Link>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/combat", { state: { combatTab: "gotowi" } })}>
            <Swords className="h-4 w-4 shrink-0" />
            Gotowi przeciwnicy
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
            <Link to="/heroes">
              <Users className="h-4 w-4 shrink-0" />
              Zarządzaj Bohaterami
            </Link>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
            <Link to="/inventory">
              <Backpack className="h-4 w-4 shrink-0" />
              Ekwipunek
            </Link>
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
            <Link to="/codex">
              <BookOpen className="h-4 w-4 shrink-0" />
              Baza wiedzy
            </Link>
          </Button>
        </div>
      </section>

      {/* Dice modal */}
      <Dialog open={diceOpen} onOpenChange={setDiceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dices className="h-5 w-5" />
              Szybki rzut
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 justify-center py-4">
            {DICE_SIDES.map((s) => (
              <Button key={s} variant="secondary" className="min-w-[52px]" onClick={() => runAnimatedRoll(s)}>
                k{s}
              </Button>
            ))}
          </div>
          <div className="min-h-[72px] flex flex-col items-center justify-center rounded-md border bg-muted/30">
            {diceSpin !== null && <span className="text-4xl font-mono font-bold animate-pulse tabular-nums">{diceSpin}</span>}
            {diceResult && diceSpin === null && (
              <div className="text-center space-y-1">
                <div className="text-xs text-muted-foreground">1k{diceResult.sides}</div>
                <div className="text-4xl font-mono font-bold text-primary tabular-nums">{diceResult.value}</div>
              </div>
            )}
            {!diceSpin && !diceResult && <span className="text-sm text-muted-foreground">Wybierz kość</span>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiceOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timer modal */}
      <Dialog open={timerModalOpen} onOpenChange={setTimerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nazwa (opcjonalnie)</label>
              <Input value={timerDraft.label} onChange={(e) => setTimerDraft((d) => ({ ...d, label: e.target.value }))} placeholder="np. Runda mgły" />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-medium min-h-[44px] transition-colors",
                  timerDraft.mode === "stopwatch" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
                onClick={() => setTimerDraft((d) => ({ ...d, mode: "stopwatch" }))}
              >
                Stoper
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-medium min-h-[44px] transition-colors",
                  timerDraft.mode === "countdown" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
                onClick={() => setTimerDraft((d) => ({ ...d, mode: "countdown" }))}
              >
                Minutnik
              </button>
            </div>
            {timerDraft.mode === "countdown" && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Minuty</label>
                  <NumberInput
                    value={timerDraft.mm}
                    onChange={(v) => setTimerDraft((d) => ({ ...d, mm: Math.max(0, v) }))}
                    className="h-9"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Sekundy</label>
                  <NumberInput
                    value={timerDraft.ss}
                    onChange={(v) => setTimerDraft((d) => ({ ...d, ss: Math.min(59, Math.max(0, v)) }))}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTimerModalOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateTimer}>Utwórz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quest modal */}
      <Dialog open={questModalOpen} onOpenChange={setQuestModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nowy wątek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {questTypes.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Typ wątku</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {questTypes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuestDraft((d) => ({ ...d, typeId: t.id }))}
                      className={cn(
                        "flex min-h-[56px] flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition-colors",
                        questDraft.typeId === t.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <span className="text-lg leading-none flex items-center justify-center min-h-[2.25rem]">
                      {t.emoji?.trim() ? (
                        <span className="leading-none">{t.emoji}</span>
                      ) : (
                        <Tag className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                      <span className="line-clamp-2 text-center">{t.label ?? t.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tytuł *</label>
              <Input
                value={questDraft.title}
                onChange={(e) => setQuestDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="np. Zaginięcie kupca…"
              />
            </div>
            {questCols.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Kolumna startowa</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {questCols.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setQuestDraft((d) => ({ ...d, colId: c.id }))}
                      className={cn(
                        "flex min-h-[40px] items-center gap-1.5 rounded-md border px-2 py-2 text-xs transition-colors",
                        questDraft.colId === c.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: c.color ?? "#6b7280" }}
                      />
                      {c.label ?? c.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notatki (opcjonalne)</label>
              <Textarea
                value={questDraft.notes}
                onChange={(e) => setQuestDraft((d) => ({ ...d, notes: e.target.value }))}
                className="min-h-[80px] text-sm"
                placeholder="Pierwsze przemyślenia…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuestModalOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={submitQuest}>Utwórz wątek</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
