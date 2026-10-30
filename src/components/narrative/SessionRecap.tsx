import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CHRONICLE_EVENTS_KEY, reviveChronicleEvents, type ChronicleEvent } from "@/lib/chronicle";
import { buildRecap, recapToText, type RecapGroup } from "@/lib/chronicleRecap";
import { FACTIONS_KEY, type Faction } from "@/lib/factions";
import { reviveSecrets, type Secret } from "@/lib/secrets";
import { narrativeRecapLines, type NarrativeState, type NarrativeStructure } from "@/lib/narrativeEngine";

type Props = { structure: NarrativeStructure; state: NarrativeState; sessionId: string };

/** Story lines for the session plus everything the chronicle logged (combat, clocks, notes…). */
export function SessionRecap({ structure, state, sessionId }: Props) {
  const { noteSessionCatalog, sessionNotes } = useApp();
  const [events] = useLocalStorage<ChronicleEvent[]>(CHRONICLE_EVENTS_KEY, [], { revive: reviveChronicleEvents });
  const [secrets] = useLocalStorage<Secret[]>("rpg_secrets", [], { revive: reviveSecrets });
  const [factions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);

  const session = noteSessionCatalog.sessions.find((s) => s.id === sessionId);
  const story = narrativeRecapLines(structure, state, sessionId);
  const groups: RecapGroup[] = [
    ...(story.scenes.length ? [{ kind: "other" as const, label: "Odwiedzone sceny", lines: story.scenes }] : []),
    ...(story.decisions.length ? [{ kind: "other" as const, label: "Kluczowe decyzje", lines: story.decisions }] : []),
    ...buildRecap(sessionId, { events, notes: sessionNotes, secrets, factions }),
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recapToText(session?.name ?? "Sesja", groups, ""));
      toast.success("Skopiowano podsumowanie sesji");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-medium">{session?.name ?? "Sesja"}</h3>
        <Button size="sm" variant="outline" onClick={copy} disabled={groups.length === 0}>
          <Copy className="h-4 w-4" /> Kopiuj jako tekst
        </Button>
      </div>
      {groups.length === 0 && <p className="text-sm text-muted-foreground">Na tej sesji nic jeszcze nie zapisano.</p>}
      {groups.map((g) => (
        <section key={g.label} className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">{g.label}</h4>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {g.lines.map((l, i) => (
              <li key={i} className="whitespace-pre-wrap">{l}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
