import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SavedNpc } from "@/components/character-sheet/types";
import { getNpcCombatStats, getNpcDisplayName } from "@/components/character-sheet/npcAccessors";
import { readStorageValue, updateStorageCollectionItem } from "@/components/global-drawer/drawerStorage";
import { useApp } from "@/context/AppContext";

const NPC_STORAGE_KEY = "rpg_saved_npcs";

interface NpcDrawerViewProps {
  id: string;
}

export function NpcDrawerView({ id }: NpcDrawerViewProps) {
  const { setCombatants } = useApp();
  const [npc, setNpc] = useState<SavedNpc | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const all = readStorageValue<SavedNpc[]>(NPC_STORAGE_KEY, []);
    setNpc(all.find((item) => item.id === id) ?? null);
  }, [id]);

  const displayName = useMemo(() => (npc ? getNpcDisplayName(npc) : "NPC"), [npc]);

  const updateNpc = (patch: Partial<SavedNpc>) => {
    if (!npc) {
      return;
    }
    const next = { ...npc, ...patch };
    setNpc(next);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      updateStorageCollectionItem<SavedNpc>(NPC_STORAGE_KEY, id, (item) => ({ ...item, ...patch }));
    }, 500);
  };

  const addToCombat = () => {
    if (!npc) {
      return;
    }
    const stats = getNpcCombatStats(npc);
    setCombatants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: getNpcDisplayName(npc),
        initiative: stats.initiative,
        ww: stats.ww,
        us: stats.us,
        sb: stats.sb,
        hp: { current: stats.hp, max: Math.max(1, stats.hp) },
        armor: stats.armor,
        toughness: stats.toughness,
        statuses: [],
        notes: stats.notes,
        isEnemy: true,
      },
    ]);
  };

  if (!npc) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono NPC.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{displayName}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input value={npc.daneOgolne.obecnaProfesja} onChange={(e) => updateNpc({ daneOgolne: { ...npc.daneOgolne, obecnaProfesja: e.target.value } })} placeholder="Profesja" />
          <Input value={npc.daneOgolne.rasa} onChange={(e) => updateNpc({ daneOgolne: { ...npc.daneOgolne, rasa: e.target.value } })} placeholder="Rasa" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={npc.cechyGlowne.p.ww} onChange={(e) => updateNpc({ cechyGlowne: { ...npc.cechyGlowne, p: { ...npc.cechyGlowne.p, ww: e.target.value } } })} placeholder="WW" />
        <Input value={npc.cechyGlowne.p.us} onChange={(e) => updateNpc({ cechyGlowne: { ...npc.cechyGlowne, p: { ...npc.cechyGlowne.p, us: e.target.value } } })} placeholder="US" />
      </div>
      <Textarea
        value={npc.notatkiMG}
        onChange={(e) => updateNpc({ notatkiMG: e.target.value })}
        className="min-h-[140px]"
        placeholder="Notatki MG..."
      />
      <Button type="button" onClick={addToCombat} className="w-full">
        Dodaj do walki
      </Button>
    </div>
  );
}
