import { Link } from "react-router-dom";
import { Dice5, Target, Swords, Gem, ArrowRight, Flame, Pin, Timer as TimerIcon, Pencil, ScrollText, ChevronRight, BookOpen, CircleDashed, Sword, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useScene } from "@/context/SceneContext";
import { cn } from "@/lib/utils";

/* ── Reading external (non-context) data from localStorage ── */

interface QuestLite { id: string; title: string; column: string; type: string; updatedAt: string; }
interface TimerLite { id: string; label: string; mode: "stopwatch" | "countdown"; countdownSet: number; }

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ── Health bar color ── */
function hpColor(pct: number): string {
  if (pct > 60) return "#4A7C59";
  if (pct >= 30) return "#A0892A";
  return "#8A1C1C";
}

interface LastRoll { type: string; result: number | string; label?: string; timestamp?: string; }

/* ── Section header (small, muted, sans) ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-sans uppercase tracking-[0.1em] text-muted-foreground/50 mb-2">
      {children}
    </div>
  );
}

/* ── Atmospheric empty state ── */
function AtmosphericEmpty({
  icon: Icon,
  text,
  linkTo,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <Icon className="h-8 w-8 text-foreground/30" />
      <p className="text-sm italic text-foreground/45 leading-snug">{text}</p>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="text-xs text-primary hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export default function Index() {
  const { character, combatants, combatRound, setCombatRound, combatTurn, setCombatTurn } = useApp();
  const { activeScene } = useScene();

  const [quests, setQuests] = useState<QuestLite[]>([]);
  const [timers, setTimers] = useState<TimerLite[]>([]);
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);

  useEffect(() => {
    const state = readJson<{ quests?: QuestLite[] }>("rpg_quests", {});
    setQuests(state.quests ?? []);
    setTimers(readJson<TimerLite[]>("rpg_timers", []));
    setLastRoll(readJson<LastRoll | null>("magnus_last_roll", null));
  }, []);

  /* Derived values */
  const hpPct = character.wounds.max > 0 ? Math.round((character.wounds.current / character.wounds.max) * 100) : 0;
  const activeQuests = quests
    .filter((q) => q.column !== "zamkniete")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const recentQuests = activeQuests.slice(0, 3);
  const hotCount = activeQuests.filter((q) => q.column === "gorace").length;
  const enemyCount = combatants.filter((c) => c.isEnemy && c.hp.current > 0).length;
  const combatActive = enemyCount > 0 && combatants.length > 1;
  const currentTurnName = combatActive ? combatants[combatTurn % combatants.length]?.name : null;
  const inlineStats = character.stats.slice(0, 5); // WW, US, S, Wt, Zr

  const QUICK_ROWS = [
    { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
    { path: "/tests", label: "Test procentowy", icon: Target },
    { path: "/combat", label: "Tracker walki", icon: Swords },
    { path: "/loot", label: "Generuj łup", icon: Gem },
  ];

  const nextTurn = () => {
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    if (sorted.length === 0) return;
    if (combatTurn >= sorted.length - 1) {
      setCombatTurn(0);
      setCombatRound((r) => r + 1);
    } else {
      setCombatTurn((t) => t + 1);
    }
  };

  const stagger = (i: number) => ({ animationDelay: `${i * 60}ms` });

  return (
    <div className="space-y-6">
      {/* ─────── HERO ROW ─────── */}
      <section className="border border-border bg-card/40 panel-enter" style={stagger(0)}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left — Active character */}
          <div className="px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-1">Aktywna postać</div>
            <Link to="/character" className="block group">
              <div className="text-xl text-foreground leading-tight group-hover:text-primary transition-colors">
                {character.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {character.race} · {character.career}
              </div>
            </Link>
          </div>

          {/* Middle — Vitals */}
          <div className="px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-2">Witalność</div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="font-bold leading-none" style={{ fontSize: 22, color: hpColor(hpPct) }}>
                  {character.wounds.current} / {character.wounds.max}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Żyw.</span>
              </div>
              <div className="h-2 bg-secondary/40 border border-border overflow-hidden rounded-none">
                <div
                  className="h-full transition-all duration-300 ease-out"
                  style={{ width: `${hpPct}%`, background: hpColor(hpPct) }}
                />
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-muted-foreground">PO <span className="text-foreground font-mono">{character.fatePoints}</span></span>
                <span className="text-border">·</span>
                <span className="text-muted-foreground">PP <span className="text-foreground font-mono">{character.fatePoints}</span></span>
              </div>
            </div>
          </div>

          {/* Right — Session status */}
          <div className="px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-2">Aktywna sesja</div>
            <div className="space-y-1.5 text-xs">
              {activeScene && (
                <Link to="/scena" className="flex items-center justify-between group">
                  <span className="flex items-center gap-1.5 text-primary">
                    <MapPin className="h-3.5 w-3.5" /> {activeScene.name}
                  </span>
                  <span className="font-mono text-primary/80 text-[10px]">SCENA</span>
                </Link>
              )}
              {activeQuests.length > 0 && (
                <Link to="/quests" className="flex items-center justify-between group">
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                    <ScrollText className="h-3.5 w-3.5" /> Wątki aktywne
                  </span>
                  <span className="font-mono text-foreground">{activeQuests.length}</span>
                </Link>
              )}
              {combatActive && (
                <Link to="/combat" className="flex items-center justify-between group">
                  <span className="flex items-center gap-1.5 text-destructive">
                    <Swords className="h-3.5 w-3.5" /> Walka trwa
                  </span>
                  <span className="font-mono text-destructive">R{combatRound}</span>
                </Link>
              )}
              {timers.length > 0 && (
                <Link to="/timers" className="flex items-center justify-between group">
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                    <TimerIcon className="h-3.5 w-3.5" /> Timery
                  </span>
                  <span className="font-mono text-foreground">{timers.length}</span>
                </Link>
              )}
              {!combatActive && !activeScene && timers.length === 0 && activeQuests.length === 0 && (
                <div className="text-muted-foreground/60 italic">Brak aktywności</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Last roll mini-panel */}
      {lastRoll ? (
        <section
          className="panel-enter border border-border bg-card/30 px-4 flex items-center gap-3"
          style={{ ...stagger(1), height: 44 }}
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">Ostatni rzut</span>
          <span className="text-border">·</span>
          <span className="text-sm text-foreground">
            <span className="font-mono text-muted-foreground">{lastRoll.type}</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="font-bold text-primary">{lastRoll.result}</span>
            {lastRoll.label && (
              <span className="ml-2 text-muted-foreground">· {lastRoll.label}</span>
            )}
          </span>
        </section>
      ) : (
        <section
          className="panel-enter border border-border bg-card/30 px-4 flex items-center gap-3"
          style={{ ...stagger(1), height: 44 }}
        >
          <CircleDashed className="h-4 w-4 text-foreground/30" />
          <span className="text-sm italic text-foreground/45">Kości milczą. Los wciąż nieznany.</span>
        </section>
      )}

      {/* ─────── DASHBOARD GRID ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Panel: Recent threads */}
        <section className="border border-border bg-card/30 p-5 panel-enter" style={stagger(2)}>
          <SectionLabel>Ostatnie wątki</SectionLabel>
          {recentQuests.length === 0 ? (
            <AtmosphericEmpty
              icon={BookOpen}
              text="Karty fabuły nie zostały jeszcze rozłożone…"
              linkTo="/quests"
              linkLabel="Rozpocznij pierwszy wątek"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentQuests.map((q) => (
                <li key={q.id}>
                  <Link
                    to="/quests"
                    className="flex items-center gap-2 py-2 group hover:text-primary transition-colors"
                  >
                    <span className="shrink-0">
                      {q.column === "gorace" ? (
                        <Flame className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Pin className="h-3.5 w-3.5 text-primary/70" />
                      )}
                    </span>
                    <span className="text-sm text-foreground group-hover:text-primary truncate">
                      {q.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/quests"
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            Wszystkie wątki <ArrowRight className="h-3 w-3" />
          </Link>
          {hotCount > 0 && (
            <span className="ml-2 text-[11px] text-destructive/80">· {hotCount} gorące</span>
          )}
        </section>

        {/* Panel: Quick rolls */}
        <section className="border border-border bg-card/30 p-5 panel-enter" style={stagger(3)}>
          <SectionLabel>Szybkie rzuty</SectionLabel>
          <ul className="divide-y divide-border/60">
            {QUICK_ROWS.map((row) => (
              <li key={row.path}>
                <Link
                  to={row.path}
                  className="flex items-center gap-3 h-10 px-1 group hover:text-primary transition-colors"
                >
                  <row.icon className="h-4 w-4 text-primary/80 shrink-0" />
                  <span className="text-sm text-foreground flex-1 group-hover:text-primary">{row.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Panel: Active character (rich) */}
        <section className="border border-border bg-card/30 p-5 panel-enter" style={stagger(4)}>
          <SectionLabel>Aktywna postać</SectionLabel>
          <Link to="/character" className="block group">
            <h3 className="text-2xl text-foreground group-hover:text-primary leading-tight">
              {character.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              {character.race} · {character.career}
            </p>
          </Link>

          {/* Big HP number */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-bold leading-none" style={{ fontSize: 22, color: hpColor(hpPct) }}>
              {character.wounds.current} / {character.wounds.max}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Żyw.</span>
          </div>
          <div className="h-2 bg-secondary/30 border border-border overflow-hidden mb-3 rounded-none">
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{ width: `${hpPct}%`, background: hpColor(hpPct) }}
            />
          </div>

          {/* Inline stat chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {inlineStats.map((s) => (
              <span
                key={s.abbr}
                className="text-[10px] px-1.5 py-0.5 border border-border bg-background/40 font-mono text-foreground"
                style={{ borderRadius: 4 }}
                title={s.label}
              >
                <span className="text-muted-foreground">{s.abbr}</span> {s.value}
              </span>
            ))}
          </div>

          {character.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {character.conditions.map((c) => (
                <span
                  key={c}
                  className="text-[10px] px-1.5 py-0.5 bg-destructive/15 text-destructive border border-destructive/30"
                  style={{ borderRadius: 4 }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <Link
            to="/character"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" /> Edytuj postać <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        {/* Panel: Session box (contextual) */}
        {(combatActive || timers.length > 0) ? (
          <section className="border border-border bg-card/30 p-5 md:col-span-2 xl:col-span-1 panel-enter" style={stagger(5)}>
            <SectionLabel>Skrzynka sesji</SectionLabel>
            {combatActive && (
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to="/combat" className="flex items-center gap-2 text-sm group min-w-0">
                    <Swords className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-foreground group-hover:text-primary truncate">
                      Runda {combatRound} · tura: <span className="font-medium">{currentTurnName}</span>
                    </span>
                  </Link>
                  <button
                    onClick={nextTurn}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-border text-foreground hover:text-primary hover:border-primary transition-colors"
                    style={{ borderRadius: 6 }}
                    title="Następna tura"
                  >
                    Następna tura <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {enemyCount} przeciwników na polu
                </div>
              </div>
            )}
            {timers.length > 0 && (
              <div className="space-y-1.5">
                {timers.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    to="/timers"
                    className="flex items-center justify-between text-xs group"
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                      <TimerIcon className="h-3.5 w-3.5" />
                      {t.label || "Timer"}
                    </span>
                    <span className="font-mono text-foreground/80">
                      {t.mode === "countdown" ? `${Math.round(t.countdownSet / 60)} min` : "stoper"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="border border-border bg-card/30 p-5 md:col-span-2 xl:col-span-1 panel-enter" style={stagger(5)}>
            <SectionLabel>Skrzynka sesji</SectionLabel>
            <AtmosphericEmpty
              icon={Sword}
              text="Cisza przed burzą. Walka jeszcze nie trwa."
              linkTo="/combat"
              linkLabel="Otwórz Tracker walki"
            />
          </section>
        )}
      </div>
    </div>
  );
}
