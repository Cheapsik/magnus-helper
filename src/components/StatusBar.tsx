import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Timer as TimerIcon, Volume2, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAmbient } from "@/context/AmbientContext";
import { useScene } from "@/context/SceneContext";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RPG_TIMERS_STORAGE_KEY } from "@/lib/rpgTimersStorage";

interface TimerLite { id: string; label: string; mode: "stopwatch" | "countdown"; countdownSet: number; }

export default function StatusBar() {
  const navigate = useNavigate();
  const { combatants, combatRound, combatTurn } = useApp();
  const { playingLayers } = useAmbient();
  const { activeScene } = useScene();
  const [timers] = useLocalStorage<TimerLite[]>(RPG_TIMERS_STORAGE_KEY, []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const enemyAlive = combatants.filter((c) => c.isEnemy && c.hp.current > 0).length;
  const combatActive = enemyAlive > 0 && combatants.length > 1;
  const currentName = combatActive ? combatants[combatTurn % combatants.length]?.name : null;


    const firstTimer = timers[0];

  const sep = (
    <span className="opacity-30 mx-2 select-none">·</span>
  );

  const sectionsEmpty = !combatActive && !firstTimer;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-[100] flex shrink-0 items-center justify-center border-t border-border bg-card/95 px-3 text-[length:--fs-meta] text-muted-foreground backdrop-blur-md md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:backdrop-blur-none"
      style={{ height: 28 }}
    >
      <div className="hidden md:flex items-center w-full max-w-6xl mx-auto justify-center">
        {firstTimer && (
          <span className="flex items-center gap-1.5">
            <TimerIcon className="h-3 w-3" /> {firstTimer.label || "Timer"}
          </span>
        )}
        {firstTimer && combatActive && sep}
        {combatActive && (
          <button
            onClick={() => navigate("/combat")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Swords className="h-3 w-3" /> Runda {combatRound} · {currentName}
          </button>
        )}
        {activeScene && (
          <>
            <button
              onClick={() => navigate("/scena")}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              title="Otwórz Scenę"
            >
              <MapPin className="h-3 w-3" /> {activeScene.name}
            </button>
            {playingLayers.length > 0 && sep}
          </>
        )}
        {sectionsEmpty && !activeScene && playingLayers.length === 0 && <span className="opacity-50">Magnus</span>}
        {playingLayers.length > 0 && (() => {
          const count = playingLayers.length;
          let label: string;
          if (count === 1) label = playingLayers[0].name;
          else if (count === 2) label = `${playingLayers[0].name} · ${playingLayers[1].name}`;
          else label = `${count} warstw aktywnych`;
          return (
            <>
              {(combatActive || firstTimer) && sep}
              <button
                onClick={() => navigate("/ambient")}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
                title="Otwórz Ambient"
              >
                <span className={`eq-bars ${count >= 2 ? "multi" : ""}`} style={{ color: "hsl(var(--primary))" }}>
                  <span /><span /><span />
                </span>
                <span className="">{label}</span>
                <Volume2 className="h-3 w-3 opacity-60" />
              </button>
            </>
          );
        })()}
      </div>

      <div className="md:hidden flex items-center gap-2 w-full justify-center">
        {combatActive && <span>R{combatRound}</span>}
        {combatActive && firstTimer && sep}
        {firstTimer && <TimerIcon className="h-3 w-3 inline" />}
      </div>
      <span className="hidden">{tick}</span>
    </div>
  );
}
