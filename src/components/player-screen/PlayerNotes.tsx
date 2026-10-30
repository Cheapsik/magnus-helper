import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useNoteSessions, usePlayerNotes } from "@/lib/playerPanel";

/** Personal notes for the active session; the player decides whether the GM may read them. */
export function PlayerNotes() {
  const { sessions, activeSessionId } = useNoteSessions();
  const [notes, setNotes] = usePlayerNotes();
  const note = notes[activeSessionId] ?? { text: "", sharedWithGm: false };
  const set = (patch: Partial<typeof note>) => setNotes((prev) => ({ ...prev, [activeSessionId]: { ...note, ...patch } }));
  const name = sessions.find((s) => s.id === activeSessionId)?.name;

  return (
    <div className="space-y-2">
      <Label htmlFor="pp-notes">Moje notatki{name ? ` — ${name}` : ""}</Label>
      <Textarea id="pp-notes" rows={8} value={note.text} onChange={(e) => set({ text: e.target.value })} />
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="pp-share">Udostępnij MG</Label>
        <Switch id="pp-share" checked={note.sharedWithGm} onCheckedChange={(v) => set({ sharedWithGm: v })} />
      </div>
    </div>
  );
}
