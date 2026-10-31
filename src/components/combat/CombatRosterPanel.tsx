import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import type { Combatant } from "@/context/AppContext";
import {
  type Card,
  type CardKind,
  CARD_KIND_PLURAL,
  CARD_KIND_ROUTES,
  cardSubtitle,
  cardTitle,
  getCardCombatStats,
} from "@/lib/cardSchema";
import { useCardType, useCards } from "@/lib/cardStore";
import { cardToCombatant } from "@/lib/cardRoster";
import { rosterCardKey } from "@/lib/combatDrag";
import { CombatRosterPill } from "@/components/combat/CombatRosterPill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinePointer } from "@/hooks/useFinePointer";

interface CombatRosterPanelProps {
  /** Card kinds offered here; more than one shows a switch. */
  kinds: CardKind[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  dragKey: string | null;
  onDragStart: (key: string) => void;
  onDragEnd: () => void;
  className?: string;
}

const EMPTY: Record<CardKind, string> = {
  hero: "Brak bohaterów w tej kampanii.",
  npc: "Brak NPC w tej kampanii.",
  monster: "Brak potworów w tej kampanii.",
};

/** Cards that can join the fight: drag them onto it or use "+ Do walki". */
export function CombatRosterPanel({ kinds, setCombatants, dragKey, onDragStart, onDragEnd, className }: CombatRosterPanelProps) {
  const finePointer = useFinePointer();
  const [kind, setKind] = useState<CardKind>(kinds[0]);
  const [query, setQuery] = useState("");
  const cardType = useCardType(kind);
  const [cards] = useCards(kind);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      `${cardTitle(card)} ${cardSubtitle(cardType, card)}`.toLowerCase().includes(q),
    );
  }, [cards, cardType, query]);

  const add = (card: Card) => {
    const combatant = cardToCombatant(card, cardType, kind !== "hero");
    setCombatants((prev) => [...prev, combatant]);
    toast.success(`Dodano „${combatant.name}” do walki`);
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {kinds.length > 1 && (
        <div className="flex shrink-0 gap-1 border-b border-border px-2 pb-2 pt-2">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-[12px] font-semibold transition-colors",
                kind === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {CARD_KIND_PLURAL[k]}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 px-2 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj…"
            className="field-sm pl-8"
            aria-label={`Szukaj: ${CARD_KIND_PLURAL[kind]}`}
          />
        </div>
      </div>

      <p className="shrink-0 px-3 pt-2 text-[12px] leading-snug text-muted-foreground">
        {finePointer ? "Przeciągnij na walkę po lewej lub użyj „+ Do walki”." : "Dotknij „+ Do walki”, aby dodać uczestnika."}
      </p>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {cards.length === 0 ? EMPTY[kind] : "Brak wyników wyszukiwania."}
          </p>
        ) : (
          filtered.map((card) => {
            const combat = getCardCombatStats(cardType, card.values);
            const details = [
              combat.resource ? `${combat.resource.current}/${combat.resource.max}` : "",
              ...combat.stats.map((stat) => `${stat.label} ${stat.value}`),
            ].filter(Boolean);
            const key = rosterCardKey(kind, card.id);
            return (
              <CombatRosterPill
                key={card.id}
                name={cardTitle(card)}
                subtitle={cardSubtitle(cardType, card) || undefined}
                details={details}
                enemy={kind !== "hero"}
                dragKey={key}
                finePointer={finePointer}
                isDragging={dragKey === key}
                onDragStart={() => onDragStart(key)}
                onDragEnd={onDragEnd}
                onAddToCombat={() => add(card)}
              />
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-border p-2">
        <Button variant="outline" className="w-full gap-1.5" asChild>
          <Link to={CARD_KIND_ROUTES[kind]}>
            <ExternalLink className="h-3.5 w-3.5" />
            {CARD_KIND_PLURAL[kind]}
          </Link>
        </Button>
      </div>
    </div>
  );
}
