import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignProvider, useCampaigns } from "./CampaignContext";

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: vi.fn() },
    writable: true,
  });
});

function renderCampaigns() {
  return renderHook(() => useCampaigns(), { wrapper: CampaignProvider });
}

describe("CampaignContext", () => {
  it("throws when used outside of a provider", () => {
    expect(() => renderHook(() => useCampaigns())).toThrow(/CampaignProvider/);
  });

  it("starts empty", () => {
    const { result } = renderCampaigns();
    expect(result.current.campaigns).toEqual([]);
    expect(result.current.activeCampaign).toBeNull();
  });

  it("reflects a newly created campaign without switching to it if one is already active", () => {
    const { result } = renderCampaigns();

    act(() => {
      result.current.createCampaign("Pierwsza");
    });
    act(() => {
      result.current.createCampaign("Druga");
    });

    expect(result.current.campaigns.map((c) => c.name)).toEqual(["Pierwsza", "Druga"]);
    expect(result.current.activeCampaign?.name).toBe("Pierwsza");
  });

  it("renames, archives and deletes a campaign", () => {
    const { result } = renderCampaigns();
    let id = "";
    act(() => {
      id = result.current.createCampaign("Robocza").id;
    });

    act(() => result.current.renameCampaign(id, "Finalna"));
    expect(result.current.campaigns[0].name).toBe("Finalna");

    act(() => result.current.archiveCampaign(id));
    expect(result.current.campaigns[0].archivedAt).not.toBeNull();

    act(() => result.current.unarchiveCampaign(id));
    expect(result.current.campaigns[0].archivedAt).toBeNull();

    act(() => result.current.deleteCampaign(id));
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    const { result: fresh } = renderCampaigns();
    expect(fresh.current.campaigns).toEqual([]);
  });

  it("deletes a non-active campaign without reloading the app", () => {
    const { result } = renderCampaigns();
    let secondId = "";
    act(() => {
      result.current.createCampaign("Pierwsza");
    });
    act(() => {
      secondId = result.current.createCampaign("Druga").id;
    });

    act(() => result.current.deleteCampaign(secondId));

    expect(window.location.reload).not.toHaveBeenCalled();
    expect(result.current.campaigns.map((c) => c.name)).toEqual(["Pierwsza"]);
  });

  it("switching campaign persists the new active id and reloads the app", () => {
    const { result } = renderCampaigns();
    let firstId = "";
    let secondId = "";
    act(() => {
      firstId = result.current.createCampaign("Pierwsza").id;
    });
    act(() => {
      secondId = result.current.createCampaign("Druga").id;
    });

    act(() => result.current.switchCampaign(secondId));

    expect(window.location.reload).toHaveBeenCalledTimes(1);

    const { result: fresh } = renderCampaigns();
    expect(fresh.current.activeCampaignId).toBe(secondId);
    expect(fresh.current.activeCampaignId).not.toBe(firstId);
  });
});
