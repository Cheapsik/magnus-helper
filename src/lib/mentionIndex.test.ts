import { describe, expect, it } from "vitest";
import { findMentions, mentionSnippet } from "@/lib/mentionIndex";
import type { SessionNote } from "@/lib/sessionNoteModel";

const note = (patch: Partial<SessionNote>): SessionNote => ({
  id: "n1",
  text: "",
  category: "general",
  timestamp: 0,
  scope: "global",
  ...patch,
});

describe("mentionSnippet", () => {
  it("renders mentions as labels and trims around the hit", () => {
    const text = `${"a".repeat(80)} spotkali @[NPC:c1:Borys] i @[NPC:c2:Ala] ${"b".repeat(80)}`;
    const snippet = mentionSnippet(text, "c1")!;
    expect(snippet).toContain("spotkali Borys i Ala");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("returns null without a mention unless linked", () => {
    expect(mentionSnippet("nic tu nie ma", "c1")).toBeNull();
    expect(mentionSnippet("nic tu nie ma", "c1", true)).toBe("nic tu nie ma");
  });
});

describe("findMentions", () => {
  it("collects every source kind, newest first, undated last", () => {
    const hits = findMentions("c1", {
      notes: [
        note({ id: "old", text: "@[NPC:c1:Borys] wraca", timestamp: 100, scope: "session", sessionId: "s1", title: "Karczma" }),
        note({ id: "linked", text: "tylko powiązana", timestamp: 300, linkedNpcIds: ["c1"] }),
        note({ id: "other", text: "@[NPC:c2:Ala]", timestamp: 999 }),
      ],
      noteSessions: [{ id: "s1", name: "Sesja w porcie" }],
      quests: [{ id: "q1", title: "Zaginiony", notes: "Szukać @[NPC:c1:Borys]", sessionNumber: 3, updatedAt: new Date(200).toISOString() }],
      codex: [{ id: "k1", title: "Ród", content: "Głowa rodu: @[NPC:c1:Borys]" }],
      cards: [
        { id: "c1", kind: "npc", name: "Borys", notes: "@[NPC:c1:Borys] siebie nie liczy" },
        { id: "c3", kind: "hero", name: "Ola", notes: "Dłużna @[NPC:c1:Borys]" },
      ],
    });
    expect(hits.map((h) => h.sourceId)).toEqual(["linked", "q1", "old", "k1", "c3"]);
    expect(hits[1]).toMatchObject({ sourceKind: "quest", session: "Sesja 3" });
    expect(hits[2]).toMatchObject({ sourceKind: "note", session: "Sesja w porcie", sourceTitle: "Karczma", snippet: "Borys wraca" });
    expect(hits[4]).toMatchObject({ sourceKind: "card", cardKind: "hero" });
  });
});
