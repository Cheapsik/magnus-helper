import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStorageValue, updateStorageCollectionItem } from "@/components/global-drawer/drawerStorage";
import { useApp, type GmEnemy } from "@/context/AppContext";

const MONSTER_STORAGE_KEY = "rpg_gm_enemies";

interface MonsterDrawerViewProps {
  id: string;
}

export function MonsterDrawerView({ id }: MonsterDrawerViewProps) {
  const { setCombatants } = useApp();
  const [monster, setMonster] = useState<GmEnemy | null>(null);
  const [count, setCount] = useState(1);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const all = readStorageValue<GmEnemy[]>(MONSTER_STORAGE_KEY, []);
    setMonster(all.find((item) => item.id === id) ?? null);
  }, [id]);

  const updateMonster = (patch: Partial<GmEnemy>) => {
    if (!monster) return;
    setMonster({ ...monster, ...patch });
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateStorageCollectionItem<GmEnemy>(MONSTER_STORAGE_KEY, id, (item) => ({ ...item, ...patch }));
    }, 500);
  };

  const addToCombat = () => {
    if (!monster) return;
    setCombatants((prev) => {
      const next = [...prev];
      for (let i = 0; i < count; i += 1) {
        next.push({
          id: crypto.randomUUID(),
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          initiative: 30,
          ww: monster.ww,
          us: 25,
          sb: 3,
          hp: { current: monster.hp, max: monster.hp },
          armor: monster.armor,
          toughness: 3,
          statuses: [],
          notes: monster.weapon,
          isEnemy: true,
        });
      }
      return next;
    });
  };

  if (!monster) return <p className="text-sm text-muted-foreground">Nie znaleziono potwora.</p>;

  return (
    <div className="space-y-3">
      <Input value={monster.name} onChange={(e) => updateMonster({ name: e.target.value })} placeholder="Nazwa" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={String(monster.ww)} onChange={(e) => updateMonster({ ww: Number(e.target.value) || 0 })} placeholder="WW" />
        <Input value={String(monster.hp)} onChange={(e) => updateMonster({ hp: Number(e.target.value) || 1 })} placeholder="Zyw" />
      </div>
      <Input value={monster.weapon} onChange={(e) => updateMonster({ weapon: e.target.value })} placeholder="Zdolnosci / bron" />
      <div className="flex items-center gap-2">
        <Input
          value={String(count)}
          onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          className="w-20"
          placeholder="1"
        />
        <Button type="button" className="flex-1" onClick={addToCombat}>
          Dodaj do walki
        </Button>
      </div>
    </div>
  );
}
