import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCards } from "@/lib/cardStore";
import { SECRET_CATEGORY_LABELS, type Secret, type SecretCategory } from "@/lib/secrets";

export function SecretEditor({ secret, onSave, onCancel }: { secret: Secret; onSave: (s: Secret) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(secret);
  const [npcs] = useCards("npc");
  const patch = (p: Partial<Secret>) => setDraft((d) => ({ ...d, ...p }));
  const npcIds = draft.npcIds ?? [];

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nazwa</Label>
          <Input value={draft.name ?? ""} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Kategoria</Label>
          <Select value={draft.category ?? "plot"} onValueChange={(v) => patch({ category: v as SecretCategory })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SECRET_CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Pełny tekst</Label>
        <Textarea rows={4} value={draft.text} onChange={(e) => patch({ text: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Warunki odkrycia</Label>
        <Textarea rows={2} value={draft.conditions ?? ""} onChange={(e) => patch({ conditions: e.target.value })}
          placeholder="np. Test Percepcji ST 15 w krypcie; rozmowa ze Starym Markiem" />
      </div>
      <div className="space-y-1">
        <Label>Powiązane miejsca i wątki</Label>
        <Input value={draft.links ?? ""} onChange={(e) => patch({ links: e.target.value })} />
      </div>
      {npcs.length > 0 && (
        <div className="space-y-1">
          <Label>Powiązane postacie niezależne</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {npcs.map((n) => (
              <label key={n.id} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={npcIds.includes(n.id)}
                  onCheckedChange={(c) => patch({ npcIds: c ? [...npcIds, n.id] : npcIds.filter((i) => i !== n.id) })}
                />
                {n.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" disabled={!draft.text.trim()} onClick={() => onSave(draft)}>Zapisz</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
      </div>
    </div>
  );
}
