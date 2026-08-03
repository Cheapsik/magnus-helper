import { beforeEach, describe, expect, it } from "vitest";
import {
  CAMPAIGNS_REGISTRY_KEY,
  archiveCampaign,
  createCampaign,
  deleteCampaign,
  getActiveCampaignId,
  getStorageKey,
  listCampaigns,
  readCampaignsRegistry,
  renameCampaign,
  setActiveCampaignId,
  unarchiveCampaign,
} from "./campaignStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("campaignStorage", () => {
  it("starts with an empty registry and no active campaign", () => {
    expect(listCampaigns()).toEqual([]);
    expect(getActiveCampaignId()).toBeNull();
  });

  it("creates a campaign and makes it active", () => {
    const campaign = createCampaign("Klątwa Czerwonej Wieży");

    expect(campaign.name).toBe("Klątwa Czerwonej Wieży");
    expect(campaign.archivedAt).toBeNull();
    expect(listCampaigns()).toEqual([campaign]);
    expect(getActiveCampaignId()).toBe(campaign.id);
  });

  it("does not switch the active campaign when creating a second one", () => {
    const first = createCampaign("Pierwsza");
    const second = createCampaign("Druga");

    expect(listCampaigns().map((c) => c.id)).toEqual([first.id, second.id]);
    expect(getActiveCampaignId()).toBe(first.id);
  });

  it("switches the active campaign explicitly", () => {
    const first = createCampaign("Pierwsza");
    const second = createCampaign("Druga");

    setActiveCampaignId(second.id);

    expect(getActiveCampaignId()).toBe(second.id);
    expect(getActiveCampaignId()).not.toBe(first.id);
  });

  it("renames a campaign", () => {
    const campaign = createCampaign("Robocza nazwa");
    renameCampaign(campaign.id, "Ostateczna nazwa");

    expect(listCampaigns()[0].name).toBe("Ostateczna nazwa");
  });

  it("archives and unarchives a campaign without deleting its data", () => {
    const campaign = createCampaign("Do archiwizacji");
    archiveCampaign(campaign.id);

    expect(listCampaigns()[0].archivedAt).not.toBeNull();

    unarchiveCampaign(campaign.id);
    expect(listCampaigns()[0].archivedAt).toBeNull();
  });

  it("deletes a campaign and its namespaced data", () => {
    const campaign = createCampaign("Do usunięcia");
    window.localStorage.setItem(getStorageKey("rpg_inventory", campaign.id), JSON.stringify([1, 2, 3]));

    deleteCampaign(campaign.id);

    expect(listCampaigns()).toEqual([]);
    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", campaign.id))).toBeNull();
  });

  it("falls back to another remaining campaign when deleting the active one", () => {
    const first = createCampaign("Pierwsza");
    const second = createCampaign("Druga");

    deleteCampaign(first.id);

    expect(getActiveCampaignId()).toBe(second.id);
  });

  it("clears the active campaign when the last campaign is deleted", () => {
    const only = createCampaign("Jedyna");
    deleteCampaign(only.id);

    expect(getActiveCampaignId()).toBeNull();
    expect(listCampaigns()).toEqual([]);
  });

  it("absorbs orphaned legacy data written while there was no active campaign", () => {
    const only = createCampaign("Jedyna");
    deleteCampaign(only.id);

    // Written after the last campaign was deleted, before a new one exists.
    window.localStorage.setItem("rpg_inventory", JSON.stringify(["orphan"]));

    const next = createCampaign("Nowa");

    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", next.id))).toBe(
      JSON.stringify(["orphan"]),
    );
    expect(window.localStorage.getItem("rpg_inventory")).toBeNull();
  });

  it("does not touch legacy data when a campaign is created while another is already active", () => {
    const first = createCampaign("Pierwsza");
    window.localStorage.setItem("rpg_inventory", JSON.stringify(["untouched"]));

    const second = createCampaign("Druga");

    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", first.id))).toBeNull();
    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", second.id))).toBeNull();
    expect(window.localStorage.getItem("rpg_inventory")).toBe(JSON.stringify(["untouched"]));
  });

  it("persists the registry under the campaigns registry key", () => {
    createCampaign("Ala");
    const raw = window.localStorage.getItem(CAMPAIGNS_REGISTRY_KEY);
    expect(raw).not.toBeNull();
    expect(readCampaignsRegistry().campaigns).toHaveLength(1);
  });
});

describe("getStorageKey", () => {
  it("namespaces a key under the given campaign id", () => {
    expect(getStorageKey("rpg_inventory", "abc123")).toBe("campaign:abc123:rpg_inventory");
  });

  it("uses the active campaign when no id is passed explicitly", () => {
    const campaign = createCampaign("Aktywna");
    expect(getStorageKey("rpg_inventory")).toBe(`campaign:${campaign.id}:rpg_inventory`);
  });

  it("returns the raw key when there is no active campaign", () => {
    expect(getStorageKey("rpg_inventory")).toBe("rpg_inventory");
  });
});
