import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapNodeData } from "../types";
import { useRelationsMapActions } from "../context/RelationsMapContext";

function EntityNodeComponent({ data, id }: NodeProps) {
  const d = data as MapNodeData;
  const { onOpenDetail, onStartQuickLink } = useRelationsMapActions();
  const isNpc = d.kind === "npc";

  return (
    <div
      className={cn(
        "w-[158px] border bg-card shadow-md transition-all relative",
        d.missing
          ? "border-destructive/60"
          : d.selected
            ? "border-primary ring-2 ring-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
            : d.highlighted
              ? "border-primary/70"
              : "border-border hover:border-primary/50",
        d.dimmed && "opacity-15 pointer-events-none",
        !d.dimmed && "opacity-100"
      )}
      style={{ borderRadius: 2 }}
    >
      {d.changed && (
        <span className="absolute -top-1.5 -right-1.5 z-10 bg-primary text-primary-foreground text-[8px] px-1 py-0 font-display">
          NEW
        </span>
      )}
      {(["top", "right", "bottom", "left"] as const).map((p) => (
        <Handle
          key={p}
          id={p}
          type="source"
          position={p as Position}
          className="!w-2 !h-2 !bg-primary !border-background"
        />
      ))}
      <div className="px-2 py-1.5 border-b border-border/80 flex items-center justify-between gap-1">
        <span className="font-display text-xs text-foreground truncate flex-1">
          {d.name || "—"}
        </span>
        <span
          className={cn(
            "text-[8px] uppercase tracking-wider px-1 py-0 border shrink-0",
            isNpc
              ? "text-purple-200 border-purple-500/50 bg-purple-500/15"
              : "text-primary border-primary/50 bg-primary/10"
          )}
        >
          {isNpc ? "NPC" : "BH"}
        </span>
      </div>
      <p className="px-2 py-1 text-[10px] text-muted-foreground truncate leading-tight min-h-[1.25rem]">
        {d.missing ? "Usunięta" : d.subtitle || "—"}
      </p>
      <div className="px-2 pb-1.5 flex gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(id);
          }}
          disabled={d.missing}
          className="flex-1 text-[10px] py-0.5 border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
        >
          Karta
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartQuickLink(id);
          }}
          disabled={d.missing}
          className="text-[10px] py-0.5 px-1.5 border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          title="Dodaj relację"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeComponent);
