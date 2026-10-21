import { describe, expect, it } from "vitest";
import { buildRecap, recapCounts, recapToText } from "./chronicleRecap";
import type { ChronicleEvent } from "./chronicle";
import type { Faction } from "./factions";

const ev = (kind: ChronicleEvent["kind"], text: string, sessionId = "s1", at = 1): ChronicleEvent => ({ id: text, at, sessionId, kind, text });

describe("buildRecap", () => {
  const faction: Faction = {
    id: "f", name: "Gildia", description: "", color: "", memberIds: [], relations: {},
    log: [
      { id: "a", delta: 1, reason: "pomoc", sessionId: "s1", timestamp: 2 },
      { id: "b", delta: -2, reason: "", sessionId: "s2", timestamp: 1 },
    ],
  };
  const groups = buildRecap("s1", {
    events: [
      ev("clock", "Zegar „Burza”: 2/4", "s1", 2),
      ev("calendar", "Czas w świecie: +1 dni", "s1", 1),
      ev("secret", "Ujawniono sekret: stary wpis"),
      ev("faction", "Frakcja „Gildia”: reputacja +1"),
      ev("combat", "Walka „Walka 1” zakończona", "s2"),
    ],
    notes: [
      { id: "n1", text: "Spotkali @[npc:x:Borysa]", category: "", timestamp: 1, scope: "session", sessionId: "s1", title: "Karczma" },
      { id: "n2", text: "globalna", category: "", timestamp: 1, scope: "global" },
    ],
    secrets: [{ id: "x", text: "Król nie żyje", revealedInSessionId: "s1" }, { id: "y", text: "inny" }],
    factions: [faction],
  });

  it("groups by kind in fixed order, filtered to the session", () => {
    expect(groups.map((g) => g.kind)).toEqual(["calendar", "clock", "secret", "faction", "note"]);
  });

  it("takes secrets and reputation from their records, not from logged events", () => {
    expect(groups.find((g) => g.kind === "secret")!.lines).toEqual(["Król nie żyje"]);
    expect(groups.find((g) => g.kind === "faction")!.lines).toEqual(["Frakcja „Gildia”: reputacja +1 (pomoc)"]);
  });

  it("flattens mentions and formats text and counts", () => {
    expect(groups.find((g) => g.kind === "note")!.lines).toEqual(["Karczma: Spotkali Borysa"]);
    expect(recapCounts(groups)).toBe("Czas w świecie: 1 · Zegary: 1 · Ujawnione sekrety: 1 · Frakcje: 1 · Notatki: 1");
    expect(recapCounts([])).toBe("Brak wpisów");
    expect(recapToText("Sesja 1", groups.slice(0, 1), " Podsumowanie ")).toBe(
      "Sesja 1\n\nPodsumowanie\n\nCzas w świecie:\n- Czas w świecie: +1 dni",
    );
  });

  it("keeps only the latest state of each clock", () => {
    const ev = (id: string, at: number, text: string) => ({ id, at, sessionId: "s", kind: "clock" as const, text });
    const groups = buildRecap("s", {
      events: [ev("1", 1, "Zegar „A”: 1/4"), ev("2", 2, "Zegar „B”: 1/6"), ev("3", 3, "Zegar „A” zapełniony")],
      notes: [],
      secrets: [],
      factions: [],
    });
    expect(groups.find((g) => g.kind === "clock")?.lines).toEqual(["Zegar „A” zapełniony", "Zegar „B”: 1/6"]);
  });
});
