import { eventsForSession, type ChronicleEvent, type ChronicleKind } from "@/lib/chronicle";
import type { Faction } from "@/lib/factions";
import type { Secret } from "@/lib/secrets";
import type { SessionNote } from "@/lib/sessionNoteModel";

export const CHRONICLE_SUMMARIES_KEY = "rpg_chronicle_summaries";

export type RecapGroup = { kind: ChronicleKind; label: string; lines: string[] };

const GROUPS: { kind: ChronicleKind; label: string }[] = [
  { kind: "calendar", label: "Czas w świecie" },
  { kind: "travel", label: "Podróże" },
  { kind: "combat", label: "Walki" },
  { kind: "clock", label: "Koła postępu" },
  { kind: "secret", label: "Ujawnione sekrety" },
  { kind: "faction", label: "Frakcje" },
  { kind: "note", label: "Notatki" },
  { kind: "other", label: "Inne" },
];

/** Secrets and reputation are read from their own records, which can be filed under any session and undone. */
const FROM_SOURCE = new Set<ChronicleKind>(["secret", "faction"]);

/** `@[type:id:label]` → `label`. */
export const plainMentions = (text: string) => text.replace(/@\[[^:\]]+:[^:\]]+:([^\]]+)\]/g, "$1");

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function buildRecap(
  sessionId: string,
  sources: { events: ChronicleEvent[]; notes: SessionNote[]; secrets: Secret[]; factions: Faction[] },
): RecapGroup[] {
  const lines = new Map<ChronicleKind, string[]>(GROUPS.map((g) => [g.kind, []]));
  const push = (kind: ChronicleKind, line: string) => (lines.get(kind) ?? lines.get("other")!).push(plainMentions(line));

  for (const e of eventsForSession(sources.events, sessionId)) if (!FROM_SOURCE.has(e.kind)) push(e.kind, e.text);
  for (const s of sources.secrets) if (s.revealedInSessionId === sessionId) push("secret", s.text);
  sources.factions
    .flatMap((f) => f.log.filter((c) => c.sessionId === sessionId).map((c) => ({ f, c })))
    .sort((a, b) => a.c.timestamp - b.c.timestamp)
    .forEach(({ f, c }) => push("faction", `Frakcja „${f.name}”: reputacja ${signed(c.delta)}${c.reason ? ` (${c.reason})` : ""}`));
  sources.notes
    .filter((n) => n.scope === "session" && n.sessionId === sessionId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((n) => push("note", n.title ? `${n.title}: ${n.text}` : n.text));

  lines.set("clock", lastPerClock(lines.get("clock")!));
  return GROUPS.map((g) => ({ ...g, lines: lines.get(g.kind)! })).filter((g) => g.lines.length > 0);
}

/** A clock ticked four times in a session reads as one line: where it ended. */
function lastPerClock(clockLines: string[]): string[] {
  const nameOf = (line: string) => /^(?:Zegar|Koło postępu) „(.+?)”/.exec(line)?.[1] ?? line;
  const last = new Map<string, string>();
  for (const line of clockLines) last.set(nameOf(line), line);
  return [...last.values()];
}

/** One line for the session list, e.g. "Walki: 1 · Koła postępu: 3". */
export const recapCounts = (groups: RecapGroup[]) =>
  groups.map((g) => `${g.label}: ${g.lines.length}`).join(" · ") || "Brak wpisów";

export function recapToText(sessionName: string, groups: RecapGroup[], summary: string): string {
  const parts = [sessionName];
  if (summary.trim()) parts.push(plainMentions(summary.trim()));
  for (const g of groups) parts.push(`${g.label}:\n${g.lines.map((l) => `- ${l}`).join("\n")}`);
  return parts.join("\n\n");
}
