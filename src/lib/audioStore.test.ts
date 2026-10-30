import { beforeEach, describe, expect, it } from "vitest";
import { audioBlobKey, formatBytes, isAudioFile } from "./audioStore";
import { createCampaign } from "./campaignStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("audioStore helpers", () => {
  it("namespaces blob ids under the active campaign", () => {
    const a = createCampaign("A");
    expect(audioBlobKey("s1")).toBe(`campaign:${a.id}:rpg_ambient_audio:s1`);
    expect(audioBlobKey("s1", "other")).toBe("campaign:other:rpg_ambient_audio:s1");
  });

  it("formats sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(31.5 * 1024 * 1024)).toBe("31.5 MB");
  });

  it("recognises audio files by type or extension", () => {
    expect(isAudioFile({ name: "rain.mp3", type: "" })).toBe(true);
    expect(isAudioFile({ name: "x", type: "audio/ogg" })).toBe(true);
    expect(isAudioFile({ name: "Tavern.M4A", type: "" })).toBe(true);
    expect(isAudioFile({ name: "map.png", type: "image/png" })).toBe(false);
  });
});
