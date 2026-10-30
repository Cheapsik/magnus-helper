import { beforeEach, describe, expect, it } from "vitest";
import { DATA_VERSION, DATA_VERSION_KEY, resetDataFromPreviousVersions } from "./dataReset";
import { createCampaign, readCampaignsRegistry } from "./campaignStorage";

describe("resetDataFromPreviousVersions", () => {
  beforeEach(() => window.localStorage.clear());

  it("removes game data from before the configurable system but keeps device preferences and auth", () => {
    window.localStorage.setItem("campaign:abc:rpg_saved_npcs", "[]");
    window.localStorage.setItem("rpg_character", "{}");
    window.localStorage.setItem("magnus_campaigns", "{}");
    window.localStorage.setItem("mg_session_notes", "[]");
    window.localStorage.setItem("rpg_theme", '"dark"');
    window.localStorage.setItem("magnus_settings", "{}");
    window.localStorage.setItem("sb-project-auth-token", "token");

    expect(resetDataFromPreviousVersions()).toBe(true);

    expect(window.localStorage.getItem("campaign:abc:rpg_saved_npcs")).toBeNull();
    expect(window.localStorage.getItem("rpg_character")).toBeNull();
    expect(window.localStorage.getItem("magnus_campaigns")).toBeNull();
    expect(window.localStorage.getItem("mg_session_notes")).toBeNull();
    expect(window.localStorage.getItem("rpg_theme")).toBe('"dark"');
    expect(window.localStorage.getItem("magnus_settings")).toBe("{}");
    expect(window.localStorage.getItem("sb-project-auth-token")).toBe("token");
  });

  it("runs only once per data version", () => {
    resetDataFromPreviousVersions();
    window.localStorage.setItem("campaign:new:rpg_cards_hero", "[]");

    expect(resetDataFromPreviousVersions()).toBe(false);
    expect(window.localStorage.getItem("campaign:new:rpg_cards_hero")).toBe("[]");
    expect(window.localStorage.getItem(DATA_VERSION_KEY)).toBe(String(DATA_VERSION));
  });
});

describe("data version and the first campaign", () => {
  beforeEach(() => window.localStorage.clear());

  it("survives creating the first campaign, so the next boot does not wipe it", () => {
    resetDataFromPreviousVersions();
    window.localStorage.setItem("rpg_notes_session_catalog", "[]");

    createCampaign("Pierwsza");

    expect(window.localStorage.getItem(DATA_VERSION_KEY)).toBe(String(DATA_VERSION));
    expect(resetDataFromPreviousVersions()).toBe(false);
    expect(readCampaignsRegistry().campaigns).toHaveLength(1);
  });
});
