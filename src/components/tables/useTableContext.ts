import { useClocks } from "@/lib/clocks";
import { FACTIONS_KEY, type Faction } from "@/lib/factions";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCalendarState } from "@/components/calendar/useCampaignDate";
import { LOCATION_KEY, seasonOf, TIME_OF_DAY_KEY, TIMES_OF_DAY, type TableContext, type TimeOfDay } from "@/lib/tableConditions";

/** Current world state (clocks, reputations, calendar season, GM-set time of day and location). */
export function useTableContext() {
  const [clocks] = useClocks();
  const [factions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);
  const [calendar] = useCalendarState();
  const [timeOfDay, setTimeOfDay] = useLocalStorage<string>(TIME_OF_DAY_KEY, "");
  const [location, setLocation] = useLocalStorage<string>(LOCATION_KEY, "");

  const context: TableContext = {
    clocks,
    factions,
    season: seasonOf(calendar),
    timeOfDay: TIMES_OF_DAY.find((t) => t === timeOfDay) as TimeOfDay | undefined,
    location: location.trim() || undefined,
  };
  return { context, timeOfDay, setTimeOfDay, location, setLocation };
}
