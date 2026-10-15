import { beforeEach, describe, expect, it } from "vitest";
import { DATA_VERSION, DATA_VERSION_KEY, ensureInitialCampaign, resetDataFromPreviousVersions } from "./dataReset";
import { readCampaignsRegistry, getStorageKey } from "./campaignStorage";
import { CAMPAIGN_SYSTEM_KEY } from "./cardStore";

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

describe("ensureInitialCampaign", () => {
  beforeEach(() => window.localStorage.clear());

  it("gives a fresh install one active campaign started from the neutral template", () => {
    ensureInitialCampaign();

    const registry = readCampaignsRegistry();
    expect(registry.campaigns).toHaveLength(1);
    expect(registry.activeCampaignId).toBe(registry.campaigns[0].id);
    const system = JSON.parse(window.localStorage.getItem(getStorageKey(CAMPAIGN_SYSTEM_KEY))!);
    expect(system.cards.hero.sections.length).toBeGreaterThan(0);
  });

  it("leaves existing campaigns alone", () => {
    ensureInitialCampaign();
    ensureInitialCampaign();
    expect(readCampaignsRegistry().campaigns).toHaveLength(1);
  });
});
