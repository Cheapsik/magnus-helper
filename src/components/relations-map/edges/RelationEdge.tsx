import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  edgeStrokeWidth,
  statusLabel,
  statusStroke,
  typeColor,
} from "../colors";
import type { RelationEdgeData } from "../types";
import { useRelationsMapActions } from "../context/RelationsMapContext";

function RelationEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    markerStart,
    selected,
  } = props;

  const d = (data ?? {
    relationType: "Neutralny",
    bidirectional: true,
    status: "aktywna",
    strength: 3,
    label: "Neutralny",
  }) as RelationEdgeData;

  const { onEditEdge } = useRelationsMapActions();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = typeColor(d.label);
  const sw = edgeStrokeWidth(d.strength, d.highlighted || selected);
  const dash = statusStroke(d.status);
  const opacity = d.dimmed ? 0.12 : d.status === "zerwana" ? 0.45 : d.highlighted ? 1 : 0.88;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth: sw,
          strokeDasharray: dash !== "0" ? dash : undefined,
          opacity,
        }}
      />
      {!d.dimmed && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEdge(id);
                    }}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] uppercase tracking-wide border bg-card/90 backdrop-blur-sm hover:border-primary transition-colors max-w-[120px] truncate",
                      d.changed && "ring-1 ring-primary",
                      d.highlighted && "border-primary/60"
                    )}
                    style={{ borderColor: `${color}`, borderRadius: 2 }}
                  >
                    <span style={{ color }}>{d.label}</span>
                    {d.bidirectional && (
                      <span className="text-muted-foreground/70 text-[8px]">↔</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs space-y-1">
                  <div className="font-display text-sm" style={{ color }}>
                    {d.label}
                  </div>
                  <div className="text-muted-foreground">
                    Status: {statusLabel[d.status]} · Siła {d.strength}/5
                    {d.bidirectional ? " · dwustronna" : " · jednostronna"}
                  </div>
                  {d.description && (
                    <div className="text-foreground/90 italic">{d.description}</div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeComponent);
