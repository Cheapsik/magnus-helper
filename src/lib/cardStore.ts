import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getStorageKey, markKeyDirty } from "@/lib/campaignStorage";
import { type Card, type CardKind, type CardTypeDef, cardSubtitle, cardTitle } from "@/lib/cardSchema";
import { type CampaignSystem, emptyCampaignSystem } from "@/lib/campaignSystem";
import { type StartingPoint, systemForStartingPoint } from "@/lib/systemTemplates";
import { readJson } from "@/lib/storage";

export const CAMPAIGN_SYSTEM_KEY = "rpg_campaign_system";

const CARDS_KEY: Record<CardKind, string> = {
  hero: "rpg_cards_hero",
  npc: "rpg_cards_npc",
  monster: "rpg_cards_monster",
};

export function useCampaignSystem(): [
  CampaignSystem,
  (next: CampaignSystem | ((prev: CampaignSystem) => CampaignSystem)) => void,
] {
  return useLocalStorage<CampaignSystem>(CAMPAIGN_SYSTEM_KEY, emptyCampaignSystem());
}

export function useCardType(kind: CardKind): CardTypeDef {
  const [system] = useCampaignSystem();
  return system.cards[kind];
}

export function useCards(kind: CardKind): [Card[], (next: Card[] | ((prev: Card[]) => Card[])) => void] {
  return useLocalStorage<Card[]>(CARDS_KEY[kind], []);
}

/** For imperative readers outside React (search index, roster building). */
export function readCards(kind: CardKind): Card[] {
  const cards = readJson<Card[]>(CARDS_KEY[kind], []);
  return Array.isArray(cards) ? cards : [];
}

export function readCampaignSystem(): CampaignSystem {
  return readJson<CampaignSystem>(CAMPAIGN_SYSTEM_KEY, emptyCampaignSystem());
}

/**
 * Writes a new campaign's system straight into that campaign's namespace —
 * the campaign is usually not the active one yet, so the scoped helpers
 * would write to the wrong place.
 */
export function initializeCampaignSystem(campaignId: string, start: StartingPoint, copyFromCampaignId?: string): void {
  try {
    let system: CampaignSystem | null = null;
    if (copyFromCampaignId) {
      const raw = window.localStorage.getItem(getStorageKey(CAMPAIGN_SYSTEM_KEY, copyFromCampaignId));
      if (raw) system = JSON.parse(raw) as CampaignSystem;
    }
    const key = getStorageKey(CAMPAIGN_SYSTEM_KEY, campaignId);
    window.localStorage.setItem(key, JSON.stringify(system ?? systemForStartingPoint(start)));
    markKeyDirty(key);
  } catch {
    // storage unavailable/full — the campaign falls back to an empty system
  }
}

export type CardSummary = { id: string; name: string; subtitle: string };

/** The minimal projection list views, search and the relations map need. */
export function toCardSummaries(cards: Card[], cardType: CardTypeDef): CardSummary[] {
  return cards.map((card) => ({
    id: card.id,
    name: cardTitle(card),
    subtitle: cardSubtitle(cardType, card),
  }));
}

export function useCardSummaries(kind: CardKind): CardSummary[] {
  const cardType = useCardType(kind);
  const [cards] = useCards(kind);
  return useMemo(() => toCardSummaries(cards, cardType), [cards, cardType]);
}

export function readCardSummaries(kind: CardKind): CardSummary[] {
  return toCardSummaries(readCards(kind), readCampaignSystem().cards[kind]);
}
