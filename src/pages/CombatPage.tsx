import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Flag } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Combatant } from "@/context/AppContext";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logChronicleEvent } from "@/lib/chronicle";
import { cn } from "@/lib/utils";
import { FightTabsBar } from "@/components/combat/FightTabsBar";
import { CombatPresetsMobileTab } from "@/components/combat/CombatPresetsPanel";
import { CombatRosterPanel } from "@/components/combat/CombatRosterPanel";
import { CombatViewModeNav, type CombatViewMode } from "@/components/combat/CombatViewModeNav";
import { CombatTurnBar } from "@/components/combat/CombatTurnBar";
import { CombatantCard } from "@/components/combat/CombatantCard";
import { CombatSidePanel } from "@/components/combat/CombatSidePanel";
import { CombatAttackPanel } from "@/components/combat/CombatAttackPanel";
import { CombatantFormFields, emptyCombatant } from "@/components/combat/CombatantFormFields";
import { ROSTER_CARD_DRAG, isCombatRosterDragEvent, parseRosterCardKey } from "@/lib/combatDrag";
import { readCards, useCampaignSystem } from "@/lib/cardStore";
import { cardToCombatant } from "@/lib/cardRoster";
import { readNumberRef } from "@/lib/cardSchema";
import { rollDie } from "@/lib/dice";
import { useFinePointer } from "@/hooks/useFinePointer";
import {
  MAX_COMBAT_FIGHTS,
  addPresetFromFight,
  createEmptyFight,
  removeFight,
  renameFight,
  setActiveFightId,
  setFightStatus,
} from "@/lib/combatSessions";

/** A participant whose main resource ran out (only when the tracker knows a maximum). */
function isOut(c: Combatant): boolean {
  return c.resource.max > 0 && c.resource.current <= 0;
}

function clampResource(c: Combatant, value: number): number {
  const floored = Math.max(0, value);
  return c.resource.max > 0 ? Math.min(c.resource.max, floored) : floored;
}

