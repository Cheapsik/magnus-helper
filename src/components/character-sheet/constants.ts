import type { StatRow, StatRow2 } from "./types";
import { STAT_MAIN_COLUMNS, STAT_SECONDARY_COLUMNS } from "@/lib/gameStatGlossary";

export const STAT_MAIN: { key: keyof StatRow; label: string }[] = STAT_MAIN_COLUMNS;
export const STAT_SECONDARY: { key: keyof StatRow2; label: string }[] = STAT_SECONDARY_COLUMNS;

/**
 * Empty by design: the campaign — not Magnus — decides which skills exist.
 * New sheets start blank and the GM adds their own rows.
 */
export const DEFAULT_BASIC_SKILLS: string[] = [];
