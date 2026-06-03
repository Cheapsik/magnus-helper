import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { STATUSES } from "../constants";
import { statusLabel } from "../colors";
import type { EdgeDraft, RelationStatus } from "../types";
import { FilterRow } from "./FormBits";

export function EdgeForm({
  draft,
  setDraft,
  allTypes,
}: {
  draft: EdgeDraft;
  setDraft: React.Dispatch<React.SetStateAction<EdgeDraft>>;
  allTypes: string[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Typ relacji</Label>
        <Select
          value={draft.customType ? "__custom__" : draft.relationType}
          onValueChange={(v) => {
            if (v === "__custom__") {
              setDraft((d) => ({ ...d, customType: d.customType || "" }));
            } else {
              setDraft((d) => ({ ...d, relationType: v, customType: null }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
            <SelectItem value="__custom__">Własny typ…</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.customType !== null && (
        <div>
          <Label className="text-xs">Własna nazwa</Label>
          <Input
            value={draft.customType || ""}
            onChange={(e) => setDraft((d) => ({ ...d, customType: e.target.value }))}
            placeholder="np. Informator"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FilterRow label="Status">
          <Select
            value={draft.status}
            onValueChange={(v: RelationStatus) => setDraft((d) => ({ ...d, status: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterRow>
        <div>
          <Label className="text-xs">Siła ({draft.strength}/5)</Label>
          <Slider
            value={[draft.strength]}
            min={1}
            max={5}
            step={1}
            onValueChange={([v]) => setDraft((d) => ({ ...d, strength: v }))}
            className="mt-2"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Opis (opcjonalnie)</Label>
        <Textarea
          value={draft.description || ""}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          rows={3}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Label className="text-xs">Dwustronna relacja</Label>
        <Switch
          checked={draft.bidirectional}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, bidirectional: v }))}
        />
      </div>
    </div>
  );
}
