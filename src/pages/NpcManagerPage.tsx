import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Users, Plus, Trash2, Edit2, Dice5, ArrowLeft, Swords, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { SavedNpc } from "@/context/AppContext";
import { CharacterSheet } from "@/components/character-sheet/CharacterSheet";
import { createEmptyNpc } from "@/components/character-sheet/factory";
import { generateRandomNpcSheet } from "@/components/character-sheet/random";
import { getNpcCombatStats, getNpcDisplayName } from "@/components/character-sheet/npcAccessors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const NPC_DRAG = "text/magnus-npc-id";

type NpcDropHighlight = null | { kind: "group"; id: string } | { kind: "ungrouped" };

function isNpcDragEvent(e: React.DragEvent) {
  return Boolean(e.dataTransfer.types?.includes?.(NPC_DRAG));
}

function NpcListCard({
  npc,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onCombat,
  onRemove,
}: {
  npc: SavedNpc;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onCombat: () => void;
  onRemove: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(NPC_DRAG, npc.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "transition-[opacity,transform,box-shadow] duration-200 ease-out",
        isDragging && "opacity-45 scale-[0.98] shadow-lg ring-2 ring-primary/30 z-10",
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground mt-1 shrink-0 cursor-grab active:cursor-grabbing" title="Przeciągnij">
            <GripVertical className="h-4 w-4" />
          </span>
          <button
            type="button"
            className="min-w-0 text-left flex-1 rounded-md hover:bg-muted/50 -m-1 p-1 transition-colors"
            onClick={onOpen}
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
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onOpen} aria-label="Edytuj">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 px-2" onClick={onCombat}>
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
                  <AlertDialogAction onClick={onRemove}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
}

function GroupName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  if (editing) {
    return (
      <Input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          onRename(val.trim() || name);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRename(val.trim() || name);
            setEditing(false);
          }
        }}
        className="h-8 text-sm font-semibold w-44"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setVal(name);
        setEditing(true);
      }}
      className="text-sm font-semibold text-foreground hover:underline"
    >
      {name}
    </button>
  );
}

