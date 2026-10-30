import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCards } from "@/lib/cardStore";
import { useClocks } from "@/lib/clocks";
import { defaultReputationLadder, FACTIONS_KEY, newFaction, REPUTATION_LADDER_KEY, type Faction, type ReputationChange, type ReputationTier } from "@/lib/factions";
import { applyReputationChange, FACTION_RELATIONS_KEY, FACTION_THRESHOLDS_KEY, type FactionRelation, type ReputationThreshold } from "@/lib/factionRelations";
import { FactionRelationsGraph } from "@/components/factions/FactionRelationsGraph";
import { ReputationThresholdEditor } from "@/components/factions/ReputationThresholdEditor";
import { FactionCard } from "@/components/factions/FactionCard";
import { ReputationLadderEditor } from "@/components/factions/ReputationLadderEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function FactionsPage() {
  const [factions, setFactions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);
  const [ladder, setLadder] = useLocalStorage<ReputationTier[]>(REPUTATION_LADDER_KEY, defaultReputationLadder());
  const [relations, setRelations] = useLocalStorage<FactionRelation[]>(FACTION_RELATIONS_KEY, []);
  const [thresholds, setThresholds] = useLocalStorage<ReputationThreshold[]>(FACTION_THRESHOLDS_KEY, []);
  const [reminders, setReminders] = useState<string[]>([]);
  const [npcs] = useCards("npc");
  const [heroes] = useCards("hero");
  const [clocks] = useClocks();
  const { noteSessionCatalog } = useApp();
  const [newName, setNewName] = useState("");

  const addFaction = () => {
    const name = newName.trim();
    if (!name) return;
    setFactions((prev) => [...prev, newFaction(name)]);
    setNewName("");
  };

  const updateFaction = (id: string, patch: Partial<Faction>) =>
    setFactions((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  // The card already logged the change on its own faction; this adds linked factions' share and threshold reminders.
  const onLogged = (sourceId: string, change: ReputationChange) => {
    const result = applyReputationChange(factions, relations, thresholds, sourceId, change);
    setFactions((prev) => prev.map((f) => (f.id === sourceId ? f : result.factions.find((x) => x.id === f.id) ?? f)));
    setReminders((prev) => [...prev, ...result.reminders]);
  };

  const deleteFaction = (id: string) =>
    setFactions((prev) =>
      prev.filter((f) => f.id !== id).map((f) => {
        const { [id]: _removed, ...relations } = f.relations;
        return { ...f, relations };
      }),
    );

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="space-y-1.5">
        <label className="field-label block">Frakcje ({factions.length})</label>
        {factions.length === 0 ? (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Brak frakcji</CardContent></Card>
        ) : (
          factions.map((f) => (
            <FactionCard
              key={f.id}
              faction={f}
              others={factions.filter((o) => o.id !== f.id)}
              ladder={ladder}
              npcs={npcs}
              heroes={heroes}
              clocks={clocks}
              sessions={noteSessionCatalog.sessions}
              activeSessionId={noteSessionCatalog.activeSessionId}
              onChange={(patch) => updateFaction(f.id, patch)}
              onLogged={(change) => onLogged(f.id, change)}
              onDelete={() => deleteFaction(f.id)}
            />
          ))
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFaction()}
            placeholder="Nazwa nowej frakcji…"
            className="field flex-1"
          />
          <Button size="sm" onClick={addFaction} className="gap-1"><Plus className="h-3.5 w-3.5" />Dodaj</Button>
        </div>
      </section>

      {reminders.length > 0 && (
        <Card>
          <CardContent className="space-y-1 p-3 text-sm">
            <label className="field-label block">Przypomnienia o progach</label>
            {reminders.map((r, i) => <div key={i}>{r}</div>)}
            <Button size="sm" variant="outline" onClick={() => setReminders([])}>Odrzuć</Button>
          </CardContent>
        </Card>
      )}

      <Collapsible>
        <CollapsibleTrigger className="field-label">Relacje między frakcjami ({relations.length}) ▾</CollapsibleTrigger>
        <CollapsibleContent className="pt-1.5">
          <FactionRelationsGraph factions={factions} relations={relations} onChange={setRelations} />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="field-label">Efekty progów reputacji ({thresholds.length}) ▾</CollapsibleTrigger>
        <CollapsibleContent className="pt-1.5">
          <ReputationThresholdEditor factions={factions} thresholds={thresholds} onChange={setThresholds} />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="field-label">Drabina reputacji ({ladder.length} progów) ▾</CollapsibleTrigger>
        <CollapsibleContent className="pt-1.5">
          <ReputationLadderEditor ladder={ladder} onChange={setLadder} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
