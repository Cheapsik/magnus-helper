import { NpcDrawerView } from "@/components/global-drawer/views/NpcDrawerView";
import { MonsterDrawerView } from "@/components/global-drawer/views/MonsterDrawerView";
import { ItemDrawerView } from "@/components/global-drawer/views/ItemDrawerView";
import { QuestDrawerView } from "@/components/global-drawer/views/QuestDrawerView";
import { HeroDrawerView } from "@/components/global-drawer/views/HeroDrawerView";
import type { DrawerEntityType, DrawerStackItem } from "@/context/DrawerContext";

export type EntityPreviewType = Extract<DrawerEntityType, "npc" | "monster" | "item" | "quest" | "hero">;

interface DrawerContentProps {
  item: DrawerStackItem;
}

export function renderEntityPreview(type: EntityPreviewType, id: string) {
  switch (type) {
    case "npc":
      return <NpcDrawerView id={id} />;
    case "monster":
      return <MonsterDrawerView id={id} />;
    case "item":
      return <ItemDrawerView id={id} />;
    case "quest":
      return <QuestDrawerView id={id} />;
    case "hero":
      return <HeroDrawerView id={id} />;
    default:
      return null;
  }
}

export function DrawerContent({ item }: DrawerContentProps) {
  if (item.type === "npc" || item.type === "monster" || item.type === "item" || item.type === "quest" || item.type === "hero") {
    return renderEntityPreview(item.type, item.id);
  }

  return <p className="text-sm text-muted-foreground">Ten typ widoku nie jest jeszcze obslugiwany.</p>;
}
