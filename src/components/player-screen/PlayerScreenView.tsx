import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getActiveFight } from "@/lib/combatSessions";
import { segmentPath, useClocks } from "@/lib/clocks";
import { toPlayerInitiative, usePlayerScreen } from "@/lib/playerScreen";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

/**
 * The player-facing view, shared by the second window and the GM's inline
 * preview. Always dark, independent of the app theme, since it targets a TV.
 * `compact` scales the type down for the preview box.
 */
export function PlayerScreenView({ compact = false }: { compact?: boolean }) {
  const [screen] = usePlayerScreen();
  const { combatSessions } = useApp();
  const [clocks] = useClocks();

  const initiative = useMemo(
    () => toPlayerInitiative(getActiveFight(combatSessions), screen.hideEnemyResources),
    [combatSessions, screen.hideEnemyResources],
  );
  const visibleClocks = clocks.filter((c) => c.visibleToPlayers);

  const showInitiative = screen.showInitiative && initiative.rows.length > 0;
  const showClocks = screen.showClocks && visibleClocks.length > 0;
  const handout = screen.handout;
  const empty = screen.blank || (!showInitiative && !showClocks && !handout);

  return (
    <div
      className={cn(
        "bg-neutral-950 text-neutral-100 w-full h-full overflow-auto",
        compact ? "text-xs p-3" : "text-2xl md:text-3xl p-8 md:p-12",
      )}
    >
      {empty ? (
        <div className="h-full flex items-center justify-center">
          <Logo className={cn("opacity-60", compact ? "h-12 w-12" : "h-40 w-40")} />
        </div>
      ) : (
        <div className={cn("flex flex-col lg:flex-row h-full", compact ? "gap-3" : "gap-10")}>
          {handout && (
            <section className="flex-1 min-w-0 flex flex-col items-center justify-center text-center gap-4">
              {handout.title && (
                <h1 className={cn("font-bold", compact ? "text-base" : "text-5xl md:text-6xl")}>{handout.title}</h1>
              )}
              {handout.image && (
                <img
                  src={handout.image}
                  alt={handout.title}
                  className={cn("object-contain rounded-lg", compact ? "max-h-32" : "max-h-[65vh] max-w-full")}
                />
              )}
              {handout.text && <p className="whitespace-pre-wrap leading-relaxed max-w-4xl">{handout.text}</p>}
            </section>
          )}

          {(showInitiative || showClocks) && (
            <aside className={cn("flex flex-col", compact ? "gap-3" : "gap-10", handout ? "lg:w-[34%]" : "flex-1")}>
              {showInitiative && (
                <section>
                  <h2 className={cn("uppercase tracking-widest text-neutral-400", compact ? "mb-1" : "text-xl mb-4")}>
                    {initiative.fightName} · runda {initiative.round}
                  </h2>
                  <ol className={cn("flex flex-col", compact ? "gap-1" : "gap-3")}>
                    {initiative.rows.map((row) => (
                      <li
                        key={row.id}
                        aria-current={row.active ? "step" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-lg border",
                          compact ? "px-2 py-1" : "px-6 py-4",
                          row.active ? "border-amber-400 bg-amber-400/15 font-bold" : "border-neutral-800",
                          row.out && "opacity-40 line-through",
                        )}
                      >
                        <span className={row.isEnemy ? "text-red-300" : undefined}>
                          {row.active && "▶ "}
                          {row.name}
                        </span>
                        {row.resource && (
                          <span className="tabular-nums text-neutral-300">
                            {row.resource.current}/{row.resource.max}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {showClocks && (
                <section className={cn("flex flex-wrap", compact ? "gap-3" : "gap-8")}>
                  {visibleClocks.map((clock) => (
                    <figure key={clock.id} className="flex flex-col items-center gap-2">
                      <svg
                        viewBox="0 0 100 100"
                        className={compact ? "h-12 w-12" : "h-32 w-32"}
                        role="img"
                        aria-label={`${clock.name}: ${clock.filled}/${clock.segments}`}
                      >
                        {Array.from({ length: clock.segments }, (_, i) => (
                          <path
                            key={i}
                            d={segmentPath(i, clock.segments, 48, 50, 50)}
                            className={i < clock.filled ? "fill-amber-400" : "fill-neutral-800"}
                            stroke="#0a0a0a"
                            strokeWidth={2}
                          />
                        ))}
                      </svg>
                      <figcaption className="text-center">{clock.name}</figcaption>
                    </figure>
                  ))}
                </section>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
