import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MAX_SEGMENTS, MIN_SEGMENTS, normalizeClock, SEGMENT_PRESETS, type Clock } from "@/lib/clocks";

const NO_QUEST = "none";

/** Read-only view of the quest board's storage (owned by QuestsPage). */
export function useQuestTitles() {
  const [state] = useLocalStorage<{ quests?: { id: string; title: string }[] }>("rpg_quests", {});
  return Array.isArray(state?.quests) ? state.quests : [];
}

export function ClockEditor({
  clock,
  onSave,
  onClose,
}: {
  /** null = closed. */
  clock: Clock | null;
  onSave: (c: Clock) => void;
  onClose: () => void;
}) {
  const quests = useQuestTitles();
  const [draft, setDraft] = useState<Clock | null>(clock);
  useEffect(() => setDraft(clock), [clock]);
  if (!draft) return null;

  const set = (patch: Partial<Clock>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const save = () => {
    onSave(normalizeClock({ ...draft, name: draft.name.trim() || "Zegar" }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Zegar postępu</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="clock-name">Nazwa</Label>
            <Input id="clock-name" autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="np. Kult kończy rytuał" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clock-segments">Segmenty ({MIN_SEGMENTS}–{MAX_SEGMENTS})</Label>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_PRESETS.map((n) => (
                <Button key={n} type="button" size="sm" variant={draft.segments === n ? "default" : "outline"} onClick={() => set({ segments: n })}>
                  {n}
                </Button>
              ))}
              <Input
                id="clock-segments"
                type="number"
                min={MIN_SEGMENTS}
                max={MAX_SEGMENTS}
                className="w-20"
                value={draft.segments}
                onChange={(e) => set({ segments: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clock-quest">Powiązany wątek</Label>
            <Select value={draft.questId ?? NO_QUEST} onValueChange={(v) => set({ questId: v === NO_QUEST ? null : v })}>
              <SelectTrigger id="clock-quest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_QUEST}>Brak</SelectItem>
                {quests.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title || "Bez tytułu"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clock-note">Notatka</Label>
            <Textarea id="clock-note" rows={3} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="clock-visible" checked={draft.visibleToPlayers} onCheckedChange={(v) => set({ visibleToPlayers: v })} />
            <Label htmlFor="clock-visible">Widoczny dla graczy</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit">Zapisz</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
