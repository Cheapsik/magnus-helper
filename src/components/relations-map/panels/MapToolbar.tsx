import {
  LayoutGrid,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  History,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRelationsMap } from "../context/RelationsMapContext";

interface MapToolbarProps {
  onAutoLayout: () => void;
}

export function MapToolbar({ onAutoLayout }: MapToolbarProps) {
  const {
    sessionMode,
    setSessionMode,
    uiVisible,
    setUiVisible,
    showFilters,
    setShowFilters,
    showLegend,
    setShowLegend,
    showSessions,
    setShowSessions,
    showTimeline,
    setShowTimeline,
    detailPanelOpen,
    setDetailPanelOpen,
    currentSessionName,
    changedCount,
    linkingBanner,
    previewSessionName,
    exitPreview,
    persisted,
    lookup,
    onOpenDetail,
  } = useRelationsMap();

  const pinnedNodes = persisted.nodes.filter((n) => n.pinned);

  if (!uiVisible) {
    return (
      <div className="absolute top-2 left-2 z-10">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUiVisible(true)}
          className="h-8 bg-card/95 border-border backdrop-blur shadow-sm"
        >
          <PanelLeft className="h-3.5 w-3.5 mr-1.5" />
          Pokaż UI
        </Button>
      </div>
    );
  }

  return (
    <>
      {(linkingBanner || previewSessionName) && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 flex items-center justify-between">
          <span>
            {linkingBanner || `Podgląd sesji: ${previewSessionName} (read-only)`}
          </span>
          {previewSessionName && (
            <button type="button" className="underline text-[10px]" onClick={exitPreview}>
              Wyjdź
            </button>
          )}
        </div>
      )}
      {sessionMode && (
        <div
          className={cn(
            "absolute left-2 right-2 z-10 flex flex-wrap items-center gap-1.5 text-xs bg-card/90 border border-primary/30 px-2 py-1 backdrop-blur",
            linkingBanner || previewSessionName ? "top-9" : "top-2"
          )}
        >
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span className="font-display">{currentSessionName || "Tryb sesji"}</span>
          {changedCount > 0 && (
            <span className="text-primary text-[10px]">· {changedCount} NEW</span>
          )}
          {pinnedNodes.map((n) => {
            const name = lookup.get(n.entityId)?.name ?? "?";
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onOpenDetail(n.id)}
                className="text-[10px] px-1.5 py-0.5 border border-primary/40 hover:bg-primary/10 truncate max-w-[100px]"
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
      <div
        className={cn(
          "absolute left-2 right-2 z-10 flex items-center gap-2 flex-wrap",
          sessionMode
            ? linkingBanner || previewSessionName
              ? "top-[4.5rem]"
              : "top-11"
            : linkingBanner || previewSessionName
              ? "top-9"
              : "top-2"
        )}
      >
        <div className="bg-card/95 border border-border px-2 py-1 flex items-center gap-1 backdrop-blur flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUiVisible(false)}
            className="h-7 text-xs"
            title="Ukryj panele"
          >
            <PanelLeftClose className="h-3 w-3 mr-1" />
            Ukryj UI
          </Button>
          <Button
            size="sm"
            variant={sessionMode ? "default" : "outline"}
            onClick={() => setSessionMode((v) => !v)}
            className="h-7 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Tryb sesji
          </Button>
          {!sessionMode && (
            <Button size="sm" variant="outline" onClick={onAutoLayout} className="h-7 text-xs">
              <LayoutGrid className="h-3 w-3 mr-1" />
              Ułóż
            </Button>
          )}
          {!sessionMode && (
            <>
              <Button
                size="sm"
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters((v) => !v)}
                className="h-7 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtry
              </Button>
              <Button
                size="sm"
                variant={showLegend ? "default" : "outline"}
                onClick={() => setShowLegend((v) => !v)}
                className="h-7 text-xs"
              >
                {showLegend ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                Legenda
              </Button>
              <Button
                size="sm"
                variant={showSessions ? "default" : "outline"}
                onClick={() => setShowSessions((v) => !v)}
                className="h-7 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Sesje
              </Button>
              <Button
                size="sm"
                variant={showTimeline ? "default" : "outline"}
                onClick={() => setShowTimeline((v) => !v)}
                className="h-7 text-xs"
              >
                <History className="h-3 w-3 mr-1" />
                Historia
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetailPanelOpen((v) => !v)}
            className="h-7 text-xs"
          >
            {detailPanelOpen ? (
              <ChevronRight className="h-3 w-3 mr-1" />
            ) : (
              <ChevronLeft className="h-3 w-3 mr-1" />
            )}
            Panel
          </Button>
        </div>
      </div>
    </>
  );
}
