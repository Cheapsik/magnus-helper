import { MarkerType, type EdgeMarker } from "@xyflow/react";
import { subtleMarkerColor } from "./colors";

function subtleArrow(color: string): EdgeMarker {
  return {
    type: MarkerType.Arrow,
    color: subtleMarkerColor(color),
    width: 7,
    height: 7,
  };
}

/** Single small open arrow at target — direction for one-way; badge shows ↔ when bidirectional. */
export function relationEdgeMarkers(color: string): { markerEnd: EdgeMarker } {
  return { markerEnd: subtleArrow(color) };
}
