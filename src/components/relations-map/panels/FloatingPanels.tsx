import { cn } from "@/lib/utils";
import { useRelationsMap } from "../context/RelationsMapContext";
import { FloatingPanel } from "./FloatingPanel";
import { FiltersPanel } from "./FiltersPanel";
import { LegendPanel } from "./LegendPanel";
import { SessionPanel } from "./SessionPanel";
import { TimelinePanel } from "./TimelinePanel";

export function FloatingPanels() {
  const {
    showFilters,
    setShowFilters,
    showLegend,
    setShowLegend,
    showSessions,
    setShowSessions,
    showTimeline,
    setShowTimeline,
    sessionMode,
    uiVisible,
  } = useRelationsMap();

  if (!uiVisible || sessionMode) return null;

  return (
    <>
      {showFilters && (
        <FloatingPanel
          title="Filtry"
          onClose={() => setShowFilters(false)}
          className={cn("top-14 left-2 w-[240px]")}
        >
          <FiltersPanel embedded />
        </FloatingPanel>
      )}

      {showSessions && (
        <FloatingPanel
          title="Sesje"
          onClose={() => setShowSessions(false)}
          className={cn(
            "top-14 w-[240px]",
            showFilters ? "left-[252px]" : "left-2"
          )}
        >
          <SessionPanel embedded />
        </FloatingPanel>
      )}

      {showTimeline && (
        <FloatingPanel
          title="Historia"
          onClose={() => setShowTimeline(false)}
          className="top-14 right-2 w-[300px]"
        >
          <TimelinePanel />
        </FloatingPanel>
      )}

      {showLegend && (
        <FloatingPanel
          title="Legenda"
          onClose={() => setShowLegend(false)}
          className="bottom-14 left-2 w-[280px]"
        >
          <LegendPanel embedded />
        </FloatingPanel>
      )}
    </>
  );
}
