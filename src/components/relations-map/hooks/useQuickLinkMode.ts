import { useCallback, useState } from "react";
import type { QuickLinkPhase } from "../types";

export function useQuickLinkMode() {
  const [phase, setPhase] = useState<QuickLinkPhase>("idle");
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const startLink = useCallback((nodeId: string) => {
    setPhase("pickTarget");
    setSourceNodeId(nodeId);
    setTargetNodeId(null);
    setPickerOpen(false);
  }, []);

  const pickTarget = useCallback((nodeId: string) => {
    setTargetNodeId(nodeId);
    setPhase("pickType");
    setPickerOpen(true);
  }, []);

  const cancelLink = useCallback(() => {
    setPhase("idle");
    setSourceNodeId(null);
    setTargetNodeId(null);
    setPickerOpen(false);
  }, []);

  const finishLink = useCallback(() => {
    setPhase("idle");
    setSourceNodeId(null);
    setTargetNodeId(null);
    setPickerOpen(false);
  }, []);

  return {
    phase,
    sourceNodeId,
    targetNodeId,
    pickerOpen,
    setPickerOpen,
    startLink,
    pickTarget,
    cancelLink,
    finishLink,
    isLinking: phase !== "idle",
  };
}
