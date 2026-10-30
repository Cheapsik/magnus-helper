import { beforeEach, describe, expect, it } from "vitest";
import { writeJson } from "./storage";
import { pendingEntries } from "./syncQueue";
import { createCampaign } from "./campaignStorage";

describe("writeJson", () => {
  beforeEach(() => {
    localStorage.clear();
    createCampaign("Test");
  });

  it("queues a cloud push only when the stored value changes", () => {
    writeJson("rpg_timers", [{ id: "a" }]);
    const queued = pendingEntries().length;
    expect(queued).toBeGreaterThan(0);
    localStorage.removeItem("magnus_sync_pending");

    writeJson("rpg_timers", [{ id: "a" }]);
    expect(pendingEntries()).toHaveLength(0);

    writeJson("rpg_timers", [{ id: "b" }]);
    expect(pendingEntries().length).toBeGreaterThan(0);
  });
});
