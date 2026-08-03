import { beforeEach, describe, expect, it } from "vitest";
import { ensureDefaultCampaignMigration } from "./campaignMigration";
import { getActiveCampaignId, getStorageKey, listCampaigns } from "./campaignStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("ensureDefaultCampaignMigration", () => {
  it("does nothing when there is no legacy data and no campaigns", () => {
    ensureDefaultCampaignMigration();
    expect(listCampaigns()).toEqual([]);
  });

  it("creates a default campaign and moves legacy rpg_/magnus_ data under it", () => {
    window.localStorage.setItem("rpg_inventory", JSON.stringify(["miecz"]));
    window.localStorage.setItem("rpg_saved_npcs", JSON.stringify([{ id: "1" }]));
    window.localStorage.setItem("magnus_scenes", JSON.stringify([{ id: "s1" }]));

    ensureDefaultCampaignMigration();

    const campaigns = listCampaigns();
    expect(campaigns).toHaveLength(1);
    expect(getActiveCampaignId()).toBe(campaigns[0].id);

    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", campaigns[0].id))).toBe(
      JSON.stringify(["miecz"]),
    );
    expect(window.localStorage.getItem(getStorageKey("rpg_saved_npcs", campaigns[0].id))).toBe(
      JSON.stringify([{ id: "1" }]),
    );
    expect(window.localStorage.getItem(getStorageKey("magnus_scenes", campaigns[0].id))).toBe(
      JSON.stringify([{ id: "s1" }]),
    );

    expect(window.localStorage.getItem("rpg_inventory")).toBeNull();
    expect(window.localStorage.getItem("rpg_saved_npcs")).toBeNull();
    expect(window.localStorage.getItem("magnus_scenes")).toBeNull();
  });

  it("moves the odd mg_session_notes key too", () => {
    window.localStorage.setItem("mg_session_notes", "coś tam");

    ensureDefaultCampaignMigration();

    const campaigns = listCampaigns();
    expect(window.localStorage.getItem(getStorageKey("mg_session_notes", campaigns[0].id))).toBe("coś tam");
    expect(window.localStorage.getItem("mg_session_notes")).toBeNull();
  });

  it("does not namespace device/UI-level global keys", () => {
    window.localStorage.setItem("rpg_inventory", JSON.stringify([]));
    window.localStorage.setItem("magnus_settings", JSON.stringify({ theme: "dark" }));
    window.localStorage.setItem("rpg_theme", "dark");
    window.localStorage.setItem("magnus_sidebar_width", "240");
    window.localStorage.setItem("rpg_mode", JSON.stringify("gm"));
    window.localStorage.setItem("magnus-dice-3d-visual", JSON.stringify({}));

    ensureDefaultCampaignMigration();

    expect(window.localStorage.getItem("magnus_settings")).toBe(JSON.stringify({ theme: "dark" }));
    expect(window.localStorage.getItem("rpg_theme")).toBe("dark");
    expect(window.localStorage.getItem("magnus_sidebar_width")).toBe("240");
    expect(window.localStorage.getItem("rpg_mode")).toBe(JSON.stringify("gm"));
    expect(window.localStorage.getItem("magnus-dice-3d-visual")).toBe(JSON.stringify({}));
  });

  it("is idempotent — running it again does not create a second campaign or touch data", () => {
    window.localStorage.setItem("rpg_inventory", JSON.stringify(["miecz"]));
    ensureDefaultCampaignMigration();
    const campaignsAfterFirst = listCampaigns();

    ensureDefaultCampaignMigration();
    const campaignsAfterSecond = listCampaigns();

    expect(campaignsAfterSecond).toEqual(campaignsAfterFirst);
    expect(
      window.localStorage.getItem(getStorageKey("rpg_inventory", campaignsAfterSecond[0].id)),
    ).toBe(JSON.stringify(["miecz"]));
  });

  it("does not run migration when a campaign already exists, even without legacy data", () => {
    window.localStorage.setItem(
      "magnus_campaigns",
      JSON.stringify({
        campaigns: [{ id: "existing", name: "Istniejąca", createdAt: "now", archivedAt: null }],
        activeCampaignId: "existing",
      }),
    );

    ensureDefaultCampaignMigration();

    expect(listCampaigns()).toHaveLength(1);
    expect(listCampaigns()[0].id).toBe("existing");
  });
});
