import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { readStorageValue, writeStorageValue } from "@/components/global-drawer/drawerStorage";

const HERO_LIST_KEY = "rpg_characters";
const HERO_SINGLE_KEY = "rpg_character";

interface HeroSummary {
  id: string;
  name: string;
  race?: string;
  profession?: string;
  stats?: Array<{ label: string; value: number }>;
}

interface HeroDrawerViewProps {
  id: string;
}

export function HeroDrawerView({ id }: HeroDrawerViewProps) {
  const [hero, setHero] = useState<HeroSummary | null>(null);

  useEffect(() => {
    const list = readStorageValue<HeroSummary[]>(HERO_LIST_KEY, []);
    const byList = list.find((entry) => entry.id === id);
    if (byList) {
      setHero(byList);
      return;
    }
    const single = readStorageValue<Record<string, unknown>>(HERO_SINGLE_KEY, {});
    if (single && typeof single.name === "string") {
      setHero({
        id: id || "single",
        name: String(single.name ?? ""),
        race: String(single.race ?? ""),
        profession: String(single.career ?? ""),
        stats: Array.isArray(single.stats) ? (single.stats as Array<{ label: string; value: number }>) : [],
      });
    } else {
      setHero(null);
    }
  }, [id]);

  const updateHeroName = (name: string) => {
    if (!hero) return;
    setHero({ ...hero, name });
    const list = readStorageValue<HeroSummary[]>(HERO_LIST_KEY, []);
    if (list.some((entry) => entry.id === id)) {
      const existing = readStorageValue<HeroSummary[]>(HERO_LIST_KEY, []);
      const updated = existing.map((item) => (item.id === id ? { ...item, name } : item));
      writeStorageValue(HERO_LIST_KEY, updated);
      return;
    }
    const single = readStorageValue<Record<string, unknown>>(HERO_SINGLE_KEY, {});
    writeStorageValue(HERO_SINGLE_KEY, { ...single, name });
  };

  if (!hero) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono bohatera.</p>;
  }

  return (
    <div className="space-y-3">
      <Input value={hero.name} onChange={(e) => updateHeroName(e.target.value)} placeholder="Imie" />
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">{hero.race || "Rasa: -"}</p>
        <p className="text-muted-foreground">{hero.profession || "Profesja: -"}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {(hero.stats ?? []).slice(0, 8).map((stat) => (
            <span key={stat.label} className="rounded bg-muted px-2 py-1">
              {stat.label}: {stat.value}
            </span>
          ))}
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" disabled>
        Otworz pelna karte (w kolejnym kroku)
      </Button>
    </div>
  );
}
