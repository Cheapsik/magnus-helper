import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useDrawer } from "@/context/DrawerContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCards } from "@/lib/cardStore";
import { type MentionHit, type MentionSources, MENTION_SOURCE_LABELS, findMentions } from "@/lib/mentionIndex";

type QuestStore = { quests: NonNullable<MentionSources["quests"]> };

function when(hit: MentionHit): string {
  const date = hit.timestamp ? new Date(hit.timestamp).toLocaleDateString("pl-PL") : "";
  return [hit.session, date].filter(Boolean).join(" · ");
}

/** "Wzmianki": every note, quest, codex entry and card that mentions or links this card. */
export function MentionTimeline({ cardId, className }: { cardId: string; className?: string }) {
  const navigate = useNavigate();
  const { openDrawer } = useDrawer();
  const { sessionNotes, noteSessionCatalog, codexEntries } = useApp();
  const [questStore] = useLocalStorage<QuestStore>("rpg_quests", { quests: [] });
  const [heroes] = useCards("hero");
  const [npcs] = useCards("npc");
  const [monsters] = useCards("monster");

  const hits = useMemo(
    () =>
      findMentions(cardId, {
        notes: sessionNotes,
        noteSessions: noteSessionCatalog.sessions,
        quests: Array.isArray(questStore?.quests) ? questStore.quests : [],
        codex: codexEntries,
        cards: [...heroes, ...npcs, ...monsters],
      }),
    [cardId, sessionNotes, noteSessionCatalog, questStore, codexEntries, heroes, npcs, monsters],
  );

  const open = (hit: MentionHit) => {
    if (hit.sourceKind === "quest") openDrawer("quest", hit.sourceId, hit.sourceTitle);
    else if (hit.sourceKind === "card" && hit.cardKind) openDrawer(hit.cardKind, hit.sourceId, hit.sourceTitle);
    else navigate(hit.sourceKind === "note" ? "/notes" : "/codex");
  };

  const latest = hits.length > 0 ? when(hits[0]) : "";

  return (
    <div className={["space-y-2 rounded-lg border p-3 text-sm", className ?? ""].filter(Boolean).join(" ")}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">Wzmianki</h3>
        {latest && <span className="text-xs text-muted-foreground">Ostatnio: {latest}</span>}
      </div>
      {hits.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak wzmianek w notatkach, wątkach ani kodeksie.</p>
      ) : (
        <ul className="space-y-1">
          {hits.map((hit) => (
            <li key={`${hit.sourceKind}-${hit.sourceId}`}>
              <button
                type="button"
                onClick={() => open(hit)}
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium">
                    {MENTION_SOURCE_LABELS[hit.sourceKind]}: {hit.sourceTitle}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{when(hit)}</span>
                </div>
                {hit.snippet && <p className="line-clamp-2 text-xs text-muted-foreground">{hit.snippet}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
