import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import { cn } from "@/lib/utils";

interface CombatRosterPillProps {
  name: string;
  subtitle?: string;
  ww: number;
  hp: number;
  armor: number;
  weapon?: string;
  variant: "npc" | "hero";
  dragMime: string;
  entityId: string;
  finePointer: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onAddToCombat: () => void;
}

export function CombatRosterPill({
  name,
  subtitle,
  ww,
  hp,
  armor,
  weapon,
  variant,
  dragMime,
  entityId,
  finePointer,
  isDragging,
  onDragStart,
  onDragEnd,
  onAddToCombat,
}: CombatRosterPillProps) {
  return (
    <div
      draggable={finePointer}
      onDragStart={(e) => {
        if (!finePointer) return;
        e.dataTransfer.setData(dragMime, entityId);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-lg border bg-card px-2.5 py-2 transition-[opacity,box-shadow,border-color] duration-200",
        variant === "npc" ? "border-destructive/25" : "border-primary/25",
        finePointer && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-45 ring-2 ring-primary/30 shadow-md",
      )}
    >
      <div className="flex items-center gap-1.5">
        {finePointer && (
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name}</span>
            {subtitle && (
              <span className="block truncate text-[10px] text-muted-foreground">{subtitle}</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 px-2 text-[10px]"
            onClick={(ev) => {
              ev.stopPropagation();
              onAddToCombat();
            }}
          >
            + Do walki
          </Button>
        </div>
      </div>
      <div className={cn("mt-1 space-y-0.5", finePointer && "pl-5.5")}>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span>
            <StatAbbrWithTooltip statKey="ww" className="text-muted-foreground">
              WW
            </StatAbbrWithTooltip>{" "}
            <span className="font-bold text-foreground">{ww}</span>
          </span>
          <span>
            <StatAbbrWithTooltip statKey="pż" className="text-muted-foreground">
              PŻ
            </StatAbbrWithTooltip>{" "}
            <span className="font-bold text-foreground">{hp}</span>
          </span>
          <span>
            <StatAbbrWithTooltip statKey="pnc" className="text-muted-foreground">
              Pnc
            </StatAbbrWithTooltip>{" "}
            <span className="font-bold text-foreground">{armor}</span>
          </span>
        </div>
        {weapon && (
          <p className="line-clamp-1 text-[10px] text-muted-foreground">{weapon}</p>
        )}
      </div>
    </div>
  );
}
