import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CALENDAR_STORAGE_KEY, DEFAULT_CALENDAR_STATE, formatDate, type CalendarState } from "@/lib/campaignCalendar";

export function useCalendarState() {
  return useLocalStorage<CalendarState>(CALENDAR_STORAGE_KEY, DEFAULT_CALENDAR_STATE);
}

/** Current in-world date of the active campaign, formatted for display. */
export function useCampaignDate(): string {
  const [{ definition, today }] = useCalendarState();
  return formatDate(definition, today);
}
