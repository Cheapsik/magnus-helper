import { useState } from "react";
import { Copy } from "lucide-react";
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
import { cn } from "@/lib/utils";

export default function ChroniclePage() {
  const { noteSessionCatalog, sessionNotes } = useApp();
  const { sessions } = noteSessionCatalog;
  const [events] = useLocalStorage<ChronicleEvent[]>(CHRONICLE_EVENTS_KEY, [], { revive: reviveChronicleEvents });
  const [secrets] = useLocalStorage<Secret[]>("rpg_secrets", [], { revive: reviveSecrets });
  const [factions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);
  const [summaries, setSummaries] = useLocalStorage<Record<string, string>>(CHRONICLE_SUMMARIES_KEY, {});
  const [pickedSessionId, setPickedSessionId] = useState(noteSessionCatalog.activeSessionId);

  const sources = { events, notes: sessionNotes, secrets, factions };
  const sessionId = sessions.some((s) => s.id === pickedSessionId) ? pickedSessionId : sessions[0]?.id;
  const session = sessions.find((s) => s.id === sessionId);
  const groups = session ? buildRecap(session.id, sources) : [];
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

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Kronika sama zbiera, co wydarzyło się na sesji: upływ czasu w świecie, zakończone walki, ruchy zegarów, ujawnione
        sekrety, zmiany reputacji frakcji i notatki z tej sesji. Dopisz własne podsumowanie i skopiuj całość dla graczy.
      </p>
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
                <div className="truncate text-xs text-muted-foreground">{recapCounts(buildRecap(s.id, sources))}</div>
              </button>
            </li>
          ))}
        </ul>

        {session && (
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-base">{session.name}</CardTitle>
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" /> Kopiuj jako tekst
              </Button>
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
                <section key={g.kind} className="space-y-1">
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
