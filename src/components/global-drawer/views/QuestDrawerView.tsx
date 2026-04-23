import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readStorageValue, writeStorageValue } from "@/components/global-drawer/drawerStorage";

const QUEST_STORAGE_KEY = "rpg_quests";

interface QuestRecord {
  id: string;
  title: string;
  type: string;
  column: string;
  notes: string;
  linkedNpcs: string[];
  linkedQuests: string[];
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface QuestStorage {
  quests: QuestRecord[];
  order: Record<string, string[]>;
}

interface QuestDrawerViewProps {
  id: string;
}

export function QuestDrawerView({ id }: QuestDrawerViewProps) {
  const [state, setState] = useState<QuestStorage>({ quests: [], order: {} });
  const saveTimer = useRef<number | null>(null);
  const quest = state.quests.find((entry) => entry.id === id) ?? null;

  useEffect(() => {
    setState(readStorageValue<QuestStorage>(QUEST_STORAGE_KEY, { quests: [], order: {} }));
  }, [id]);

  const updateQuest = (patch: Partial<QuestRecord>) => {
    if (!quest) return;
    const nextState: QuestStorage = {
      ...state,
      quests: state.quests.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry,
      ),
    };
    setState(nextState);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      writeStorageValue(QUEST_STORAGE_KEY, nextState);
    }, 500);
  };

  if (!quest) return <p className="text-sm text-muted-foreground">Nie znaleziono watku.</p>;

  return (
    <div className="space-y-3">
      <Input value={quest.title} onChange={(e) => updateQuest({ title: e.target.value })} placeholder="Tytul" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={quest.type} onChange={(e) => updateQuest({ type: e.target.value })} placeholder="Typ" />
        <Input value={quest.column} onChange={(e) => updateQuest({ column: e.target.value })} placeholder="Status" />
      </div>
      <Textarea value={quest.notes} onChange={(e) => updateQuest({ notes: e.target.value })} className="min-h-[160px]" placeholder="Notatki MG" />
      {quest.column !== "gorace" ? (
        <Button type="button" variant="secondary" onClick={() => updateQuest({ column: "gorace" })} className="w-full">
          Przenies do Goracych
        </Button>
      ) : null}
    </div>
  );
}
