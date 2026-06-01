import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import type { SavedNpc } from "@/components/character-sheet/types";
import {
  getCharacterSheetCombatStats,
  getNpcCombatStats,
  getNpcDisplayName,
} from "@/components/character-sheet/npcAccessors";
import type { Combatant } from "@/context/AppContext";
import {
  heroRosterToCombatant,
  savedNpcToCombatant,
  getHeroRosterDisplayName,
  getHeroRosterSubtitle,
  type HeroRosterEntry,
} from "@/lib/combatRoster";
import { ROSTER_HERO_DRAG, ROSTER_NPC_DRAG } from "@/lib/combatDrag";
import { CombatRosterPill } from "@/components/combat/CombatRosterPill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinePointer } from "@/hooks/useFinePointer";
import { toast } from "sonner";

type RosterKind = "npc" | "bohaterowie";

interface CombatRosterPanelProps {
  savedNpcs: SavedNpc[];
  heroes: HeroRosterEntry[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  dragNpcId: string | null;
  dragHeroId: string | null;
  onDragNpcStart: (id: string) => void;
  onDragHeroStart: (id: string) => void;
  onDragEnd: () => void;
  layout?: "sidebar" | "full";
  className?: string;
}

export function CombatRosterPanel({
  savedNpcs,
  heroes,
  setCombatants,
  dragNpcId,
  dragHeroId,
  onDragNpcStart,
  onDragHeroStart,
  onDragEnd,
  layout = "sidebar",
  className,
}: CombatRosterPanelProps) {
  const finePointer = useFinePointer();
  const [kind, setKind] = useState<RosterKind>("npc");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filteredNpcs = useMemo(() => {
    if (!q) return savedNpcs;
    return savedNpcs.filter((npc) => {
      const name = getNpcDisplayName(npc).toLowerCase();
      const prof = (npc.daneOgolne.obecnaProfesja ?? "").toLowerCase();
      return name.includes(q) || prof.includes(q);
    });
  }, [savedNpcs, q]);

  const filteredHeroes = useMemo(() => {
    if (!q) return heroes;
    return heroes.filter((h) => {
      const name = getHeroRosterDisplayName(h).toLowerCase();
      const sub = getHeroRosterSubtitle(h).toLowerCase();
      return name.includes(q) || sub.includes(q);
    });
  }, [heroes, q]);

  const addNpc = (npc: SavedNpc) => {
    setCombatants((prev) => [...prev, savedNpcToCombatant(npc)]);
    toast.success(`Dodano „${getNpcDisplayName(npc)}” do walki`);
  };

  const addHero = (h: HeroRosterEntry) => {
    setCombatants((prev) => [...prev, heroRosterToCombatant(h)]);
    toast.success(`Dodano „${getHeroRosterDisplayName(h)}” do walki`);
  };

  const list =
    kind === "npc" ? (
      filteredNpcs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          {savedNpcs.length === 0
            ? "Brak zapisanych NPC. Dodaj ich w menedżerze NPC."
            : "Brak wyników wyszukiwania."}
        </p>
      ) : (
        filteredNpcs.map((npc) => {
          const c = getNpcCombatStats(npc);
          return (
            <CombatRosterPill
              key={npc.id}
              variant="npc"
              entityId={npc.id}
              dragMime={ROSTER_NPC_DRAG}
              name={getNpcDisplayName(npc)}
              subtitle={npc.daneOgolne.obecnaProfesja || undefined}
              ww={c.ww}
              hp={c.hp}
              armor={c.armor}
              weapon={c.weapon || undefined}
              finePointer={finePointer}
              isDragging={dragNpcId === npc.id}
              onDragStart={() => onDragNpcStart(npc.id)}
              onDragEnd={onDragEnd}
              onAddToCombat={() => addNpc(npc)}
            />
          );
        })
      )
    ) : filteredHeroes.length === 0 ? (
      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
        {heroes.length === 0
          ? "Brak bohaterów. Utwórz kartę na stronie Bohaterowie."
          : "Brak wyników wyszukiwania."}
      </p>
    ) : (
      filteredHeroes.map((h) => {
        const c = getCharacterSheetCombatStats(h);
        return (
          <CombatRosterPill
            key={h.id}
            variant="hero"
            entityId={h.id}
            dragMime={ROSTER_HERO_DRAG}
            name={getHeroRosterDisplayName(h)}
            subtitle={getHeroRosterSubtitle(h) || undefined}
            ww={c.ww}
            hp={c.hp}
            armor={c.armor}
            weapon={c.weapon || undefined}
            finePointer={finePointer}
            isDragging={dragHeroId === h.id}
            onDragStart={() => onDragHeroStart(h.id)}
            onDragEnd={onDragEnd}
            onAddToCombat={() => addHero(h)}
          />
        );
      })
    );

  const manageHref = kind === "npc" ? "/npcs" : "/heroes";
  const manageLabel = kind === "npc" ? "Menedżer NPC" : "Bohaterowie";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 gap-1 border-b border-border px-2 pt-2 pb-2">
        {(["npc", "bohaterowie"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-[10px] font-semibold transition-colors",
              kind === id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {id === "npc" ? "NPC" : "Bohaterowie"}
          </button>
        ))}
      </div>

      <div className="shrink-0 px-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj…"
            className="h-8 pl-8 text-xs"
            aria-label="Szukaj postaci"
          />
        </div>
      </div>

      <p className="shrink-0 px-3 pt-2 text-[10px] text-muted-foreground leading-snug">
        {finePointer
          ? "Przeciągnij na walkę po lewej lub użyj „+ Do walki”."
          : "Dotknij „+ Do walki”, aby dodać uczestnika."}
      </p>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-2 space-y-2",
          layout === "full" && "max-h-none",
        )}
      >
        {list}
      </div>

      <div className="shrink-0 border-t border-border p-2">
        <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs" asChild>
          <Link to={manageHref}>
            <ExternalLink className="h-3.5 w-3.5" />
            {manageLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function CombatRosterMobileTab(props: Omit<CombatRosterPanelProps, "layout">) {
  return (
    <div className="rounded-lg border border-border bg-card/40 min-h-[200px] flex flex-col">
      <CombatRosterPanel {...props} layout="full" />
    </div>
  );
}
