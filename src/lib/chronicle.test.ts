import { describe, expect, it } from "vitest";
import { appendEvent, eventsForSession, reviveChronicleEvents } from "./chronicle";

describe("chronicle", () => {
  it("files events under a session and returns them in time order", () => {
    let events = appendEvent([], { kind: "clock", text: "b" }, "s1", 20, "2");
    events = appendEvent(events, { kind: "calendar", text: "a" }, "s1", 10, "1");
    events = appendEvent(events, { kind: "combat", text: "other" }, "s2", 15, "3");
    expect(eventsForSession(events, "s1").map((e) => e.text)).toEqual(["a", "b"]);
  });

  it("drops malformed stored rows", () => {
    expect(reviveChronicleEvents([{ id: "1", text: "ok", sessionId: "s", kind: "other", at: 1 }, { text: 1 }, null])).toHaveLength(1);
    expect(reviveChronicleEvents("nope")).toEqual([]);
  });
});
