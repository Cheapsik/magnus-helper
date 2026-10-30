import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SceneEditor } from "@/components/narrative/SceneEditor";
import { StoryFlowView } from "@/components/narrative/StoryFlowView";
import { SessionRecap } from "@/components/narrative/SessionRecap";
import {
  EMPTY_STATE, EMPTY_STRUCTURE, NARRATIVE_STATE_KEY, NARRATIVE_STRUCTURE_KEY,
  addDecision, enterScene, hasTag, newId, pendingTags, removeAct, removeScene, resolveSceneId, takeBranch,
  type Consequence, type NarrativeState, type NarrativeStructure, type Scene,
} from "@/lib/narrativeEngine";
import { confirmDialog } from "@/components/ui/dialogs";

const selectCls = "field";

export default function NarrativePage() {
  const { noteSessionCatalog } = useApp();
  const sessionId = noteSessionCatalog.activeSessionId;
  const [structure, setStructure] = useLocalStorage<NarrativeStructure>(NARRATIVE_STRUCTURE_KEY, EMPTY_STRUCTURE);
  const [state, setState] = useLocalStorage<NarrativeState>(NARRATIVE_STATE_KEY, EMPTY_STATE);
  const [newTag, setNewTag] = useState("");
  const [recapSessionId, setRecapSessionId] = useState(sessionId);

  const scenes = structure.scenes;
  const active = scenes.find((s) => s.id === state.activeSceneId);
  const pending = pendingTags(structure, state);
  const sceneName = (id: string) => scenes.find((s) => s.id === id)?.name || "(bez nazwy)";

  const addScene = (actId: string) =>
    setStructure((s) => ({ ...s, scenes: [...s.scenes, { id: newId(), actId, name: "Nowa scena", description: "", branches: [] }] }));
  const updateScene = (scene: Scene) => setStructure((s) => ({ ...s, scenes: s.scenes.map((x) => (x.id === scene.id ? scene : x)) }));
  const updateConsequence = (id: string, patch: Partial<Consequence>) =>
    setStructure((s) => ({ ...s, consequences: s.consequences.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  return (
    <Tabs defaultValue="play" className="space-y-4">
      <TabsList>
        <TabsTrigger value="play">Przebieg sesji</TabsTrigger>
        <TabsTrigger value="structure">Akty i sceny</TabsTrigger>
        <TabsTrigger value="consequences">Konsekwencje</TabsTrigger>
        <TabsTrigger value="recap">Podsumowanie</TabsTrigger>
      </TabsList>

      <TabsContent value="play" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Aktywna scena</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {scenes.length === 0 && <p className="text-sm text-muted-foreground">Zacznij od dodania aktów i scen w zakładce „Akty i sceny”.</p>}
            {active ? (
              <>
                <h3 className="font-medium">{active.name}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{active.description}</p>
                <div className="space-y-1">
                  {active.branches.map((b) => (
                    <Button
                      key={b.id}
                      variant="outline"
                      className="h-auto w-full justify-start whitespace-normal text-left"
                      disabled={!scenes.some((s) => s.id === b.targetSceneId)}
                      onClick={() => setState((st) => takeBranch(structure, st, b, sessionId))}
                    >
                      {b.label || "(bez nazwy)"} → {sceneName(resolveSceneId(structure, state, b.targetSceneId))}
                      {b.tag && <Badge variant="secondary" className="ml-2">{b.tag}</Badge>}
                    </Button>
                  ))}
                  {active.branches.length === 0 && <p className="text-sm text-muted-foreground">Ta scena nie ma wyjść.</p>}
                </div>
              </>
            ) : (
              scenes.length > 0 && <p className="text-sm text-muted-foreground">Wybierz scenę startową.</p>
            )}
            {scenes.length > 0 && (
              <select
                className={selectCls}
                value=""
                onChange={(e) => e.target.value && setState((st) => enterScene(structure, st, e.target.value, sessionId))}
                aria-label="Przejdź do sceny"
              >
                <option value="">Przejdź do sceny…</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{hasTag(state, s.requiresTag) ? "" : ` (wymaga: ${s.requiresTag})`}
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Ścieżka drużyny</CardTitle>
            {state.path.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setState((st) => ({ ...st, path: [], activeSceneId: null }))}>
                Wyczyść ścieżkę
              </Button>
            )}
          </CardHeader>
          <CardContent><StoryFlowView structure={structure} state={state} /></CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="structure" className="space-y-4">
        {structure.acts.map((act) => (
          <Card key={act.id}>
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <Input
                value={act.name}
                aria-label="Nazwa aktu"
                onChange={(e) => setStructure((s) => ({ ...s, acts: s.acts.map((a) => (a.id === act.id ? { ...a, name: e.target.value } : a)) }))}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Usuń akt"
                onClick={async () => (await confirmDialog(`Usunąć akt „${act.name}” wraz ze scenami?`, { confirmLabel: "Usuń", destructive: true })) && setStructure((s) => removeAct(s, act.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {scenes.filter((s) => s.actId === act.id).map((scene) => (
                <SceneEditor
                  key={scene.id}
                  scene={scene}
                  structure={structure}
                  onChange={updateScene}
                  onDelete={() => setStructure((s) => removeScene(s, scene.id))}
                />
              ))}
              <Button size="sm" variant="outline" onClick={() => addScene(act.id)}><Plus className="h-4 w-4" /> Dodaj scenę</Button>
            </CardContent>
          </Card>
        ))}
        <Button onClick={() => setStructure((s) => ({ ...s, acts: [...s.acts, { id: newId(), name: `Akt ${s.acts.length + 1}` }] }))}>
          <Plus className="h-4 w-4" /> Dodaj akt
        </Button>
      </TabsContent>

      <TabsContent value="consequences" className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Podjęte decyzje</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {state.decisions.length === 0 && <p className="text-sm text-muted-foreground">Brak zapisanych decyzji.</p>}
              {state.decisions.map((d) => (
                <Badge key={d.id} variant="secondary" className="gap-1">
                  {d.tag}
                  <button type="button" aria-label="Cofnij decyzję" onClick={() => setState((st) => ({ ...st, decisions: st.decisions.filter((x) => x.id !== d.id) }))}>×</button>
                </Badge>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setState((st) => addDecision(st, newTag, sessionId));
                setNewTag("");
              }}
            >
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Zapisz decyzję, np. oszczędzono przywódcę bandytów" />
              <Button type="submit" disabled={!newTag.trim()}>Zapisz</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Reguły: decyzja zmienia scenę</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {structure.consequences.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <Input className="min-w-48 flex-1" value={c.tag} placeholder="Jeśli podjęto decyzję…" aria-label="Tag decyzji" list="narrative-tags" onChange={(e) => updateConsequence(c.id, { tag: e.target.value })} />
                <span className="text-sm">zamień</span>
                <select className={selectCls} value={c.replaceSceneId} aria-label="Zamieniana scena" onChange={(e) => updateConsequence(c.id, { replaceSceneId: e.target.value })}>
                  <option value="">wybierz scenę</option>
                  {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span className="text-sm">na</span>
                <select className={selectCls} value={c.withSceneId} aria-label="Nowa scena" onChange={(e) => updateConsequence(c.id, { withSceneId: e.target.value })}>
                  <option value="">wybierz scenę</option>
                  {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Badge variant={hasTag(state, c.tag) ? "default" : "outline"}>{hasTag(state, c.tag) ? "aktywna" : "oczekuje"}</Badge>
                <Button size="icon" variant="ghost" aria-label="Usuń regułę" onClick={() => setStructure((s) => ({ ...s, consequences: s.consequences.filter((x) => x.id !== c.id) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <datalist id="narrative-tags">
              {[...new Set(scenes.flatMap((s) => s.branches.map((b) => b.tag).filter(Boolean)))].map((t) => <option key={t} value={t} />)}
            </datalist>
            <Button size="sm" variant="outline" onClick={() => setStructure((s) => ({ ...s, consequences: [...s.consequences, { id: newId(), tag: "", replaceSceneId: "", withSceneId: "" }] }))}>
              <Plus className="h-4 w-4" /> Dodaj regułę
            </Button>
            {pending.length > 0 && <p className="text-xs text-muted-foreground">Oczekują na decyzję: {pending.join(", ")}</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="recap" className="space-y-3">
        <select className={selectCls} value={recapSessionId} onChange={(e) => setRecapSessionId(e.target.value)} aria-label="Sesja">
          {noteSessionCatalog.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <SessionRecap structure={structure} state={state} sessionId={recapSessionId} />
      </TabsContent>
    </Tabs>
  );
}
