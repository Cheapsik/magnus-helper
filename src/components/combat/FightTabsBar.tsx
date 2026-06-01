import { useState, useRef, useEffect } from "react";
import { Plus, X, Check, MoreVertical, Pencil, Flag, Play, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CombatFight, CombatPreset } from "@/lib/combatSessions";
import { MAX_COMBAT_FIGHTS } from "@/lib/combatSessions";

interface FightTabsBarProps {
  fights: CombatFight[];
  activeFightId: string;
  presets: CombatPreset[];
  canAddFight: boolean;
  onSelectFight: (id: string) => void;
  onRenameFight: (id: string, name: string) => void;
  onRemoveFight: (id: string) => void;
  onToggleFinished: (id: string) => void;
  onNewFight: (presetId?: string) => void;
}

export function FightTabsBar({
  fights,
  activeFightId,
  presets,
  canAddFight,
  onSelectFight,
  onRenameFight,
  onRemoveFight,
  onToggleFinished,
  onNewFight,
}: FightTabsBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newFightOpen, setNewFightOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const startRename = (fight: CombatFight) => {
    setEditingId(fight.id);
    setEditName(fight.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) onRenameFight(editingId, editName);
    setEditingId(null);
  };

  const handleNewFight = () => {
    onNewFight(selectedPresetId || undefined);
    setSelectedPresetId("");
    setNewFightOpen(false);
  };

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fights.map((fight) => {
          const isActive = fight.id === activeFightId;
          const isEditing = editingId === fight.id;
          const isFinished = fight.status === "finished";

          if (isEditing) {
            return (
              <div
                key={fight.id}
                className="flex min-h-[48px] shrink-0 items-center gap-1 rounded-lg border border-primary bg-primary/5 px-1.5"
              >
                <Input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={commitRename}
                  className="h-9 w-32 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={commitRename}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          return (
            <div
              key={fight.id}
              className={cn(
                "group relative flex min-h-[48px] shrink-0 items-center rounded-lg border pl-1 pr-1 transition-colors",
                isActive
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-muted/40 hover:bg-muted/70",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectFight(fight.id)}
                onDoubleClick={() => startRename(fight)}
                className="flex min-w-0 items-center gap-2 py-1.5 pl-2 pr-1 text-left"
                title={isFinished ? "Walka zakończona" : "Kliknij, aby przełączyć · dwuklik zmienia nazwę"}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    isFinished
                      ? "bg-muted-foreground/50"
                      : isActive
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground/40",
                  )}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={cn(
                      "max-w-[8.5rem] truncate text-sm font-semibold",
                      isActive ? "text-primary" : "text-foreground",
                      isFinished && "line-through decoration-muted-foreground/60",
                    )}
                  >
                    {fight.name}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Runda {fight.combatRound}
                    {fight.combatants.length > 0 && ` · ${fight.combatants.length} ucz.`}
                  </span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
                      isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100",
                    )}
                    title="Opcje walki"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => startRename(fight)}>
                    <Pencil className="mr-2 h-4 w-4" /> Zmień nazwę
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleFinished(fight.id)}>
                    {isFinished ? (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Wznów walkę
                      </>
                    ) : (
                      <>
                        <Flag className="mr-2 h-4 w-4" /> Oznacz jako zakończoną
                      </>
                    )}
                  </DropdownMenuItem>
                  {fights.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onRemoveFight(fight.id)}
                      >
                        <X className="mr-2 h-4 w-4" /> Zamknij walkę
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {canAddFight ? (
        <Popover open={newFightOpen} onOpenChange={setNewFightOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-h-[48px] shrink-0 gap-1.5 self-start px-3 text-sm font-semibold"
              title="Dodaj nową równoległą walkę"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nowa walka</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Nowa walka</p>
            </div>
            {presets.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Zacznij od</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Pusty tracker</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.combatants.length} ucz.)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button className="h-10 w-full text-sm" onClick={handleNewFight}>
              {selectedPresetId ? "Utwórz z presetu" : "Utwórz pustą walkę"}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              {fights.length} / {MAX_COMBAT_FIGHTS} walk
            </p>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex min-h-[48px] shrink-0 items-center self-start rounded-lg border border-dashed border-border px-3 text-[10px] font-medium text-muted-foreground">
          Limit {MAX_COMBAT_FIGHTS}
        </div>
      )}
    </div>
  );
}
