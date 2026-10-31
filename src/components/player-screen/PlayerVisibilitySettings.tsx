import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cardTitle } from "@/lib/cardSchema";
import { useCards, useCardType } from "@/lib/cardStore";
import { useNoteSessions, usePlayerNotes, usePlayerVisibility, type SectionAccess } from "@/lib/playerPanel";

const ACCESS: { value: SectionAccess; label: string }[] = [
  { value: "hidden", label: "Ukryta" },
  { value: "view", label: "Podgląd" },
  { value: "edit", label: "Edycja" },
];

/** GM side: what the player panel offers, per card section, plus notes players chose to share. */
export function PlayerVisibilitySettings() {
  const [vis, setVis] = usePlayerVisibility();
  const cardType = useCardType("hero");
  const [heroes] = useCards("hero");
  const [notes] = usePlayerNotes();
  const { sessions } = useNoteSessions();
  const patch = (p: Partial<typeof vis>) => setVis((prev) => ({ ...prev, ...p }));
  const shared = Object.entries(notes).filter(([, n]) => n.sharedWithGm && n.text.trim());

  return (
    <div className="space-y-4">
      {(
        [
          ["panel", "Panel gracza na ekranie graczy"],
          ["dice", "Rzuty kośćmi (do kroniki)"],
          ["notes", "Notatki graczy"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <Label htmlFor={`pv-${key}`}>{label}</Label>
          <Switch id={`pv-${key}`} checked={vis[key]} onCheckedChange={(v) => patch({ [key]: v })} />
        </div>
      ))}

      <div className="space-y-1">
        <Label htmlFor="pv-hero">Karta bohatera</Label>
        <select
          id="pv-hero"
          className="field w-full"
          value={vis.heroId}
          onChange={(e) => patch({ heroId: e.target.value })}
        >
          <option value="">Gracz wybiera sam</option>
          {heroes.map((h) => (
            <option key={h.id} value={h.id}>
              {cardTitle(h)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Sekcje karty</Label>
        {cardType.sections.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{s.name}</span>
            <select
              aria-label={`Dostęp do sekcji ${s.name}`}
              className="rounded-md border bg-background px-2 py-1"
              value={vis.sections[s.id] ?? "view"}
              onChange={(e) => patch({ sections: { ...vis.sections, [s.id]: e.target.value as SectionAccess } })}
            >
              {ACCESS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {shared.length > 0 && (
        <div className="space-y-2">
          <Label>Notatki udostępnione przez graczy</Label>
          {shared.map(([sid, n]) => (
            <div key={sid} className="rounded-md border p-2 text-sm">
              <div className="text-xs text-muted-foreground">{sessions.find((s) => s.id === sid)?.name ?? sid}</div>
              <p className="whitespace-pre-wrap">{n.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
