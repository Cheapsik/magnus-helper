import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { newId, type Branch, type NarrativeStructure, type Scene } from "@/lib/narrativeEngine";

type Props = { scene: Scene; structure: NarrativeStructure; onChange: (scene: Scene) => void; onDelete: () => void };

const selectCls = "field";

export function SceneEditor({ scene, structure, onChange, onDelete }: Props) {
  const set = (patch: Partial<Scene>) => onChange({ ...scene, ...patch });
  const setBranch = (id: string, patch: Partial<Branch>) =>
    set({ branches: scene.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const others = structure.scenes.filter((s) => s.id !== scene.id);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex gap-2">
        <Input value={scene.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nazwa sceny" aria-label="Nazwa sceny" />
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Usuń scenę">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea value={scene.description} onChange={(e) => set({ description: e.target.value })} placeholder="Opis sceny" rows={3} />
      <Input
        value={scene.requiresTag ?? ""}
        onChange={(e) => set({ requiresTag: e.target.value || undefined })}
        placeholder="Warunek wejścia: wymagana decyzja (opcjonalnie)"
        aria-label="Warunek wejścia"
      />
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Wyjścia</h4>
        {scene.branches.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2">
            <Input className="min-w-40 flex-1" value={b.label} onChange={(e) => setBranch(b.id, { label: e.target.value })} placeholder="Jeśli drużyna wybierze…" />
            <select className={selectCls} value={b.targetSceneId} onChange={(e) => setBranch(b.id, { targetSceneId: e.target.value })} aria-label="Scena docelowa">
              <option value="">→ wybierz scenę</option>
              {others.map((s) => (
                <option key={s.id} value={s.id}>{s.name || "(bez nazwy)"}</option>
              ))}
            </select>
            <Input className="w-40" value={b.tag ?? ""} onChange={(e) => setBranch(b.id, { tag: e.target.value || undefined })} placeholder="Tag decyzji" aria-label="Tag decyzji" />
            <Button size="icon" variant="ghost" onClick={() => set({ branches: scene.branches.filter((x) => x.id !== b.id) })} aria-label="Usuń wyjście">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ branches: [...scene.branches, { id: newId(), label: "", targetSceneId: "" }] })}>
          <Plus className="h-4 w-4" /> Dodaj wyjście
        </Button>
      </div>
    </div>
  );
}
