import { useEffect, useMemo, useRef, useState } from "react";
import { Users, Plus, Trash2, Edit2, Dice5, ArrowLeft, Swords } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { SavedNpc } from "@/context/AppContext";
import { CharacterSheet } from "@/components/character-sheet/CharacterSheet";
import { createEmptyNpc } from "@/components/character-sheet/factory";
import { generateRandomNpcSheet } from "@/components/character-sheet/random";
import { getNpcCombatStats, getNpcDisplayName } from "@/components/character-sheet/npcAccessors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function NpcManagerPage() {
  const { savedNpcs, setSavedNpcs, setCombatants } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNewUnsaved, setIsNewUnsaved] = useState(false);

  const activeNpc = useMemo(() => savedNpcs.find((n) => n.id === activeId) ?? null, [savedNpcs, activeId]);

  const openSheet = (npc: SavedNpc) => {
    setIsNewUnsaved(false);
    setActiveId(npc.id);
  };

  const handleNew = () => {
    const npc: SavedNpc = createEmptyNpc();
    setSavedNpcs((prev) => [...prev, npc]);
    setIsNewUnsaved(true);
    setActiveId(npc.id);
  };

  const handleGenerate = () => {
    const body = generateRandomNpcSheet();
    const npc: SavedNpc = { ...body, id: crypto.randomUUID() };
    setSavedNpcs((prev) => [...prev, npc]);
    setIsNewUnsaved(false);
    setActiveId(npc.id);
  };

  const removeNpc = (id: string) => {
    setSavedNpcs((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateNpc = (updated: SavedNpc) => {
    setIsNewUnsaved(false);
    setSavedNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const addToCombat = (npc: SavedNpc) => {
    const c = getNpcCombatStats(npc);
    setCombatants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: getNpcDisplayName(npc),
        initiative: c.initiative,
        ww: c.ww,
        us: c.us,
        sb: c.sb,
        hp: { current: c.hp, max: Math.max(1, c.hp) },
        armor: c.armor,
        toughness: c.toughness,
        statuses: [],
        notes: c.notes || c.weapon,
        isEnemy: true,
      },
    ]);
  };

  if (activeNpc) {
    return (
      <NpcSheet
        npc={activeNpc}
        isNewUnsaved={isNewUnsaved}
        onBack={() => setActiveId(null)}
        onSave={updateNpc}
        onRemove={removeNpc}
        onAddToCombat={() => addToCombat(activeNpc)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          NPC
        </h1>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={handleGenerate}>
            <Dice5 className="h-3 w-3" /> Losuj
          </Button>
          <Button size="sm" className="text-xs gap-1 h-7" onClick={handleNew}>
            <Plus className="h-3 w-3" /> Nowy
          </Button>
        </div>
      </div>

      {savedNpcs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Brak zapisanych NPC. Użyj „Losuj” lub „Nowy”, aby dodać kartę.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {savedNpcs.map((npc) => (
            <Card key={npc.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 text-left flex-1 rounded-md hover:bg-muted/50 -m-1 p-1 transition-colors"
                    onClick={() => openSheet(npc)}
                  >
                    <div className="font-semibold text-sm">{getNpcDisplayName(npc)}</div>
                    {npc.daneOgolne.obecnaProfesja && (
                      <div className="text-xs text-muted-foreground mt-0.5">{npc.daneOgolne.obecnaProfesja}</div>
                    )}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                      <span>
                        WW <span className="font-bold text-foreground">{npc.cechyGlowne.p.ww || "—"}</span>
                      </span>
                      <span>
                        US <span className="font-bold text-foreground">{npc.cechyGlowne.p.us || "—"}</span>
                      </span>
                      <span>
                        Żyw <span className="font-bold text-foreground">{npc.cechyDrugorzedne.p.zyw || "—"}</span>
                      </span>
                    </div>
                  </button>
                  <div className="flex flex-col sm:flex-row gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openSheet(npc)} aria-label="Edytuj">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs gap-1 px-2"
                      onClick={() => addToCombat(npc)}
                    >
                      <Swords className="h-3 w-3" />
                      Walka
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" aria-label="Usuń">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usunąć NPC?</AlertDialogTitle>
                          <AlertDialogDescription>
                            „{getNpcDisplayName(npc)}” zostanie usunięty z bazy (linki w questach / notatkach przestaną działać).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeNpc(npc.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NpcSheet({
  npc,
  isNewUnsaved,
  onBack,
  onSave,
  onRemove,
  onAddToCombat,
}: {
  npc: SavedNpc;
  isNewUnsaved: boolean;
  onBack: () => void;
  onSave: (n: SavedNpc) => void;
  onRemove: (id: string) => void;
  onAddToCombat: () => void;
}) {
  const [draft, setDraft] = useState<SavedNpc>(npc);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setDraft(npc);
  }, [npc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(draft), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    if (isNewUnsaved && !draft.daneOgolne.imie.trim()) {
      onRemove(npc.id);
    }
    onBack();
  };

  return (
    <div className="paper-sheet animate-fade-in">
      <div className="paper-topbar flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleBack} className="paper-back-btn min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Wróć do listy
        </button>
        <h1 className="paper-title m-0 flex-1 min-w-0">NPC: {getNpcDisplayName(draft)}</h1>
        <Button type="button" size="sm" variant="secondary" className="h-9 text-xs gap-1 shrink-0" onClick={onAddToCombat}>
          <Swords className="h-3.5 w-3.5" /> Dodaj do walki
        </Button>
      </div>

      <CharacterSheet value={draft} onChange={setDraft} />
    </div>
  );
}
