import { useMemo } from "react";
import type { PersistedEdge } from "../types";

export function useGraphHighlight(
  selectedNodeId: string | null,
  edges: PersistedEdge[]
) {
  return useMemo(() => {
    if (!selectedNodeId) {
      return {
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
        hasSelection: false,
      };
    }

    const highlightedEdgeIds = new Set<string>();
    const highlightedNodeIds = new Set<string>([selectedNodeId]);

    edges.forEach((e) => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        highlightedEdgeIds.add(e.id);
        highlightedNodeIds.add(e.source);
        highlightedNodeIds.add(e.target);
      }
    });

    return { highlightedNodeIds, highlightedEdgeIds, hasSelection: true };
  }, [selectedNodeId, edges]);
}
