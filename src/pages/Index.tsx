import { Link } from "react-router-dom";
import { Dice5, Target, Swords, Gem, Flame, Pin, Timer as TimerIcon, ScrollText, ChevronRight, CircleDashed, Sword, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useScene } from "@/context/SceneContext";
import { Button } from "@/components/ui/button";
import { useCardType, useCards } from "@/lib/cardStore";
import { cardTitle, getCardCombatStats } from "@/lib/cardSchema";
import { readJson } from "@/lib/storage";

interface QuestLite { id: string; title: string; column: string; type: string; updatedAt: string; }
interface TimerLite { id: string; label: string; mode: "stopwatch" | "countdown"; countdownSet: number; }

function hpColor(pct: number): string {
  if (pct > 60) return "#4A7C59";
  if (pct >= 30) return "#A0892A";
  return "#8A1C1C";
}

interface LastRoll { type: string; result: number | string; label?: string; timestamp?: string; }

export default function Index() {
  const { combatants, combatRound, setCombatRound, combatTurn, setCombatTurn } = useApp();
  const heroCardType = useCardType("hero");
  const [heroes] = useCards("hero");
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

  const activeQuests = quests
    .filter((q) => q.column !== "zamkniete")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const recentQuests = activeQuests.slice(0, 3);
  const hotCount = activeQuests.filter((q) => q.column === "gorace").length;
  const enemyCount = combatants.filter((c) => c.isEnemy && c.resource.current > 0).length;
  const combatActive = enemyCount > 0 && combatants.length > 1;
  const currentTurnName = combatActive ? combatants[combatTurn % combatants.length]?.name : null;
  const QUICK_ROWS = [
    { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
    { path: "/tests", label: "Test", icon: Target },
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

  return (
    <div className="space-y-3">
      {/* The cue strip. Whose turn it is, is the one thing worth shouting. */}
      {combatActive ? (
        <section className="live-marker flex items-center gap-4 rounded-[--radius] bg-card pl-4 pr-2 py-2.5">
          <Link to="/combat" className="min-w-0 flex-1 group">
            <div className="flex items-baseline gap-2">
              <span className="readout text-[length:--fs-section] truncate group-hover:text-primary transition-colors">
                {currentTurnName}
              </span>
              <span className="field-label">na turze</span>
            </div>
            <div className="field-label mt-0.5">
              Runda {combatRound} · {enemyCount} przeciwników na polu
            </div>
          </Link>
          <Button size="sm" variant="secondary" onClick={nextTurn}>
            Następna tura
            <ChevronRight className="h-3 w-3" />
          </Button>
        </section>
      ) : (
        <section className="flex items-center gap-2.5 rounded-[--radius] bg-card/60 px-4 py-2.5">
          <Sword className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[length:--fs-sm] text-muted-foreground">Walka nie trwa.</span>
          <Link to="/combat" className="text-[length:--fs-sm] text-primary hover:underline">
            Otwórz tracker
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {/* Party state: the numbers a GM reads without stopping the table. */}
          <section className="panel p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[length:--fs-sm] font-medium">Drużyna</h2>
              <Link to="/heroes" className="field-label hover:text-primary transition-colors">
                {heroes.length > 0 ? `Wszyscy (${heroes.length})` : "Dodaj bohatera"}
              </Link>
            </div>
            {heroes.length === 0 ? (
              <p className="text-[length:--fs-meta] text-muted-foreground">Brak bohaterów w tej kampanii.</p>
            ) : (
              <ul className="divide-y divide-border">
                {heroes.slice(0, 6).map((hero) => {
                  const resource = getCardCombatStats(heroCardType, hero.values).resource;
                  const pct = resource && resource.max > 0 ? Math.round((resource.current / resource.max) * 100) : 0;
                  return (
                    <li key={hero.id} className="flex items-center gap-3 py-1.5">
                      <Link to="/heroes" className="min-w-0 flex-1 truncate text-[length:--fs-sm] hover:text-primary transition-colors">
                        {cardTitle(hero)}
                      </Link>
                      {resource && (
                        <>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full" style={{ width: `${pct}%`, background: hpColor(pct) }} />
                          </div>
                          <span className="readout w-14 text-right text-[length:--fs-meta]" style={{ color: hpColor(pct) }}>
                            {resource.current}/{resource.max}
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Threads, as a list rather than a card per item. */}
          <section className="panel p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[length:--fs-sm] font-medium">Wątki</h2>
              <Link to="/quests" className="field-label hover:text-primary transition-colors">
                {activeQuests.length > 0 ? `Wszystkie (${activeQuests.length})` : "Otwórz"}
              </Link>
            </div>
            {recentQuests.length === 0 ? (
              <p className="py-3 text-[length:--fs-sm] text-muted-foreground">
                Nic nie jest w toku.{" "}
                <Link to="/quests" className="text-primary hover:underline">Rozpocznij pierwszy wątek</Link>.
              </p>
            ) : (
              <ul className="-mx-2">
                {recentQuests.map((quest) => (
                  <li key={quest.id}>
                    <Link
                      to="/quests"
                      className="flex items-center gap-2 rounded-[--radius] px-2 py-1.5 hover:bg-secondary transition-colors"
                    >
                      {quest.column === "gorace" ? (
                        <Flame className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      ) : (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className="truncate text-[length:--fs-sm]">{quest.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {hotCount > 0 && (
              <p className="field-label mt-2">{hotCount} gorące</p>
            )}
          </section>
        </div>

        <div className="space-y-3">
          {/* Quick actions belong under the thumb, not in a full-width stack. */}
          <section className="panel p-4">
            <h2 className="mb-2 text-[length:--fs-sm] font-medium">Szybkie akcje</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ROWS.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex h-[--h-control-lg] items-center gap-2 rounded-[--radius] bg-secondary px-2.5 text-[length:--fs-sm] hover:bg-accent hover:text-primary transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="mb-2 text-[length:--fs-sm] font-medium">Sesja</h2>
            <dl className="space-y-1.5">
              <SessionRow to="/scena" icon={MapPin} label="Scena" value={activeScene?.name ?? "—"} />
              <SessionRow to="/quests" icon={ScrollText} label="Wątki" value={String(activeQuests.length)} />
              <SessionRow
                to="/timers"
                icon={TimerIcon}
                label="Timery"
                value={timers.length > 0 ? String(timers.length) : "—"}
              />
              <SessionRow
                to="/dice"
                icon={lastRoll ? Dice5 : CircleDashed}
                label="Ostatni rzut"
                value={lastRoll ? `${lastRoll.type} → ${lastRoll.result}` : "—"}
              />
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <dt className="text-[length:--fs-sm] text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </dt>
      <dd className="ml-auto truncate text-[length:--fs-sm] text-foreground">{value}</dd>
    </Link>
  );
}
