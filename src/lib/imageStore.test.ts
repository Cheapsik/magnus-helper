import { beforeEach, describe, expect, it } from "vitest";
import { imageBlobKey, isImageFile } from "./imageStore";
import { createCampaign } from "./campaignStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("imageStore helpers", () => {
  it("namespaces blob ids under the active campaign", () => {
    const a = createCampaign("A");
    expect(imageBlobKey("m1")).toBe(`campaign:${a.id}:rpg_map_image:m1`);
    expect(imageBlobKey("m1", "other")).toBe("campaign:other:rpg_map_image:m1");
  });

  it("recognises image files by type or extension", () => {
    expect(isImageFile({ name: "world.PNG", type: "" })).toBe(true);
    expect(isImageFile({ name: "x", type: "image/webp" })).toBe(true);
    expect(isImageFile({ name: "rain.mp3", type: "audio/mpeg" })).toBe(false);
  });
});
