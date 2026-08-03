import { createCampaign, hasLegacyGameData, readCampaignsRegistry } from "./campaignStorage";

/**
 * One-shot migration run at app boot (Decyzja 7): if no campaign exists yet,
 * every pre-existing user was working in a single, implicit "world". We
 * create one default campaign; `createCampaign` itself moves all legacy game
 * data under it, so nothing is lost and the user doesn't have to do anything
 * manually.
 */
export function ensureDefaultCampaignMigration(): void {
  try {
    if (readCampaignsRegistry().campaigns.length > 0) return;
    if (!hasLegacyGameData()) return;
    createCampaign("Moja kampania");
  } catch {
    // storage unavailable — nothing to migrate
  }
}