export default function NpcManagerPage() {
  const { savedNpcs, setSavedNpcs, setCombatants, npcGroups, setNpcGroups } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNewUnsaved, setIsNewUnsaved] = useState(false);
  const [dragNpcId, setDragNpcId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<NpcDropHighlight>(null);

  const resetDragUi = useCallback(() => {
    setDragNpcId(null);
    setDropHighlight(null);
  }, []);

  useEffect(() => {
    if (!dragNpcId) return;
    document.addEventListener("dragend", resetDragUi);
    return () => document.removeEventListener("dragend", resetDragUi);
  }, [dragNpcId, resetDragUi]);

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

  const moveNpcToGroup = (npcId: string, groupId: string | undefined) => {
    setSavedNpcs((prev) => prev.map((n) => (n.id === npcId ? { ...n, npcGroupId: groupId } : n)));
  };

  const toggleGroupCollapse = (id: string) => {
    setNpcGroups((prev) => prev.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)));
  };

  const renameGroup = (id: string, name: string) => {
    setNpcGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: name.trim() || g.name } : g)));
  };

  const deleteGroup = (id: string) => {
    if (!confirm("Usunąć grupę? NPC trafią do „Bez grupy”.")) return;
    setSavedNpcs((prev) => prev.map((n) => (n.npcGroupId === id ? { ...n, npcGroupId: undefined } : n)));
    setNpcGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const addGroup = () => {
    setNpcGroups((prev) => [...prev, { id: genId(), name: "Nowa grupa", collapsed: false }]);
  };

  const groupIdSet = useMemo(() => new Set(npcGroups.map((g) => g.id)), [npcGroups]);
  const uncategorized = useMemo(
    () => savedNpcs.filter((n) => !n.npcGroupId || !groupIdSet.has(n.npcGroupId)),
    [savedNpcs, groupIdSet],
  );

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
        hp: { current: c.hp, max: Math.max(1, c.hpMax) },
        armor: c.armor,
        toughness: c.toughness,
        statuses: [],
        notes: c.notes || c.weapon,
        isEnemy: true,
      },
    ]);
    toast.success(`Dodano ${getNpcDisplayName(npc)} do walki`);
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
        <h1 className="font-app-brand text-lg font-bold flex items-center gap-2">
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

      {savedNpcs.length === 0 && npcGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Brak zapisanych NPC. Użyj „Losuj” lub „Nowy”, aby dodać kartę.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {npcGroups.map((g) => {
            const inGroup = savedNpcs.filter((n) => n.npcGroupId === g.id);
            const groupDropActive = dropHighlight?.kind === "group" && dropHighlight.id === g.id;
            return (
              <section
                key={g.id}
                className={cn(
                  "space-y-2 rounded-lg border-2 border-transparent p-1 -m-0.5 transition-[border-color,background-color,box-shadow] duration-200 ease-out",
                  groupDropActive && "border-primary/55 bg-primary/[0.08] shadow-md ring-1 ring-primary/20",
                )}
                onDragOver={(e) => {
                  if (!isNpcDragEvent(e)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropHighlight({ kind: "group", id: g.id });
                }}
                onDrop={(e) => {
                  if (!isNpcDragEvent(e)) return;
                  const npcId = e.dataTransfer.getData(NPC_DRAG);
                  if (!npcId) return;
                  e.preventDefault();
                  moveNpcToGroup(npcId, g.id);
                  resetDragUi();
                }}
              >
                <div className="flex items-center gap-2 group rounded-md border border-border/50 bg-card/40 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(g.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {g.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  <GroupName name={g.name} onRename={(n) => renameGroup(g.id, n)} />
                  <span className="text-xs text-muted-foreground">{inGroup.length} NPC</span>
                  <button
                    type="button"
                    onClick={() => deleteGroup(g.id)}
                    className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Usuń grupę"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {!g.collapsed && (
                  <div className="space-y-2 pl-1">
                    {inGroup.length === 0 ? (
                      <p
                        className={cn(
                          "text-xs text-muted-foreground px-2 py-3 border border-dashed rounded-md text-center transition-colors duration-200",
                          groupDropActive && "border-primary/60 bg-primary/5 text-foreground",
                        )}
                      >
                        {dragNpcId
                          ? "Upuść kartę tutaj, aby dodać do tej grupy."
                          : "Brak NPC w tej grupie — przeciągnij kartę tutaj lub przypisz grupę w edycji karty."}
                      </p>
                    ) : (
                      inGroup.map((npc) => (
                        <NpcListCard
                          key={npc.id}
                          npc={npc}
                          isDragging={dragNpcId === npc.id}
                          onDragStart={() => setDragNpcId(npc.id)}
                          onDragEnd={resetDragUi}
                          onOpen={() => openSheet(npc)}
                          onCombat={() => addToCombat(npc)}
                          onRemove={() => removeNpc(npc.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}

          <section
            className={cn(
              "space-y-2 rounded-lg border-2 border-dashed border-border/60 px-2 py-2 transition-[border-color,background-color,box-shadow] duration-200 ease-out",
              dropHighlight?.kind === "ungrouped" && "border-primary/60 bg-primary/[0.08] shadow-md ring-1 ring-primary/20",
            )}
            onDragOver={(e) => {
              if (!isNpcDragEvent(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropHighlight({ kind: "ungrouped" });
            }}
            onDrop={(e) => {
              if (!isNpcDragEvent(e)) return;
              const npcId = e.dataTransfer.getData(NPC_DRAG);
              if (!npcId) return;
              e.preventDefault();
              moveNpcToGroup(npcId, undefined);
              resetDragUi();
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bez grupy
              {dragNpcId ? (
                <span className="mt-1 block font-normal normal-case text-[11px] text-primary/90">
                  Upuść kartę tutaj, aby przenieść poza grupy.
                </span>
              ) : null}
            </div>
            {uncategorized.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 pb-1">Wszyscy NPC są w grupach.</p>
            ) : (
              <div className="space-y-2">
                {uncategorized.map((npc) => (
                  <NpcListCard
                    key={npc.id}
                    npc={npc}
                    isDragging={dragNpcId === npc.id}
                    onDragStart={() => setDragNpcId(npc.id)}
                    onDragEnd={resetDragUi}
                    onOpen={() => openSheet(npc)}
                    onCombat={() => addToCombat(npc)}
                    onRemove={() => removeNpc(npc.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={addGroup}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj grupę
          </Button>
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
  const { npcGroups } = useApp();
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

      <div className="px-4 py-3 border-b border-border/60 bg-muted/15 max-w-3xl space-y-1.5 font-sans text-foreground">
        <Label className="text-xs text-muted-foreground">Grupa</Label>
        <Select
          value={draft.npcGroupId ?? "__none__"}
          onValueChange={(v) =>
            setDraft((d) => ({ ...d, npcGroupId: v === "__none__" ? undefined : v }))
          }
        >
          <SelectTrigger
            className={cn(
              "h-9 text-sm max-w-md font-sans font-normal",
              "border-border/70 bg-background text-foreground",
              "hover:bg-muted/60 focus:ring-primary/30",
            )}
          >
            <SelectValue placeholder="Bez grupy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Bez grupy</SelectItem>
            {npcGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CharacterSheet value={draft} onChange={setDraft} />
    </div>
  );
}
