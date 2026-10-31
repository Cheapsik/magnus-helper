import { Link } from "react-router-dom";
import { Flame, Pin, ChevronRight, Sword } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useCardType, useCards } from "@/lib/cardStore";
import { cardTitle, getCardCombatStats } from "@/lib/cardSchema";
import { readJson } from "@/lib/storage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  SECRETS_KEY, prepForSession, reviveSecrets, reviveSessionPreps, secretName, splitSecretsForSession,
  type Secret, type SessionPrepMap,
} from "@/lib/secrets";
import { cn } from "@/lib/utils";

interface QuestLite { id: string; title: string; column: string; type: string; updatedAt: string; }

function hpColor(pct: number): string {
  if (pct > 60) return "hsl(var(--success))";
  if (pct >= 30) return "hsl(var(--primary))";
  return "hsl(var(--destructive))";
}

export default function Index() {
  const { combatants, combatRound, setCombatRound, combatTurn, setCombatTurn, noteSessionCatalog } = useApp();
  const heroCardType = useCardType("hero");
  const [heroes] = useCards("hero");
  const [secrets] = useLocalStorage<Secret[]>(SECRETS_KEY, [], { revive: reviveSecrets });
  const [preps] = useLocalStorage<SessionPrepMap>("rpg_session_prep", {}, { revive: reviveSessionPreps });
  const session = noteSessionCatalog.sessions.find((x) => x.id === noteSessionCatalog.activeSessionId);
  const prep = session
    ? prepForSession(preps, noteSessionCatalog.sessions, session.id, secrets)
    : { strongStart: "", scenes: [], secretIds: [] };
  const readySecrets = session ? splitSecretsForSession(secrets, prep, session.id).ready : [];
  const statusesOf = (heroId: string) =>
    combatants.find((c) => c.card?.kind === "hero" && c.card.id === heroId)?.statuses ?? [];

  const [quests, setQuests] = useState<QuestLite[]>([]);

  useEffect(() => {
    const state = readJson<{ quests?: QuestLite[] }>("rpg_quests", {});
    setQuests(state.quests ?? []);
  }, []);

  const activeQuests = quests
    .filter((q) => q.column !== "zamkniete")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const recentQuests = activeQuests.slice(0, 3);
  const hotCount = activeQuests.filter((q) => q.column === "gorace").length;
  const enemyCount = combatants.filter((c) => c.isEnemy && c.resource.current > 0).length;
  const combatActive = enemyCount > 0 && combatants.length > 1;
  const currentTurnName = combatActive ? combatants[combatTurn % combatants.length]?.name : null;

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
                        {statusesOf(hero.id).length > 0 && (
                          <span className="ml-2 text-[length:--fs-meta] text-destructive">{statusesOf(hero.id).join(", ")}</span>
                        )}
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
          {/* Tonight's plan from Przygotowanie, so the GM does not open a second page to remember it. */}
          <section className="panel p-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="truncate text-[length:--fs-sm] font-medium">Dziś na sesji{session ? `: ${session.name}` : ""}</h2>
              <Link to="/prep" className="field-label shrink-0 hover:text-primary transition-colors">Przygotowanie</Link>
            </div>
            {!prep.strongStart && prep.scenes.length === 0 && readySecrets.length === 0 ? (
              <p className="text-[length:--fs-sm] text-muted-foreground">
                Nic jeszcze nie zaplanowano.{" "}
                <Link to="/prep" className="text-primary hover:underline">Zapisz mocny początek i sceny</Link>.
              </p>
            ) : (
              <div className="space-y-3 text-[length:--fs-sm]">
                {prep.strongStart && (
                  <div>
                    <div className="field-label mb-0.5">Mocny początek</div>
                    <p className="whitespace-pre-line">{prep.strongStart}</p>
                  </div>
                )}
                {prep.scenes.length > 0 && (
                  <div>
                    <div className="field-label mb-0.5">Sceny</div>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {prep.scenes.map((scene, i) => <li key={i}>{scene}</li>)}
                    </ul>
                  </div>
                )}
                {readySecrets.length > 0 && (
                  <div>
                    <div className="field-label mb-0.5">Sekrety do odkrycia</div>
                    <ul className="space-y-0.5">
                      {readySecrets.map((secret) => (
                        <li key={secret.id} className={cn(secret.revealedInSessionId && "text-muted-foreground line-through")}>
                          {secretName(secret)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