export default function CombatPage() {
  const location = useLocation();
  const {
    combatants,
    setCombatants,
    combatRound,
    setCombatRound,
    combatTurn,
    setCombatTurn,
    combatSessions,
    setCombatSessions,
  } = useApp();
  const [system] = useCampaignSystem();
  const conditionNames = useMemo(() => system.conditions.map((condition) => condition.name), [system.conditions]);
  const [combatTab, setCombatTab] = useState<CombatViewMode>("walka");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Combatant | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDead, setShowDead] = useState(true);
  const [actionAttackerId, setActionAttackerId] = useState<string | null>(null);

  const [newCombatant, setNewCombatant] = useState<Combatant>(() => emptyCombatant());
  const [showAddForm, setShowAddForm] = useState(false);

  const finePointer = useFinePointer();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [fightDropActive, setFightDropActive] = useState(false);
  const isDraggingRoster = dragKey !== null;

  const resetDragUi = useCallback(() => {
    setDragKey(null);
    setFightDropActive(false);
  }, []);

  useEffect(() => {
    if (!isDraggingRoster) return;
    document.addEventListener("dragend", resetDragUi);
    return () => document.removeEventListener("dragend", resetDragUi);
  }, [isDraggingRoster, resetDragUi]);

  useEffect(() => {
    const tab = (location.state as { combatTab?: string } | null)?.combatTab;
    if (tab === "potwory") setCombatTab("potwory");
  }, [location.state]);

  useEffect(() => {
    setEditingId(null);
    setEditDraft(null);
    setExpandedId(null);
    setActionAttackerId(null);
    setShowAddForm(false);
  }, [combatSessions.activeFightId]);

  const sorted = useMemo(() => [...combatants].sort((a, b) => b.initiative - a.initiative), [combatants]);
  const displayed = showDead ? sorted : sorted.filter((c) => !isOut(c));

  const addCombatant = () => {
    if (!newCombatant.name.trim()) return;
    setCombatants((prev) => [...prev, { ...newCombatant, id: crypto.randomUUID(), name: newCombatant.name.trim() }]);
    setNewCombatant(emptyCombatant({ isEnemy: newCombatant.isEnemy }));
    setShowAddForm(false);
  };

  const removeCombatant = (id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
    if (actionAttackerId === id) setActionAttackerId(null);
    if (combatTurn >= sorted.length - 1) setCombatTurn(0);
  };

  const duplicateCombatant = (c: Combatant) => {
    setCombatants((prev) => [
      ...prev,
      { ...c, id: crypto.randomUUID(), name: `${c.name} (kopia)`, resource: { ...c.resource, current: c.resource.max }, statuses: [] },
    ]);
  };

  const adjustResource = (id: string, delta: number) => {
    setCombatants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resource: { ...c.resource, current: clampResource(c, c.resource.current + delta) } } : c)),
    );
  };

  const nextTurn = () => {
    if (sorted.length === 0) return;
    if (combatTurn >= sorted.length - 1) { setCombatTurn(0); setCombatRound((r) => r + 1); }
    else setCombatTurn((t) => t + 1);
    setActionAttackerId(null);
  };

  const prevTurn = () => {
    if (sorted.length === 0) return;
    if (combatTurn <= 0) {
      if (combatRound > 1) { setCombatTurn(sorted.length - 1); setCombatRound((r) => r - 1); }
    } else setCombatTurn((t) => t - 1);
    setActionAttackerId(null);
  };

  // N / Shift+N move the turn without reaching for the mouse; ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      (e.shiftKey ? prevTurn : nextTurn)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const resetCombat = () => { setCombatTurn(0); setCombatRound(1); setActionAttackerId(null); };

  const rollAllInitiative = () => {
    setCombatants((prev) =>
      prev.map((c) => {
        let base = 0;
        if (c.card) {
          const cardType = system.cards[c.card.kind];
          const ref = cardType.roles.initiative;
          if (ref) {
            const card = readCards(c.card.kind).find((x) => x.id === c.card!.id);
            if (card) base = readNumberRef(card.values, ref);
          }
        }
        return { ...c, initiative: rollDie(20) + base };
      }),
    );
    setCombatTurn(0);
    toast.success("Wylosowano inicjatywę");
  };

  const toggleStatus = (id: string, status: string) => {
    setCombatants((prev) => prev.map((c) =>
      c.id === id ? { ...c, statuses: c.statuses.includes(status) ? c.statuses.filter((s) => s !== status) : [...c.statuses, status] } : c
    ));
  };

  const startEdit = (c: Combatant) => { setEditingId(c.id); setEditDraft({ ...c }); };
  const saveEdit = () => {
    if (!editDraft) return;
    setCombatants((prev) => prev.map((c) => c.id === editDraft.id ? editDraft : c));
    setEditingId(null); setEditDraft(null);
  };

  const activeFight = combatSessions.fights.find((f) => f.id === combatSessions.activeFightId);
  const canAddFight = combatSessions.fights.length < MAX_COMBAT_FIGHTS;

  const handleNewFight = (presetId?: string) => {
    const preset = presetId ? combatSessions.presets.find((p) => p.id === presetId) : undefined;
    setCombatSessions((prev) => createEmptyFight(prev, preset));
    setCombatTab("walka");
    setEditingId(null);
    setActionAttackerId(null);
    setShowAddForm(false);
  };

  const handleFightDrop = (e: React.DragEvent) => {
    e.preventDefault();
    resetDragUi();
    const parsed = parseRosterCardKey(e.dataTransfer.getData(ROSTER_CARD_DRAG));
    if (!parsed) return;
    const card = readCards(parsed.kind).find((x) => x.id === parsed.id);
    if (!card) return;
    const combatant = cardToCombatant(card, system.cards[parsed.kind], parsed.kind !== "hero");
    setCombatants((prev) => [...prev, combatant]);
    toast.success(`Dodano „${combatant.name}” do walki`);
  };

  const fightDropHandlers = finePointer
    ? {
        onDragOver: (e: React.DragEvent) => {
          if (!isCombatRosterDragEvent(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setFightDropActive(true);
        },
        onDragLeave: () => setFightDropActive(false),
        onDrop: handleFightDrop,
      }
    : {};

  const renderFightBody = () => (
    <>
      {activeFight?.status === "finished" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Flag className="h-3.5 w-3.5 shrink-0" />
          <span>Ta walka jest zakończona. Wznów ją z menu zakładki (⋮).</span>
        </div>
      )}

      {isDraggingRoster && finePointer && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
          Upuść kartę tutaj, aby dodać uczestnika do walki
        </p>
      )}

      <CombatTurnBar
        combatRound={combatRound}
        combatTurn={combatTurn}
        participantCount={sorted.length}
        showDead={showDead}
        onToggleShowDead={() => setShowDead(!showDead)}
        onReset={resetCombat}
        onRollAllInitiative={sorted.length > 0 ? rollAllInitiative : undefined}
        onPrevTurn={prevTurn}
        onNextTurn={nextTurn}
        prevDisabled={sorted.length === 0 || (combatRound === 1 && combatTurn === 0)}
        nextDisabled={sorted.length === 0}
      />

      {actionAttackerId && (
        <CombatAttackPanel
          key={actionAttackerId}
          attackerId={actionAttackerId}
          combatants={combatants}
          setCombatants={setCombatants}
          onClose={() => setActionAttackerId(null)}
        />
      )}

      <div className="space-y-2 min-h-[80px]">
        {displayed.map((c) => {
          const realIndex = sorted.findIndex((s) => s.id === c.id);
          const isActive = realIndex === combatTurn;
          const isEditing = editingId === c.id;
          const isExpanded = expandedId === c.id;
          const isDead = isOut(c);

          return (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={isActive}
              isEditing={isEditing}
              isExpanded={isExpanded}
              isDead={isDead}
              editDraft={editDraft}
              onEditDraftChange={setEditDraft}
              onSaveEdit={saveEdit}
              onCancelEdit={() => {
                setEditingId(null);
                setEditDraft(null);
              }}
              onStartEdit={() => startEdit(c)}
              onDuplicate={() => duplicateCombatant(c)}
              onRemove={() => removeCombatant(c.id)}
              onAction={() => setActionAttackerId(c.id)}
              onToggleExpand={() => setExpandedId(isExpanded ? null : c.id)}
              onAdjustHp={(delta) => adjustResource(c.id, delta)}
              onToggleStatus={(status) => toggleStatus(c.id, status)}
              conditionNames={conditionNames}
            />
          );
        })}
        {sorted.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {finePointer
                ? "Brak uczestników. Przeciągnij kartę z prawej kolumny lub dodaj poniżej."
                : "Brak uczestników. Dodaj poniżej lub użyj zakładki „Potwory”."}
            </CardContent>
          </Card>
        )}
      </div>

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Dodaj uczestnika
        </button>
      ) : (
        <Card>
          <CardContent className="space-y-2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Nowy uczestnik</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Anuluj
              </Button>
            </div>
            <CombatantFormFields combatant={newCombatant} onChange={setNewCombatant} idPrefix="new" />
            <div className="flex justify-end">
              <Button size="sm" onClick={addCombatant} disabled={!newCombatant.name.trim()} className="gap-1">
                <Plus className="h-3 w-3" />
                Dodaj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in min-h-0">

      <FightTabsBar
        fights={combatSessions.fights}
        activeFightId={combatSessions.activeFightId}
        presets={combatSessions.presets}
        canAddFight={canAddFight}
        onSelectFight={(id) => {
          setCombatSessions((prev) => setActiveFightId(prev, id));
          setActionAttackerId(null);
          setEditingId(null);
        }}
        onRenameFight={(id, name) => setCombatSessions((prev) => renameFight(prev, id, name))}
        onRemoveFight={(id) => {
          setCombatSessions((prev) => removeFight(prev, id));
          setActionAttackerId(null);
        }}
        onToggleFinished={(id) => {
          const fight = combatSessions.fights.find((f) => f.id === id);
          if (!fight) return;
          if (fight.status !== "finished") logChronicleEvent({ kind: "combat", text: `Walka „${fight.name}” zakończona` });
          setCombatSessions((prev) =>
            setFightStatus(prev, id, fight.status === "finished" ? "active" : "finished"),
          );
        }}
        onNewFight={handleNewFight}
      />

      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div
          className={cn(
            "min-w-0 flex-1 space-y-3 rounded-lg border-2 border-transparent p-1 -m-1 transition-[border-color,background-color,box-shadow] duration-200",
            fightDropActive && "border-primary/50 bg-primary/[0.06] shadow-md ring-1 ring-primary/20",
          )}
          {...fightDropHandlers}
        >
          {renderFightBody()}
        </div>

        <CombatSidePanel
          className="w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-11rem)]"
          setCombatants={setCombatants}
          presets={combatSessions.presets}
          onSavePresets={(presets) => setCombatSessions((prev) => ({ ...prev, presets }))}
          onSaveAsPresetFromFight={(name) => {
            setCombatSessions((prev) => addPresetFromFight(prev, name, combatants));
          }}
          dragKey={dragKey}
          onDragStart={setDragKey}
          onDragEnd={resetDragUi}
        />
      </div>

      <div className="lg:hidden space-y-3">
        <CombatViewModeNav value={combatTab} onChange={setCombatTab} />

        {combatTab === "walka" && <div className="space-y-3">{renderFightBody()}</div>}

        {(combatTab === "potwory" || combatTab === "postacie") && (
          <div className="flex min-h-[200px] flex-col rounded-lg border border-border bg-card/40">
            <CombatRosterPanel
              key={combatTab}
              kinds={combatTab === "potwory" ? ["monster"] : ["hero", "npc"]}
              setCombatants={setCombatants}
              dragKey={dragKey}
              onDragStart={setDragKey}
              onDragEnd={resetDragUi}
            />
          </div>
        )}

        {combatTab === "presety" && (
          <CombatPresetsMobileTab
            presets={combatSessions.presets}
            onSavePresets={(presets) => setCombatSessions((prev) => ({ ...prev, presets }))}
            onSaveAsPresetFromFight={(name) => {
              setCombatSessions((prev) => addPresetFromFight(prev, name, combatants));
            }}
          />
        )}
      </div>
    </div>
  );
}