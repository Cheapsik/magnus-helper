import { NpcDrawerView } from "@/components/global-drawer/views/NpcDrawerView";
import { MonsterDrawerView } from "@/components/global-drawer/views/MonsterDrawerView";
import { ItemDrawerView } from "@/components/global-drawer/views/ItemDrawerView";
import { QuestDrawerView } from "@/components/global-drawer/views/QuestDrawerView";
import { HeroDrawerView } from "@/components/global-drawer/views/HeroDrawerView";
import type { DrawerStackItem } from "@/context/DrawerContext";

interface DrawerContentProps {
  item: DrawerStackItem;
}

export function DrawerContent({ item }: DrawerContentProps) {
  switch (item.type) {
    case "npc":
      return <NpcDrawerView id={item.id} />;
    case "monster":
      return <MonsterDrawerView id={item.id} />;
    case "item":
      return <ItemDrawerView id={item.id} />;
    case "quest":
      return <QuestDrawerView id={item.id} />;
    case "hero":
      return <HeroDrawerView id={item.id} />;
    default:
      return <p className="text-sm text-muted-foreground">Ten typ widoku nie jest jeszcze obslugiwany.</p>;
  }
}
