import { beforeEach, describe, expect, it } from "vitest";
import { readJson, writeJson } from "@/lib/storage";
import { CHRONICLE_EVENTS_KEY } from "./chronicle";
import { DEFAULT_PLAYER_SCREEN, PLAYER_SCREEN_STORAGE_KEY, revivePlayerScreen } from "./playerScreen";
import { addItem, DEFAULT_SAFETY, reviveSafety, SAFETY_STORAGE_KEY, setPlayerScreenPaused } from "./safety";

beforeEach(() => window.localStorage.clear());

const screen = () => readJson(PLAYER_SCREEN_STORAGE_KEY, DEFAULT_PLAYER_SCREEN, { revive: revivePlayerScreen });
const events = () => readJson<{ text: string }[]>(CHRONICLE_EVENTS_KEY, []);

describe("reviveSafety", () => {
  it("falls back to defaults and drops junk items", () => {
    expect(reviveSafety(null)).toBe(DEFAULT_SAFETY);
    const s = reviveSafety({ lines: ["a", 3, " "], veils: "x", topics: [{ id: "1", text: "t", done: 1 }, {}] });
    expect(s.lines).toEqual(["a"]);
    expect(s.veils).toEqual([]);
    expect(s.topics).toEqual([{ id: "1", text: "t", done: true }]);
    expect(s.logPauses).toBe(false);
  });
});

describe("addItem", () => {
  it("trims and skips blanks and duplicates", () => {
    expect(addItem(["Pająki"], " pająki ")).toEqual(["Pająki"]);
    expect(addItem([], "  ")).toEqual([]);
    expect(addItem(["a"], " b ")).toEqual(["a", "b"]);
  });
});

describe("setPlayerScreenPaused", () => {
  it("pauses without logging by default", () => {
    setPlayerScreenPaused(true);
    expect(screen().paused).toBe(true);
    expect(events()).toEqual([]);
    setPlayerScreenPaused(false);
    expect(screen().paused).toBe(false);
  });

  it("logs a detail-free event once when opted in", () => {
    writeJson(SAFETY_STORAGE_KEY, { ...DEFAULT_SAFETY, logPauses: true, lines: ["sekret"] });
    setPlayerScreenPaused(true);
    setPlayerScreenPaused(true);
    setPlayerScreenPaused(false);
    expect(events().map((e) => e.text)).toEqual(["Przerwa (karta X)"]);
  });
});
