import { DragEvent } from "react";
import { Network, Plus, Search, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRelationsMap } from "../context/RelationsMapContext";

export function CharacterPoolPanel() {
  const {
    search,
    setSearch,
    sidebarEntries,
    onCanvasIds,
    addEntityToCanvas,
    sessionMode,
  } = useRelationsMap();

  if (sessionMode) return null;

  return (
    <aside className="w-[260px] shrink-0 border-r border-border bg-card/40 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Network className="h-4 w-4 text-primary shrink-0" />
          <h2 className="font-display text-base text-foreground">Mapa relacji</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj (imię, alias, tag)…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {sidebarEntries.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">Brak postaci.</p>
        )}
        {sidebarEntries.map((e) => {
          const placed = onCanvasIds.has(e.id);
          return (
            <div
              key={`${e.kind}_${e.id}`}
              draggable={!placed}
              onDragStart={(ev: DragEvent) =>
                ev.dataTransfer.setData(
                  "application/x-magnus-entity",
                  JSON.stringify({ entityId: e.id, kind: e.kind })
                )
              }
              className={cn(
                "group flex items-center gap-2 p-2 border border-border bg-background/60",
                placed ? "opacity-40" : "cursor-grab hover:border-primary/50"
              )}
            >
              {e.kind === "npc" ? (
                <Users className="h-3.5 w-3.5 text-purple-300 shrink-0" />
              ) : (
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{e.name}</div>
                {e.desc && (
                  <div className="text-[10px] text-muted-foreground truncate">{e.desc}</div>
                )}
              </div>
              {placed ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  ✓
                </Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => addEntityToCanvas(e.id, e.kind)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-primary"
                  title="Dodaj do mapy"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
