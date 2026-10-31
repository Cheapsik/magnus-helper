import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROSTER_CARD_DRAG } from "@/lib/combatDrag";

interface CombatRosterPillProps {
  name: string;
  subtitle?: string;
  /** Main resource and additional values, as the card's roles declare them. */
  details: string[];
  enemy: boolean;
  dragKey: string;
  finePointer: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onAddToCombat: () => void;
}

export function CombatRosterPill({
  name,
  subtitle,
  details,
  enemy,
  dragKey,
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
        e.dataTransfer.setData(ROSTER_CARD_DRAG, dragKey);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-lg border bg-card px-2.5 py-2 transition-[opacity,box-shadow,border-color] duration-200",
        enemy ? "border-destructive/25" : "border-primary/25",
        finePointer && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-45 shadow-md ring-2 ring-primary/30",
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
            {subtitle && <span className="block truncate text-[12px] text-muted-foreground">{subtitle}</span>}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 px-2"
            onClick={(ev) => {
              ev.stopPropagation();
              onAddToCombat();
            }}
          >
            + Do walki
          </Button>
        </div>
      </div>
      {details.length > 0 && (
        <div className={cn("mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground", finePointer && "pl-5.5")}>
          {details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      )}
    </div>
  );
}
