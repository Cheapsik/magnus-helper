import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { LootDbItem } from "@/lib/lootDb";
import { readStorageValue, updateStorageCollectionItem } from "@/components/global-drawer/drawerStorage";

const ITEMS_STORAGE_KEY = "rpg_items_db";

interface ItemDrawerViewProps {
  id: string;
}

export function ItemDrawerView({ id }: ItemDrawerViewProps) {
  const [item, setItem] = useState<LootDbItem | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const all = readStorageValue<LootDbItem[]>(ITEMS_STORAGE_KEY, []);
    setItem(all.find((entry) => entry.id === id) ?? null);
  }, [id]);

  const updateItem = (patch: Partial<LootDbItem>) => {
    if (!item) return;
    setItem({ ...item, ...patch });
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateStorageCollectionItem<LootDbItem>(ITEMS_STORAGE_KEY, id, (entry) => ({ ...entry, ...patch }));
    }, 500);
  };

  if (!item) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono przedmiotu.</p>;
  }

  return (
    <div className="space-y-3">
      <Input value={item.name} onChange={(e) => updateItem({ name: e.target.value })} placeholder="Nazwa" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={item.type} onChange={(e) => updateItem({ type: e.target.value })} placeholder="Typ" />
        <Input value={item.rankName} onChange={(e) => updateItem({ rankName: e.target.value })} placeholder="Ranga" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={String(item.price)} onChange={(e) => updateItem({ price: Math.max(0, Number(e.target.value) || 0) })} placeholder="Cena" />
        <Input value={item.currency} onChange={(e) => updateItem({ currency: e.target.value })} placeholder="Waluta" />
      </div>
      <Textarea value={item.description} onChange={(e) => updateItem({ description: e.target.value })} className="min-h-[120px]" placeholder="Opis" />
      <Badge variant="outline" className="w-fit">
        Ranga: {item.rankName}
      </Badge>
    </div>
  );
}
