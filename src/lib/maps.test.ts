import { describe, expect, it } from "vitest";
import { fitView, newMap, newPin, removeMap, toFraction, toScreen, updatePin, zoomAt, MAX_SCALE } from "./maps";

describe("map fraction math", () => {
  const view = { scale: 2, x: 10, y: 20 };

  it("round-trips fractions through screen coordinates", () => {
    const s = toScreen(0.25, 0.5, view, 400, 200);
    expect(s).toEqual({ x: 210, y: 220 });
    expect(toFraction(s.x, s.y, view, 400, 200)).toEqual({ x: 0.25, y: 0.5 });
  });

  it("clamps points outside the image", () => {
    expect(toFraction(-50, 9999, view, 400, 200)).toEqual({ x: 0, y: 1 });
  });

  it("zooms around the cursor and clamps scale", () => {
    const z = zoomAt(view, 2, 110, 120);
    expect(z.scale).toBe(4);
    expect(toFraction(110, 120, z, 400, 200)).toEqual(toFraction(110, 120, view, 400, 200));
    expect(zoomAt(view, 1000, 0, 0).scale).toBe(MAX_SCALE);
  });

  it("fits and centers the image", () => {
    expect(fitView(800, 800, 400, 200)).toEqual({ scale: 2, x: 0, y: 200 });
  });
});

describe("map link cleanup", () => {
  it("removes the map and links pointing at it, keeping other links", () => {
    const world = newMap("Świat");
    const city = newMap("Miasto");
    const pin = { ...newPin(0.5, 0.5), links: [{ kind: "map" as const, id: city.id }, { kind: "npc" as const, id: "n1" }] };
    world.pins = [pin];
    const next = removeMap([world, city], city.id);
    expect(next.map((m) => m.name)).toEqual(["Świat"]);
    expect(next[0].pins[0].links).toEqual([{ kind: "npc", id: "n1" }]);
  });

  it("patches a single pin", () => {
    const m = { ...newMap("A"), pins: [newPin(0, 0), newPin(1, 1)] };
    const next = updatePin([m], m.id, m.pins[1].id, { label: "Wieża" });
    expect(next[0].pins.map((p) => p.label)).toEqual(["Nowa pinezka", "Wieża"]);
  });
});
