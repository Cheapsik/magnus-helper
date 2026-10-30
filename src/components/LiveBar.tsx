import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Timer as TimerIcon, Music, MapPin, type LucideIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAmbient } from "@/context/AmbientContext";
import { useScene } from "@/context/SceneContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RPG_TIMERS_STORAGE_KEY, dataToRuntime, formatTimerMs, type TimerData } from "@/lib/rpgTimersStorage";
import { cn } from "@/lib/utils";

/**
 * What is happening at the table right now: the fight and whose turn it is, running timers,
 * the scene, the ambient. Shown only while something is live, so it is never decoration.
 */
export default function LiveBar() {
  const navigate = useNavigate();
  const { combatants, combatRound, combatTurn } = useApp();
  const { playingLayers } = useAmbient();
  const { activeScene } = useScene();
  const [timers] = useLocalStorage<TimerData[]>(RPG_TIMERS_STORAGE_KEY, []);
  const running = timers.map(dataToRuntime).filter((t) => t.running);
  const [, setTick] = useState(0);

  // Running timers count down here too; nothing to redraw otherwise.
  useEffect(() => {
    if (running.length === 0) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [running.length]);

  const enemyAlive = combatants.filter((c) => c.isEnemy && c.resource.current > 0).length;
  const combatActive = enemyAlive > 0 && combatants.length > 1;
  const current = combatActive ? combatants[combatTurn % combatants.length] : null;
  const ambient =
    playingLayers.length === 0 ? null : playingLayers.length === 1 ? playingLayers[0].name : `${playingLayers.length} warstwy dźwięku`;

  if (!current && running.length === 0 && !activeScene && !ambient) return null;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-[60] flex h-11 shrink-0 items-stretch overflow-x-auto border-t border-border bg-card/95 backdrop-blur-md md:relative md:bottom-auto md:z-auto md:h-10 md:backdrop-blur-none"
      aria-label="Na żywo"
    >
      <div className="flex min-w-max items-stretch divide-x divide-border px-1 md:px-3">
        {current && (
          <LiveItem icon={Swords} onClick={() => navigate("/combat")} title="Otwórz tracker walki" live>
            <span className="readout">Runda {combatRound}</span>
            <span className="text-muted-foreground">tura:</span>
            <span className="max-w-[12rem] truncate font-display text-[length:--fs-base] font-medium">{current.name}</span>
          </LiveItem>
        )}
        {running.map((t) => (
          <LiveItem key={t.id} icon={TimerIcon} onClick={() => navigate("/timers")} title="Otwórz timery">
            <span className="max-w-[10rem] truncate">{t.label || "Timer"}</span>
            <span className="readout">{formatTimerMs(t.displayMs)}</span>
          </LiveItem>
        ))}
        {activeScene && (
          <LiveItem icon={MapPin} onClick={() => navigate("/scena")} title="Otwórz scenę">
            <span className="max-w-[14rem] truncate">{activeScene.name}</span>
          </LiveItem>
        )}
        {ambient && (
          <LiveItem icon={Music} onClick={() => navigate("/ambient")} title="Otwórz ambient">
            <span className="max-w-[12rem] truncate">{ambient}</span>
          </LiveItem>
        )}
      </div>
    </div>
  );
}

function LiveItem({ icon: Icon, onClick, title, live, children }: {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-2 px-3 text-[length:--fs-sm] text-foreground transition-colors hover:bg-secondary",
        live && "live-marker",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", live ? "text-destructive" : "text-muted-foreground")} aria-hidden />
      {children}
    </button>
  );
}
