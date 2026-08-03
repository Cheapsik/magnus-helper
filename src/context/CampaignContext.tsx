import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type Campaign,
  archiveCampaign as archiveCampaignInStorage,
  createCampaign as createCampaignInStorage,
  deleteCampaign as deleteCampaignInStorage,
  readCampaignsRegistry,
  renameCampaign as renameCampaignInStorage,
  setActiveCampaignId as setActiveCampaignIdInStorage,
  unarchiveCampaign as unarchiveCampaignInStorage,
} from "@/lib/campaignStorage";

interface CampaignContextValue {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  activeCampaign: Campaign | null;
  /** Creates a campaign. Does not switch to it — see Decyzja 1. */
  createCampaign: (name: string) => Campaign;
  renameCampaign: (campaignId: string, name: string) => void;
  archiveCampaign: (campaignId: string) => void;
  unarchiveCampaign: (campaignId: string) => void;
  /** Deletes a campaign and all of its data. Irreversible. */
  deleteCampaign: (campaignId: string) => void;
  /**
   * Makes a campaign active and reloads the app so every module re-reads its
   * state from the newly namespaced storage keys — the simplest way to
   * guarantee the full isolation required by Decyzja 2 with ~15 independent
   * pieces of app state.
   */
  switchCampaign: (campaignId: string) => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState(() => readCampaignsRegistry());

  const refresh = useCallback(() => setRegistry(readCampaignsRegistry()), []);

  const createCampaign = useCallback(
    (name: string) => {
      const campaign = createCampaignInStorage(name);
      refresh();
      return campaign;
    },
    [refresh],
  );

  const renameCampaign = useCallback(
    (campaignId: string, name: string) => {
      renameCampaignInStorage(campaignId, name);
      refresh();
    },
    [refresh],
  );

  const archiveCampaign = useCallback(
    (campaignId: string) => {
      archiveCampaignInStorage(campaignId);
      refresh();
    },
    [refresh],
  );

  const unarchiveCampaign = useCallback(
    (campaignId: string) => {
      unarchiveCampaignInStorage(campaignId);
      refresh();
    },
    [refresh],
  );

  const deleteCampaign = useCallback(
    (campaignId: string) => {
      const wasActive = readCampaignsRegistry().activeCampaignId === campaignId;
      deleteCampaignInStorage(campaignId);
      if (wasActive) {
        // The active campaign's data is gone; reload so every module re-reads
        // from the fallback (or empty) campaign instead of holding stale state.
        window.location.reload();
        return;
      }
      refresh();
    },
    [refresh],
  );

  const switchCampaign = useCallback((campaignId: string) => {
    setActiveCampaignIdInStorage(campaignId);
    window.location.reload();
  }, []);

  const value = useMemo<CampaignContextValue>(() => {
    const activeCampaign = registry.campaigns.find((c) => c.id === registry.activeCampaignId) ?? null;
    return {
      campaigns: registry.campaigns,
      activeCampaignId: registry.activeCampaignId,
      activeCampaign,
      createCampaign,
      renameCampaign,
      archiveCampaign,
      unarchiveCampaign,
      deleteCampaign,
      switchCampaign,
    };
  }, [registry, createCampaign, renameCampaign, archiveCampaign, unarchiveCampaign, deleteCampaign, switchCampaign]);

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaigns(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaigns musi być użyty wewnątrz CampaignProvider");
  return ctx;
}
