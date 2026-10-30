import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MentionTextarea } from "@/components/mention/MentionTextarea";
import { CHRONICLE_EVENTS_KEY, reviveChronicleEvents, type ChronicleEvent } from "@/lib/chronicle";
import { buildRecap, CHRONICLE_SUMMARIES_KEY, recapCounts, recapToText } from "@/lib/chronicleRecap";
import { FACTIONS_KEY, type Faction } from "@/lib/factions";
import { reviveSecrets, type Secret } from "@/lib/secrets";
import {
  EMPTY_STATE, EMPTY_STRUCTURE, NARRATIVE_STATE_KEY, NARRATIVE_STRUCTURE_KEY, narrativeRecapLines,
  type NarrativeState, type NarrativeStructure,
} from "@/lib/narrativeEngine";
import type { RecapGroup } from "@/lib/chronicleRecap";
import { cn } from "@/lib/utils";

export default function ChroniclePage() {
  const { noteSessionCatalog, sessionNotes } = useApp();
  const { sessions } = noteSessionCatalog;
  const [events] = useLocalStorage<ChronicleEvent[]>(CHRONICLE_EVENTS_KEY, [], { revive: reviveChronicleEvents });
  const [secrets] = useLocalStorage<Secret[]>("rpg_secrets", [], { revive: reviveSecrets });
  const [factions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);
  const [summaries, setSummaries] = useLocalStorage<Record<string, string>>(CHRONICLE_SUMMARIES_KEY, {});
  const [pickedSessionId, setPickedSessionId] = useState(noteSessionCatalog.activeSessionId);
  const [structure] = useLocalStorage<NarrativeStructure>(NARRATIVE_STRUCTURE_KEY, EMPTY_STRUCTURE);
  const [story] = useLocalStorage<NarrativeState>(NARRATIVE_STATE_KEY, EMPTY_STATE);

  const sources = { events, notes: sessionNotes, secrets, factions };
  // Scenes visited and decisions taken (Przygotowanie → Fabuła) come first: they are the session's story.
  const recapFor = (id: string): RecapGroup[] => {
    const lines = narrativeRecapLines(structure, story, id);
    return [
      ...(lines.scenes.length ? [{ kind: "other" as const, label: "Odwiedzone sceny", lines: lines.scenes }] : []),
      ...(lines.decisions.length ? [{ kind: "other" as const, label: "Kluczowe decyzje", lines: lines.decisions }] : []),
      ...buildRecap(id, sources),
    ];
  };
  const sessionId = sessions.some((s) => s.id === pickedSessionId) ? pickedSessionId : sessions[0]?.id;
  const session = sessions.find((s) => s.id === sessionId);
  const groups = session ? recapFor(session.id) : [];
  const summary = (session && summaries[session.id]) || "";

  const copy = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(recapToText(session.name, groups, summary));
      toast.success("Skopiowano kronikę sesji");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  const download = () => {
    if (!session) return;
    const blob = new Blob([recapToText(session.name, groups, summary)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kronika - ${session.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <ul className="space-y-2" aria-label="Sesje">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setPickedSessionId(s.id)}
                aria-current={s.id === sessionId}
                className={cn(
                  "w-full rounded-md border p-2 text-left hover:bg-accent",
                  s.id === sessionId && "border-primary bg-accent",
                )}
              >
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="truncate text-xs text-muted-foreground">{recapCounts(recapFor(s.id))}</div>
              </button>
            </li>
          ))}
        </ul>

        {session && (
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-base">{session.name}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy className="h-4 w-4" /> Kopiuj jako tekst
                </Button>
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="h-4 w-4" /> Pobierz
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <MentionTextarea
                value={summary}
                onChange={(text) => setSummaries((all) => ({ ...all, [session.id]: text }))}
                placeholder="Twoje podsumowanie sesji, @wzmianki…"
              />
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">Na tej sesji nic jeszcze nie zapisano.</p>
              )}
              {groups.map((g) => (
                <section key={g.label} className="space-y-1">
                  <h2 className="text-sm font-medium text-muted-foreground">{g.label}</h2>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm">
                    {g.lines.map((line, i) => (
                      <li key={i} className="whitespace-pre-wrap">{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
