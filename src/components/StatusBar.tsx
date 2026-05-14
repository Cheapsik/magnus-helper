import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Timer as TimerIcon, Volume2, User, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAmbient } from "@/context/AmbientContext";
import { useScene } from "@/context/SceneContext";
import { cn } from "@/lib/utils";

function hpTextClass(pct: number): string {
  if (pct > 60) return "text-success";
  if (pct >= 30) return "text-primary";
  return "text-destructive";
}

interface TimerLite { id: string; label: string; mode: "stopwatch" | "countdown"; countdownSet: number; }

export default function StatusBar() {
  const navigate = useNavigate();
  const { character, combatants, combatRound, combatTurn } = useApp();
  const { playingLayers } = useAmbient();
  const { activeScene } = useScene();
  const [timers, setTimers] = useState<TimerLite[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("rpg_timers");
        setTimers(raw ? JSON.parse(raw) : []);
      } catch { setTimers([]); }
    };
    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(i); };
  }, []);

  const enemyAlive = combatants.filter((c) => c.isEnemy && c.hp.current > 0).length;
  const combatActive = enemyAlive > 0 && combatants.length > 1;
  const currentName = combatActive ? combatants[combatTurn % combatants.length]?.name : null;

  const hpCur = character?.wounds?.current ?? 0;
  const hpMax = character?.wounds?.max ?? 0;
  const hpPct = hpMax > 0 ? (hpCur / hpMax) * 100 : 0;
  const hasCharacter = !!character?.name;

  // First active countdown timer (display its set time as fallback)
  const firstTimer = timers[0];

  const sep = (
    <span className="opacity-30 mx-2 select-none">·</span>
  );

  const sectionsEmpty = !combatActive && !firstTimer;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-[100] flex shrink-0 items-center justify-center border-t border-border bg-card/95 px-3 text-[10px] tracking-[0.08em] text-muted-foreground backdrop-blur-md md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:backdrop-blur-none"
      style={{ height: 28 }}
    >
      <div className="hidden md:flex items-center w-full max-w-6xl mx-auto justify-center">
        {firstTimer && (
          <span className="flex items-center gap-1.5">
            <TimerIcon className="h-3 w-3" /> {firstTimer.label || "Timer"}
          </span>
        )}
        {firstTimer && (combatActive || hasCharacter) && sep}
        {combatActive && (
          <button
            onClick={() => navigate("/combat")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Swords className="h-3 w-3" /> RUNDA {combatRound} · {currentName?.toUpperCase()}
          </button>
        )}
        {combatActive && hasCharacter && sep}
        {activeScene && (
          <>
            <button
              onClick={() => navigate("/scena")}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              title="Otwórz Scenę"
            >
              <MapPin className="h-3 w-3" /> {activeScene.name.toUpperCase()}
            </button>
            {(hasCharacter || playingLayers.length > 0) && sep}
          </>
        )}
        {hasCharacter ? (
          <span className="flex items-center gap-1.5">
            <User className="h-3 w-3" /> {character.name.toUpperCase()} ·{" "}
            <span className={cn("font-bold", hpTextClass(hpPct))}>
              {hpCur}/{hpMax}
            </span>{" "}
            ŻYW
          </span>
        ) : sectionsEmpty && playingLayers.length === 0 ? (
          <span className="opacity-50">· MAGNUS ·</span>
        ) : null}
        {playingLayers.length > 0 && (() => {
          const count = playingLayers.length;
          let label: string;
          if (count === 1) label = playingLayers[0].name;
          else if (count === 2) label = `${playingLayers[0].name} · ${playingLayers[1].name}`;
          else label = `${count} warstw aktywnych`;
          return (
            <>
              {(combatActive || hasCharacter || firstTimer) && sep}
              <button
                onClick={() => navigate("/ambient")}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
                title="Otwórz Ambient"
              >
                <span className={`eq-bars ${count >= 2 ? "multi" : ""}`} style={{ color: "hsl(var(--primary))" }}>
                  <span /><span /><span />
                </span>
                <span className="uppercase tracking-[0.08em]">{label}</span>
                <Volume2 className="h-3 w-3 opacity-60" />
              </button>
            </>
          );
        })()}
      </div>

      {/* Mobile compact */}
      <div className="md:hidden flex items-center gap-2 w-full justify-center">
        {hasCharacter && (
          <span className={cn("font-bold tabular-nums", hpTextClass(hpPct))}>{hpCur}/{hpMax}</span>
        )}
        {combatActive && <>{sep}<span>R{combatRound}</span></>}
        {firstTimer && <>{sep}<TimerIcon className="h-3 w-3 inline" /></>}
      </div>
      {/* hidden tick to silence lint */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
