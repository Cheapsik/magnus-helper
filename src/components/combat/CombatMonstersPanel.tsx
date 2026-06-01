import { useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import type { GmEnemy } from "@/lib/gmEnemy";
import { gmEnemyToCombatant } from "@/lib/gmEnemy";
import type { Combatant } from "@/context/AppContext";
import { CombatEnemyPill } from "@/components/combat/CombatEnemyPill";
import { ReadyOpponentsPanel } from "@/components/combat/ReadyOpponentsPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useFinePointer } from "@/hooks/useFinePointer";
import { toast } from "sonner";

interface CombatMonstersPanelProps {
  gmEnemies: GmEnemy[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  dragEnemyId: string | null;
  onDragEnemyStart: (id: string) => void;
  onDragEnd: () => void;
  layout?: "sidebar" | "full";
  className?: string;
}

function filterGmEnemies(enemies: GmEnemy[], q: string): GmEnemy[] {
  if (!q) return enemies;
  return enemies.filter((e) => {
    const name = e.name.trim().toLowerCase();
    const weapon = (e.weapon ?? "").toLowerCase();
    const desc = (e.description ?? "").toLowerCase();
    return name.includes(q) || weapon.includes(q) || desc.includes(q);
  });
}

export function CombatMonstersPanel({
  gmEnemies,
  setCombatants,
  dragEnemyId,
  onDragEnemyStart,
  onDragEnd,
  layout = "sidebar",
  className,
}: CombatMonstersPanelProps) {
  const finePointer = useFinePointer();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => filterGmEnemies(gmEnemies, q), [gmEnemies, q]);

  const addToCombat = (enemy: GmEnemy) => {
    setCombatants((prev) => [...prev, gmEnemyToCombatant(enemy)]);
    toast.success(`Dodano „${enemy.name.trim() || "Przeciwnik"}” do walki`);
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 px-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj potworów…"
            className="h-8 pl-8 text-xs"
            aria-label="Szukaj potworów"
          />
        </div>
      </div>

      <p className="shrink-0 px-3 pt-2 text-[10px] text-muted-foreground leading-snug">
        {finePointer
          ? "Przeciągnij kartę na walkę po lewej lub użyj „+ Do walki”."
          : "Dotknij „+ Do walki”, aby dodać uczestnika."}
      </p>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-2 space-y-2",
          layout === "full" && "max-h-none",
        )}
      >
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {gmEnemies.length === 0
              ? "Brak zapisanych potworów. Dodaj je w bibliotece."
              : "Brak wyników wyszukiwania."}
          </p>
        ) : (
          filtered.map((enemy) => (
            <CombatEnemyPill
              key={enemy.id}
              enemy={enemy}
              finePointer={finePointer}
              isDragging={dragEnemyId === enemy.id}
              onDragStart={() => onDragEnemyStart(enemy.id)}
              onDragEnd={onDragEnd}
              onAddToCombat={() => addToCombat(enemy)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CombatMonstersMobileTabProps extends CombatMonstersPanelProps {
  setGmEnemies: (fn: GmEnemy[] | ((prev: GmEnemy[]) => GmEnemy[])) => void;
}

export function CombatMonstersMobileTab({ setGmEnemies, ...panelProps }: CombatMonstersMobileTabProps) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="flex min-h-[200px] flex-col rounded-lg border border-border bg-card/40">
      <CombatMonstersPanel {...panelProps} layout="full" />
      <div className="shrink-0 border-t border-border p-2">
        <Sheet open={manageOpen} onOpenChange={setManageOpen}>
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
                gmEnemies={panelProps.gmEnemies}
                setGmEnemies={setGmEnemies}
                setCombatants={panelProps.setCombatants}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
