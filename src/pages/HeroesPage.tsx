import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, ScrollText, Swords, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CardRenderer } from "@/components/card/CardRenderer";
import { useCardType, useCards } from "@/lib/cardStore";
import {
  type Card,
  type CardTypeDef,
  cardSubtitle,
  cardTitle,
  createEmptyCard,
} from "@/lib/cardSchema";
import { cardToCombatant } from "@/lib/cardRoster";
import { usePageHeader } from "@/context/PageHeaderContext";

export default function HeroesPage() {
  const { setCombatants } = useApp();
  const cardType = useCardType("hero");
  const [heroes, setHeroes] = useCards("hero");
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeHero = useMemo(() => heroes.find((h) => h.id === activeId) ?? null, [heroes, activeId]);

  const addHero = () => {
    const hero = createEmptyCard("hero", cardType);
    setHeroes((prev) => [...prev, hero]);
    setActiveId(hero.id);
  };

  const deleteHero = (id: string) => {
    setHeroes((prev) => prev.filter((h) => h.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const saveHero = (updated: Card) => {
    setHeroes((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  usePageHeader(
    {
      actions: activeId ? null : (
        <Button onClick={addHero}>
          <Plus className="h-3.5 w-3.5" /> Dodaj bohatera
        </Button>
      ),
      meta: activeId ? [] : [`${heroes.length} ${heroes.length === 1 ? "karta" : "kart"}`],
    },
    [activeId, heroes.length],
  );

  const addHeroToCombat = (hero: Card) => {
    const combatant = cardToCombatant(hero, cardType, false);
    setCombatants((prev) => [...prev, combatant]);
    toast.success(`Dodano ${combatant.name} do walki`);
  };

  if (activeHero) {
    return (
      <HeroSheet
        hero={activeHero}
        cardType={cardType}
        onBack={() => setActiveId(null)}
        onSave={saveHero}
        onAddToCombat={() => addHeroToCombat(activeHero)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {heroes.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="text-sm">Brak postaci. Kliknij „Dodaj Bohatera", aby utworzyć nową kartę.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heroes.map((hero) => {
            const name = cardTitle(hero, "Nowy bohater");
            const subtitle = cardSubtitle(cardType, hero);
            return (
              <div
                key={hero.id}
                className="group bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setActiveId(hero.id)}
              >
                <div className="flex-shrink-0 h-12 w-12 overflow-hidden rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  {hero.portrait ? (
                    <img src={hero.portrait} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ScrollText className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{name}</div>
                  <div className="text-xs text-muted-foreground truncate">{subtitle || "Brak danych"}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs gap-1 px-2"
                    onClick={() => addHeroToCombat(hero)}
                  >
                    <Swords className="h-3 w-3" /> Walka
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                        aria-label="Usuń"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć postać?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tej operacji nie można cofnąć. Karta „{name}" zostanie trwale usunięta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteHero(hero.id)}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeroSheet({
  hero,
  cardType,
  onBack,
  onSave,
  onAddToCombat,
}: {
  hero: Card;
  cardType: CardTypeDef;
  onBack: () => void;
  onSave: (hero: Card) => void;
  onAddToCombat: () => void;
}) {
  const [draft, setDraft] = useState<Card>(hero);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(hero), [hero.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onSave(draft), 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-fade-in">
      <div className="paper-topbar">
        <button onClick={onBack} className="paper-back-btn">
          <ArrowLeft className="h-4 w-4" /> Wróć do listy
        </button>
        <h1 className="paper-title">{cardTitle(draft, "Nowy bohater")}</h1>
        <Button size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={onAddToCombat}>
          <Swords className="h-3 w-3" /> Dodaj do walki
        </Button>
      </div>

      <div className="paper-sheet">
        <CardRenderer cardType={cardType} card={draft} onChange={setDraft} />
      </div>
    </div>
  );
}
