import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStorageValue, updateStorageCollectionItem } from "@/components/global-drawer/drawerStorage";
import { useApp } from "@/context/AppContext";
import type { GmEnemy } from "@/lib/gmEnemy";
import { gmEnemyToCombatant, reviveGmEnemies } from "@/lib/gmEnemy";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";

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
    const raw = readStorageValue<unknown[]>(MONSTER_STORAGE_KEY, []);
    const all = reviveGmEnemies(raw);
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
        const c = gmEnemyToCombatant(monster);
        next.push({
          ...c,
          name: count > 1 ? `${monster.name} ${i + 1}` : c.name,
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
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">
            <StatAbbrWithTooltip statKey="ww">WW</StatAbbrWithTooltip>
          </div>
          <Input value={String(monster.ww)} onChange={(e) => updateMonster({ ww: Number(e.target.value) || 0 })} placeholder="WW" />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">
            <StatAbbrWithTooltip statKey="zyw">Żyw</StatAbbrWithTooltip>
          </div>
          <Input value={String(monster.hp)} onChange={(e) => updateMonster({ hp: Number(e.target.value) || 1 })} placeholder="Żyw" />
        </div>
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
