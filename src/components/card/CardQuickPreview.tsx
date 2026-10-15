import { ScrollText } from "lucide-react";
import { CardRenderer } from "@/components/card/CardRenderer";
import { type Card, type CardTypeDef, cardSubtitle, cardTitle, getCardCombatStats } from "@/lib/cardSchema";

/** A read-only look at a card, for side panels and drawers. */
export function CardQuickPreview({ card, cardType, full }: { card: Card; cardType: CardTypeDef; full?: boolean }) {
  const subtitle = cardSubtitle(cardType, card);
  const resource = getCardCombatStats(cardType, card.values).resource;

  if (full) {
    return (
      <div className="paper-sheet rounded-md">
        <CardRenderer cardType={cardType} card={card} onChange={() => undefined} readOnly />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {card.portrait ? (
            <img src={card.portrait} alt="" className="h-full w-full object-cover" />
          ) : (
            <ScrollText className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{cardTitle(card)}</div>
          {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          {resource && (
            <div className="text-xs text-muted-foreground">
              {resource.current} / {resource.max}
            </div>
          )}
        </div>
      </div>
      {card.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{card.notes}</p>}
    </div>
  );
}
