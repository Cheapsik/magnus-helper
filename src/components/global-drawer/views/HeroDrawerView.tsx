import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCardType, useCards } from "@/lib/cardStore";
import { cardSubtitle, getCardCombatStats } from "@/lib/cardSchema";

interface HeroDrawerViewProps {
  id: string;
}

export function HeroDrawerView({ id }: HeroDrawerViewProps) {
  const cardType = useCardType("hero");
  const [heroes, setHeroes] = useCards("hero");

  const hero = useMemo(() => heroes.find((entry) => entry.id === id) ?? null, [heroes, id]);

  if (!hero) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono bohatera.</p>;
  }

  const subtitle = cardSubtitle(cardType, hero);
  const combat = getCardCombatStats(cardType, hero.values);

  const renameHero = (next: string) => {
    setHeroes((prev) => prev.map((entry) => (entry.id === id ? { ...entry, name: next } : entry)));
  };

  return (
    <div className="space-y-3">
      <Input
        value={hero.name}
        onChange={(e) => renameHero(e.target.value)}
        placeholder="Nazwa"
      />
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">{subtitle || "Brak opisu"}</p>
        {combat.resource && (
          <p className="text-muted-foreground">
            {combat.resource.current} / {combat.resource.max}
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {combat.stats.slice(0, 8).map((stat) => (
            <span key={stat.label} className="rounded bg-muted px-2 py-1">
              {stat.label}: {stat.value}
            </span>
          ))}
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" disabled>
        Otwórz pełną kartę (w kolejnym kroku)
      </Button>
    </div>
  );
}
