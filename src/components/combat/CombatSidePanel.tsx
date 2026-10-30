import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Combatant } from "@/context/AppContext";
import type { CombatPreset } from "@/lib/combatSessions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CombatPresetsPanel } from "@/components/combat/CombatPresetsPanel";
import { CombatRosterPanel } from "@/components/combat/CombatRosterPanel";
import { ClocksPanel } from "@/components/clocks/ClocksPanel";
import { PlayerScreenControls } from "@/components/player-screen/PlayerScreenControls";

type SideTab = "potwory" | "postacie" | "presety" | "zegary" | "ekran";

interface CombatSidePanelProps {
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  presets: CombatPreset[];
  onSavePresets: (presets: CombatPreset[]) => void;
  onSaveAsPresetFromFight: (name: string) => void;
  dragKey: string | null;
  onDragStart: (key: string) => void;
  onDragEnd: () => void;
  className?: string;
}

export function CombatSidePanel({
  setCombatants,
  presets,
  onSavePresets,
  onSaveAsPresetFromFight,
  dragKey,
  onDragStart,
  onDragEnd,
  className,
}: CombatSidePanelProps) {
  const [tab, setTab] = useState<SideTab>("potwory");
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
            { id: "potwory" as const, label: "Potwory" },
            { id: "postacie" as const, label: "Postacie" },
            { id: "presety" as const, label: "Presety" },
            { id: "zegary" as const, label: "Koła postępu" },
            { id: "ekran" as const, label: "Ekran" },
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
        {tab === "zegary" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <ClocksPanel />
          </div>
        ) : tab === "ekran" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <PlayerScreenControls />
          </div>
        ) : tab === "postacie" || tab === "potwory" ? (
          <CombatRosterPanel
            key={tab}
            kinds={tab === "potwory" ? ["monster"] : ["hero", "npc"]}
            setCombatants={setCombatants}
            dragKey={dragKey}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
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
