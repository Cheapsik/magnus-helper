import { describe, expect, it } from "vitest";
import {
  prepForSession,
  reviveSecrets,
  reviveSessionPreps,
  setSecretRevealed,
  splitSecretsForSession,
  type Secret,
} from "@/lib/secrets";

const sessions = [
  { id: "s1", name: "Sesja 1" },
  { id: "s2", name: "Sesja 2" },
];

const secrets: Secret[] = [
  { id: "a", text: "A" },
  { id: "b", text: "B", revealedInSessionId: "s1" },
  { id: "c", text: "C" },
];

describe("secrets", () => {
  it("revives only well-formed rows", () => {
    expect(reviveSecrets([{ id: "a", text: "x", revealedInSessionId: "" }, { id: 1 }, null])).toEqual([
      { id: "a", text: "x", revealedInSessionId: undefined },
    ]);
    expect(reviveSecrets("nope")).toEqual([]);
    expect(reviveSessionPreps({ s1: { scenes: ["x", 2] } })).toEqual({
      s1: { strongStart: "", scenes: ["x"], secretIds: [] },
    });
  });

  it("carries the previous session's unrevealed picks into a new prep", () => {
    const preps = { s1: { strongStart: "", scenes: [], secretIds: ["a", "b"] } };
    expect(prepForSession(preps, sessions, "s2", secrets).secretIds).toEqual(["a"]);
    expect(prepForSession(preps, sessions, "s1", secrets)).toBe(preps.s1);
    expect(prepForSession({}, sessions, "s1", secrets).secretIds).toEqual([]);
  });

  it("splits ready and available secrets for a session", () => {
    const prep = { strongStart: "", scenes: [], secretIds: ["a", "b"] };
    const s1 = splitSecretsForSession(secrets, prep, "s1");
    expect(s1.ready.map((s) => s.id)).toEqual(["a", "b"]);
    expect(s1.available.map((s) => s.id)).toEqual(["c"]);
    // b was revealed in s1, so it does not show as ready in s2
    expect(splitSecretsForSession(secrets, prep, "s2").ready.map((s) => s.id)).toEqual(["a"]);
  });

  it("records and clears the reveal session", () => {
    const next = setSecretRevealed(secrets, "a", "s2");
    expect(next[0].revealedInSessionId).toBe("s2");
    expect(setSecretRevealed(next, "a", null)[0].revealedInSessionId).toBeUndefined();
  });
});
