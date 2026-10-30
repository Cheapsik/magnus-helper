import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { mergeCampaignData, reconcileCampaigns, type CloudCampaign } from "./cloudSync";
import { createCampaign, deleteCampaign, getStorageKey, renameCampaign, type Campaign } from "./campaignStorage";
import { clearEntry, pendingEntries } from "./syncQueue";
import { readJson, removeJson, writeJson } from "./storage";

const local = (id: string, name = id): Campaign => ({ id, name, createdAt: "2026-01-01", archivedAt: null });
const cloud = (id: string, name = id): CloudCampaign => ({ id, name, created_at: "2026-01-01", archived_at: null });

describe("reconcileCampaigns", () => {
  it("takes names from the cloud, except for campaigns changed here", () => {
    const { campaigns } = reconcileCampaigns([local("a", "old"), local("b", "mine")], [cloud("a", "new"), cloud("b", "theirs")], new Set(["b"]), new Set());
    expect(campaigns.map((c) => c.name)).toEqual(["new", "mine"]);
  });

  it("adds campaigns created on another device", () => {
    const { campaigns, upload } = reconcileCampaigns([], [cloud("x")], new Set(), new Set());
    expect(campaigns.map((c) => c.id)).toEqual(["x"]);
    expect(upload).toEqual([]);
  });

  it("removes a campaign seen in the cloud before and now gone from it", () => {
    const { campaigns, removed } = reconcileCampaigns([local("a")], [], new Set(), new Set(["a"]));
    expect(campaigns).toEqual([]);
    expect(removed).toEqual(["a"]);
  });

  it("uploads a campaign the cloud has never had instead of deleting it", () => {
    const { campaigns, removed, upload } = reconcileCampaigns([local("a")], [], new Set(), new Set());
    expect(campaigns.map((c) => c.id)).toEqual(["a"]);
    expect(removed).toEqual([]);
    expect(upload).toEqual(["a"]);
  });

  it("does not bring back a campaign deleted here but not yet in the cloud", () => {
    const { campaigns } = reconcileCampaigns([], [cloud("a")], new Set(["a"]), new Set(["a"]));
    expect(campaigns).toEqual([]);
  });
});

describe("mergeCampaignData", () => {
  it("takes the cloud's values and drops keys the cloud no longer has, keeping changes made here", () => {
    const result = mergeCampaignData(
      { same: "1", stale: "old", gone: "x", mine: "local", fresh: "kept" },
      { same: "1", stale: "new", mine: "cloud", added: "y" },
      new Set(["mine", "fresh"]),
    );
    expect(result).toEqual({ set: { stale: "new", added: "y" }, remove: ["gone"] });
  });
});

describe("change queue", () => {
  beforeEach(() => window.localStorage.clear());

  const entries = () => pendingEntries().map((p) => p.entry);

  it("queues campaign keys written through storage, but not device preferences", () => {
    const a = createCampaign("A");
    writeJson("rpg_cards_hero", [1]);
    writeJson("magnus_sidebar_width", 300, { global: true });
    removeJson("rpg_old");
    expect(entries()).toEqual([
      ["campaign", a.id],
      ["data", a.id, "rpg_cards_hero"],
      ["data", a.id, "rpg_old"],
    ]);
    expect(readJson("rpg_cards_hero", [])).toEqual([1]);
    expect(window.localStorage.getItem(getStorageKey("rpg_cards_hero"))).toBe("[1]");
  });

  it("queues renames and deletions of campaigns", () => {
    const a = createCampaign("A");
    for (const p of pendingEntries()) clearEntry(p.entry, p.seq);
    renameCampaign(a.id, "B");
    expect(entries()).toEqual([["campaign", a.id]]);
    for (const p of pendingEntries()) clearEntry(p.entry, p.seq);
    deleteCampaign(a.id);
    expect(entries()).toEqual([["campaign", a.id]]);
  });

  it("keeps an entry that changed again while it was being sent", () => {
    createCampaign("A");
    writeJson("rpg_notes", "v1");
    const sent = pendingEntries().find((p) => p.entry[0] === "data")!;
    writeJson("rpg_notes", "v2");
    clearEntry(sent.entry, sent.seq);
    expect(entries()).toContainEqual(sent.entry);
  });
});
