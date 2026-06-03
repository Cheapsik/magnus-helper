import { cn } from "@/lib/utils";
import { useRelationsMap } from "./context/RelationsMapContext";
import { CharacterPoolPanel } from "./panels/CharacterPoolPanel";
import { DetailPanel } from "./panels/DetailPanel";
import { RelationsMapCanvas } from "./RelationsMapCanvas";

export function RelationsMapLayout() {
  const { uiVisible, sessionMode } = useRelationsMap();

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-3.5rem-2rem)] w-[calc(100%+0.75rem)] md:w-[calc(100%+1rem)] -my-4 -mx-4 -mr-3 md:-mr-4 min-h-0"
      )}
    >
      {uiVisible && !sessionMode && <CharacterPoolPanel />}
      {uiVisible && sessionMode && (
        <aside className="w-[52px] shrink-0 border-r border-border bg-card/40" aria-label="Tryb sesji" />
      )}
      <RelationsMapCanvas />
      {uiVisible && <DetailPanel />}
    </div>
  );
}
