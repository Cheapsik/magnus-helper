import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { useCardType, useCards } from "@/lib/cardStore";
import { type CardKind, CARD_KIND_LABELS, CARD_KIND_ROUTES, cardSubtitle, getCardCombatStats } from "@/lib/cardSchema";
import { cardToCombatant } from "@/lib/cardRoster";
import { MentionTimeline } from "@/components/card/MentionTimeline";

/** Quick view of any card: rename, jot notes, send to combat, or open the full card. */
export function CardDrawerView({ kind, id }: { kind: CardKind; id: string }) {
  const navigate = useNavigate();
  const { setCombatants } = useApp();
  const cardType = useCardType(kind);
  const [cards, setCards] = useCards(kind);
  const card = useMemo(() => cards.find((entry) => entry.id === id) ?? null, [cards, id]);

  if (!card) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono karty. Mogła zostać usunięta.</p>;
  }

  const patch = (next: Partial<typeof card>) =>
    setCards((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  const subtitle = cardSubtitle(cardType, card);
  const combat = getCardCombatStats(cardType, card.values);

  return (
    <div className="space-y-3">
      {card.portrait && <img src={card.portrait} alt="" className="h-32 w-32 rounded-md object-cover" />}
      <Input value={card.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Nazwa" aria-label="Nazwa" />
      {(subtitle || combat.resource || combat.stats.length > 0) && (
        <div className="rounded-lg border p-3 text-sm">
          {subtitle && <p className="font-medium">{subtitle}</p>}
          {combat.resource && (
            <p className="text-muted-foreground">
              {combat.resource.current} / {combat.resource.max}
            </p>
          )}
          {combat.stats.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {combat.stats.map((stat) => (
                <span key={stat.label} className="rounded bg-muted px-2 py-1">
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <Textarea
        value={card.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        placeholder="Notatki"
        className="min-h-[96px]"
        aria-label="Notatki"
      />
      <MentionTimeline cardId={id} />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="gap-1.5"
          onClick={() => {
            const combatant = cardToCombatant(card, cardType, kind !== "hero");
            setCombatants((prev) => [...prev, combatant]);
            toast.success(`Dodano ${combatant.name} do walki`);
          }}
        >
          <Swords className="h-3.5 w-3.5" /> Do walki
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(`${CARD_KIND_ROUTES[kind]}?id=${id}`)}>
          Pełna karta ({CARD_KIND_LABELS[kind]})
        </Button>
      </div>
    </div>
  );
}
