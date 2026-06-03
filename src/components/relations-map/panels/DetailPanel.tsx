import { Pencil, Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { typeColor, statusLabel } from "../colors";
import { Field } from "../shared/FormBits";
import { TagEditor, QuickHistoryAdder } from "../shared/TagEditor";
import { useRelationsMap } from "../context/RelationsMapContext";
import { getSessionName } from "../storage";

export function DetailPanel() {
  const {
    detailPanelOpen,
    setDetailPanelOpen,
    sessionMode,
    selectedNodeId,
    editingNode,
    editingEntity,
    editingFullNpc,
    editingFullHero,
    editingEdges,
    lookup,
    persisted,
    activeTab,
    setActiveTab,
    handleTogglePin,
    allTags,
    addTag,
    removeTag,
    updateNodeMeta,
    addNodeHistory,
    onEditEdge,
  } = useRelationsMap();

  if (!detailPanelOpen) return null;
  if (sessionMode && !selectedNodeId) return null;

  const lastChange = editingEdges.find((e) => e.changedSince);
  const currentSession = getSessionName(persisted);

  return (
    <aside
      className={cn(
        "shrink-0 border-l border-border bg-card/50 flex flex-col min-h-0 overflow-hidden",
        sessionMode ? "w-[300px]" : "w-[340px]"
      )}
    >
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg truncate text-foreground">
              {editingEntity?.name || "Szczegóły"}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {editingNode
                ? editingNode.type === "npc"
                  ? "Karta NPC"
                  : "Karta Bohatera"
                : "Kliknij postać na mapie"}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {editingNode && (
              <Button
                size="sm"
                variant={editingNode.pinned ? "default" : "outline"}
                onClick={() => handleTogglePin(editingNode.id)}
                className="h-7 px-2"
              >
                <Pin className="h-3 w-3" fill={editingNode.pinned ? "currentColor" : "none"} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setDetailPanelOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {editingNode && (
          <>
            <TagEditor
              tags={editingNode.tags ?? []}
              onAdd={(t) => addTag(editingNode.id, t)}
              onRemove={(t) => removeTag(editingNode.id, t)}
              suggestions={allTags}
            />
            {(lastChange || currentSession) && (
              <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/60 pt-2">
                {lastChange?.changedSince && (
                  <div>Ostatnia zmiana relacji: sesja oznaczona NEW</div>
                )}
                {currentSession && <div>Bieżąca sesja: {currentSession}</div>}
              </div>
            )}
          </>
        )}
      </div>

      {!editingNode ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Wybierz postać na grafie, aby zobaczyć opis, relacje i notatki MG.
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <TabsList className="grid grid-cols-3 h-8 shrink-0 mt-2">
            <TabsTrigger value="opis" className="text-[10px]">
              Opis
            </TabsTrigger>
            <TabsTrigger value="relacje" className="text-[10px]">
              Relacje
            </TabsTrigger>
            <TabsTrigger value="mg" className="text-[10px]">
              MG
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 mt-3">
            <TabsContent value="opis" className="space-y-3 mt-0 text-sm">
              {editingFullNpc && (
                <>
                  <Field label="Profesja" value={editingFullNpc.daneOgolne.obecnaProfesja} />
                  <Field label="Cechy" value={editingFullNpc.cechyCharakteru} />
                  <Field label="Opis" value={editingFullNpc.opisOgolny} multiline />
                </>
              )}
              {editingFullHero && (
                <>
                  <Field label="Rasa" value={editingFullHero.daneOgolne.rasa} />
                  <Field label="Profesja" value={editingFullHero.daneOgolne.obecnaProfesja} />
                  <Field label="Znaki" value={editingFullHero.opis.znakiSzczegolne} multiline />
                </>
              )}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Opis (mapa)
                </Label>
                <Textarea
                  value={editingNode.meta?.description ?? ""}
                  onChange={(e) =>
                    updateNodeMeta(editingNode.id, { description: e.target.value })
                  }
                  rows={3}
                  className="text-xs mt-1"
                />
              </div>
            </TabsContent>

            <TabsContent value="relacje" className="mt-0 space-y-2">
              {editingEdges.length === 0 && (
                <p className="text-xs text-muted-foreground">Brak relacji.</p>
              )}
              {editingEdges.map((e) => {
                const otherId = e.source === editingNode.id ? e.target : e.source;
                const otherEntId = persisted.nodes.find((n) => n.id === otherId)?.entityId;
                const other = lookup.get(otherEntId ?? "");
                const label = e.customType || e.relationType;
                return (
                  <div key={e.id} className="border border-border p-2 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: typeColor(label) }}
                      >
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditEdge(e.id)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm">→ {other?.name || "?"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {statusLabel[e.status ?? "aktywna"]} · siła {e.strength ?? 3}/5
                    </div>
                    {e.description && (
                      <div className="text-xs text-foreground/80 italic mt-1">{e.description}</div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="mg" className="mt-0 space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sekrety
                </Label>
                <Textarea
                  value={editingNode.meta?.secrets ?? ""}
                  onChange={(e) => updateNodeMeta(editingNode.id, { secrets: e.target.value })}
                  rows={4}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cele
                </Label>
                <Textarea
                  value={editingNode.meta?.goals ?? ""}
                  onChange={(e) => updateNodeMeta(editingNode.id, { goals: e.target.value })}
                  rows={3}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notatki
                </Label>
                <Textarea
                  value={editingNode.meta?.notes ?? ""}
                  onChange={(e) => updateNodeMeta(editingNode.id, { notes: e.target.value })}
                  rows={3}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                  Historia
                </Label>
                <QuickHistoryAdder onAdd={(m) => addNodeHistory(editingNode.id, m)} />
                {(editingNode.meta?.history ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Brak wpisów.</p>
                )}
                {(editingNode.meta?.history ?? [])
                  .slice()
                  .reverse()
                  .map((h) => (
                    <div key={h.id} className="border-l-2 border-primary/60 pl-2 py-1 mb-1">
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(h.ts).toLocaleString()}
                        {h.session && ` · ${h.session}`}
                      </div>
                      <div className="text-xs">{h.message}</div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </aside>
  );
}
