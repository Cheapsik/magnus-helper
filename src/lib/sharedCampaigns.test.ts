import { describe, expect, it } from "vitest";
import { type Material, friendlyError, isFreshShow, nextViewing } from "./sharedCampaigns";

const material = (patch: Partial<Material>): Material => ({
  id: "m",
  campaign_id: "c",
  title: "t",
  body: "",
  image_path: null,
  shared: true,
  audience: null,
  shared_at: null,
  shown_at: null,
  created_at: "",
  updated_at: "",
  ...patch,
});

describe("isFreshShow", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  it("opens a material the GM just showed", () => {
    expect(isFreshShow(material({ shown_at: "2026-10-22T11:59:30Z" }), now)).toBe(true);
  });
  it("ignores an old show, a hidden material and one never shown", () => {
    expect(isFreshShow(material({ shown_at: "2026-10-22T11:50:00Z" }), now)).toBe(false);
    expect(isFreshShow(material({ shared: false, shown_at: "2026-10-22T11:59:30Z" }), now)).toBe(false);
    expect(isFreshShow(material({}), now)).toBe(false);
  });
});

describe("nextViewing", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const shown = material({ id: "shown", shown_at: "2026-10-22T11:59:30Z" });
  const kept = material({ id: "kept" });

  it("closes a preview the GM just hid", () => {
    expect(nextViewing(shown, [kept], null, now)).toBeNull();
  });

  it("keeps a preview that is still shared and opens a fresh show", () => {
    expect(nextViewing(kept, [kept, shown], null, now)?.id).toBe("kept");
    expect(nextViewing(null, [shown], shown, now)?.id).toBe("shown");
    expect(nextViewing(null, [material({ id: "old", shown_at: "2026-10-22T11:50:00Z" })], material({ id: "old" }), now)).toBeNull();
  });
});

describe("friendlyError", () => {
  it("never shows raw database or network messages", () => {
    expect(friendlyError('column reference "campaign_id" is ambiguous')).toBe("Coś poszło nie tak. Spróbuj ponownie.");
    expect(friendlyError("invalid invite")).toMatch(/nieważny/);
    expect(friendlyError("TypeError: Failed to fetch")).toMatch(/połączenia/);
    expect(friendlyError("new row violates row-level security policy")).toMatch(/uprawnień/);
  });
});
