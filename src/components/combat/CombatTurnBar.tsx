import { ChevronLeft, Eye, EyeOff, RotateCcw, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CombatTurnBarProps {
  combatRound: number;
  combatTurn: number;
  participantCount: number;
  showDead: boolean;
  onToggleShowDead: () => void;
  onReset: () => void;
  onPrevTurn: () => void;
  onNextTurn: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}

export function CombatTurnBar({
  combatRound,
  combatTurn,
  participantCount,
  showDead,
  onToggleShowDead,
  onReset,
  onPrevTurn,
  onNextTurn,
  prevDisabled,
  nextDisabled,
}: CombatTurnBarProps) {
  const turnLabel =
    participantCount > 0
      ? `${Math.min(combatTurn + 1, participantCount)}/${participantCount}`
      : "—";

  return (
    <div className="flex items-stretch gap-2 rounded-lg border border-border bg-card p-1.5">
      <Button
        type="button"
        variant="ghost"
        className="h-12 w-12 shrink-0 px-0"
        onClick={onPrevTurn}
        disabled={prevDisabled}
        title="Poprzednia tura"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Poprzednia</span>
      </Button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 border-x border-border/60 px-2">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Runda</span>
          <span className="font-mono text-xl font-bold leading-none text-primary">{combatRound}</span>
          <span className="text-xs text-muted-foreground">· tura {turnLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={onToggleShowDead}
            title={showDead ? "Ukryj poległych" : "Pokaż poległych"}
          >
            {showDead ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onReset} title="Reset rund i tur">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className={cn("h-12 shrink-0 gap-2 px-4 text-sm font-semibold sm:px-5")}
        onClick={onNextTurn}
        disabled={nextDisabled}
      >
        <Swords className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">Dalej</span>
        <span className="hidden sm:inline">Następna tura</span>
      </Button>
    </div>
  );
}
