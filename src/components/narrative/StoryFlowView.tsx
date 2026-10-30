import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarrativeState, NarrativeStructure } from "@/lib/narrativeEngine";

/** The path taken through the story, oldest first. */
export function StoryFlowView({ structure, state }: { structure: NarrativeStructure; state: NarrativeState }) {
  if (state.path.length === 0) return <p className="text-sm text-muted-foreground">Drużyna nie odwiedziła jeszcze żadnej sceny.</p>;
  return (
    <ol className="space-y-1" aria-label="Przebieg fabuły">
      {state.path.map((p, i) => {
        const scene = structure.scenes.find((s) => s.id === p.sceneId);
        const act = structure.acts.find((a) => a.id === scene?.actId);
        const active = i === state.path.length - 1 && p.sceneId === state.activeSceneId;
        return (
          <li key={p.id}>
            {p.viaLabel && (
              <div className="flex items-center gap-1 pl-4 text-xs text-muted-foreground">
                <ArrowDown className="h-3 w-3" /> {p.viaLabel}
              </div>
            )}
            <div className={cn("rounded-md border p-2 text-sm", active && "border-primary bg-accent")}>
              <span className="font-medium">{scene?.name ?? "(usunięta scena)"}</span>
              {act && <span className="ml-2 text-xs text-muted-foreground">{act.name}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
