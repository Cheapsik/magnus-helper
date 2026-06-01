import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { GmEnemy } from "@/lib/gmEnemy";
import type { Combatant } from "@/context/AppContext";
import type { CombatPreset } from "@/lib/combatSessions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ReadyOpponentsPanel } from "@/components/combat/ReadyOpponentsPanel";
import { CombatPresetsPanel } from "@/components/combat/CombatPresetsPanel";
import { CombatMonstersPanel } from "@/components/combat/CombatMonstersPanel";
import { CombatRosterPanel } from "@/components/combat/CombatRosterPanel";
import type { SavedNpc } from "@/components/character-sheet/types";
import type { HeroRosterEntry } from "@/lib/combatRoster";

type SideTab = "gotowi" | "presety" | "postacie";

interface CombatSidePanelProps {
  gmEnemies: GmEnemy[];
  setGmEnemies: (fn: GmEnemy[] | ((prev: GmEnemy[]) => GmEnemy[])) => void;
  savedNpcs: SavedNpc[];
  heroes: HeroRosterEntry[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  presets: CombatPreset[];
  onSavePresets: (presets: CombatPreset[]) => void;
  onSaveAsPresetFromFight: (name: string) => void;
  dragEnemyId: string | null;
  dragNpcId: string | null;
  dragHeroId: string | null;
  onDragEnemyStart: (id: string) => void;
  onDragNpcStart: (id: string) => void;
  onDragHeroStart: (id: string) => void;
  onDragEnd: () => void;
  className?: string;
}

export function CombatSidePanel({
  gmEnemies,
  setGmEnemies,
  savedNpcs,
  heroes,
  setCombatants,
  presets,
  onSavePresets,
  onSaveAsPresetFromFight,
  dragEnemyId,
  dragNpcId,
  dragHeroId,
  onDragEnemyStart,
  onDragNpcStart,
  onDragHeroStart,
  onDragEnd,
  className,
}: CombatSidePanelProps) {
  const [tab, setTab] = useState<SideTab>("gotowi");
  const [manageEnemiesOpen, setManageEnemiesOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card/40",
        className,
      )}
    >
      <div className="flex border-b border-border shrink-0">
        {(
          [
            { id: "gotowi" as const, label: "Potwory" },
            { id: "postacie" as const, label: "Postacie" },
            { id: "presety" as const, label: "Presety" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 py-2.5 text-[10px] sm:text-xs font-semibold transition-colors",
              tab === id
                ? "bg-card text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "postacie" ? (
          <CombatRosterPanel
            savedNpcs={savedNpcs}
            heroes={heroes}
            setCombatants={setCombatants}
            dragNpcId={dragNpcId}
            dragHeroId={dragHeroId}
            onDragNpcStart={onDragNpcStart}
            onDragHeroStart={onDragHeroStart}
            onDragEnd={onDragEnd}
          />
        ) : tab === "gotowi" ? (
          <>
            <CombatMonstersPanel
              gmEnemies={gmEnemies}
              setCombatants={setCombatants}
              dragEnemyId={dragEnemyId}
              onDragEnemyStart={onDragEnemyStart}
              onDragEnd={onDragEnd}
            />
            <div className="shrink-0 border-t border-border p-2">
              <Sheet open={manageEnemiesOpen} onOpenChange={setManageEnemiesOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs">
                    <Settings2 className="h-3.5 w-3.5" />
                    Zarządzaj biblioteką
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Biblioteka potworów</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <ReadyOpponentsPanel
                      gmEnemies={gmEnemies}
                      setGmEnemies={setGmEnemies}
                      setCombatants={setCombatants}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <CombatPresetsPanel
              variant="compact"
              presets={presets}
              onSavePresets={onSavePresets}
              onSaveAsPresetFromFight={onSaveAsPresetFromFight}
            />
            <div className="shrink-0 border-t border-border p-2">
              <Sheet open={managePresetsOpen} onOpenChange={setManagePresetsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs">
                    <Settings2 className="h-3.5 w-3.5" />
                    Zarządzaj presetami
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Presety walk</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <CombatPresetsPanel
                      variant="full"
                      presets={presets}
                      onSavePresets={onSavePresets}
                      onSaveAsPresetFromFight={onSaveAsPresetFromFight}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
