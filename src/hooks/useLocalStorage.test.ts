import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "./useLocalStorage";
import { createCampaign, getStorageKey } from "@/lib/campaignStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useLocalStorage", () => {
  it("namespaces reads and writes under the active campaign by default", () => {
    const campaign = createCampaign("Kampania testowa");
    const { result } = renderHook(() => useLocalStorage("rpg_inventory", [] as number[]));

    act(() => result.current[1]([1, 2, 3]));

    expect(window.localStorage.getItem(getStorageKey("rpg_inventory", campaign.id))).toBe(
      JSON.stringify([1, 2, 3]),
    );
    expect(window.localStorage.getItem("rpg_inventory")).toBeNull();
  });

  it("reads pre-existing namespaced data for the active campaign", () => {
    const campaign = createCampaign("Kampania testowa");
    window.localStorage.setItem(getStorageKey("rpg_inventory", campaign.id), JSON.stringify(["miecz"]));

    const { result } = renderHook(() => useLocalStorage("rpg_inventory", [] as string[]));

    expect(result.current[0]).toEqual(["miecz"]);
  });

  it("does not leak data between two campaigns' namespaces", () => {
    const a = createCampaign("Kampania A");
    window.localStorage.setItem(getStorageKey("rpg_inventory", a.id), JSON.stringify(["a-item"]));
    const b = createCampaign("Kampania B");
    window.localStorage.setItem(getStorageKey("rpg_inventory", b.id), JSON.stringify(["b-item"]));

    const { result } = renderHook(() => useLocalStorage("rpg_inventory", [] as string[]));

    expect(result.current[0]).toEqual(["a-item"]);
  });

  it("bypasses campaign namespacing when the global option is set", () => {
    createCampaign("Kampania testowa");
    const { result } = renderHook(() => useLocalStorage("rpg_mode", "gm", { global: true }));

    act(() => result.current[1]("player"));

    expect(window.localStorage.getItem("rpg_mode")).toBe(JSON.stringify("player"));
  });

  it("falls back to the raw key when there is no active campaign", () => {
    const { result } = renderHook(() => useLocalStorage("rpg_inventory", [] as number[]));

    act(() => result.current[1]([9]));

    expect(window.localStorage.getItem("rpg_inventory")).toBe(JSON.stringify([9]));
  });
});
