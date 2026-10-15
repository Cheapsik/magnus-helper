import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "./useLocalStorage";
import { createCampaign, getStorageKey } from "@/lib/campaignStorage";
import { writeJson } from "@/lib/storage";

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
    const { result } = renderHook(() => useLocalStorage("magnus_sidebar_width", 240, { global: true }));

    act(() => result.current[1](320));

    expect(window.localStorage.getItem("magnus_sidebar_width")).toBe(JSON.stringify(320));
  });

  it("falls back to the raw key when there is no active campaign", () => {
    const { result } = renderHook(() => useLocalStorage("rpg_inventory", [] as number[]));

    act(() => result.current[1]([9]));

    expect(window.localStorage.getItem("rpg_inventory")).toBe(JSON.stringify([9]));
  });

  it("shares state between separate instances of the same key", () => {
    createCampaign("Kampania testowa");
    const writer = renderHook(() => useLocalStorage("rpg_inventory", [] as string[]));
    const reader = renderHook(() => useLocalStorage("rpg_inventory", [] as string[]));

    act(() => writer.result.current[1](["tarcza"]));

    expect(reader.result.current[0]).toEqual(["tarcza"]);
  });

  it("picks up writes made imperatively through the storage module", () => {
    createCampaign("Kampania testowa");
    const { result } = renderHook(() => useLocalStorage("rpg_quests", [] as string[]));

    act(() => writeJson("rpg_quests", ["znaleźć kowala"]));

    expect(result.current[0]).toEqual(["znaleźć kowala"]);
  });

  it("keeps a stable reference while the stored value does not change", () => {
    createCampaign("Kampania testowa");
    const { result, rerender } = renderHook(() => useLocalStorage("rpg_inventory", [] as string[]));

    const first = result.current[0];
    rerender();

    expect(result.current[0]).toBe(first);
  });
});
