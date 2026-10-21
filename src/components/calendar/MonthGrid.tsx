import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  eventsOn, toDayIndex,
  type CalendarDate, type CalendarDefinition, type CalendarEvent,
} from "@/lib/campaignCalendar";

/** Month view; `view` is any date in the shown month, `selected` the clicked day. */
export function MonthGrid({ definition, events, today, view, selected, onView, onSelect }: {
  definition: CalendarDefinition;
  events: CalendarEvent[];
  today: number;
  view: { year: number; month: number };
  selected: CalendarDate | null;
  onView: (view: { year: number; month: number }) => void;
  onSelect: (date: CalendarDate) => void;
}) {
  const month = definition.months[view.month];
  const first = toDayIndex(definition, { ...view, day: 1 });
  if (!month || first === null) return null;

  const columns = definition.weekdays.length || 7;
  const lead = definition.weekdays.length ? ((first % columns) + columns) % columns : 0;
  const step = (dir: -1 | 1) => {
    const m = view.month + dir;
    if (m < 0) onView({ year: view.year - 1, month: definition.months.length - 1 });
    else if (m >= definition.months.length) onView({ year: view.year + 1, month: 0 });
    else onView({ year: view.year, month: m });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Poprzedni miesiąc" onClick={() => step(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{month.name} {view.year}{definition.era ? ` ${definition.era}` : ""}</span>
        <Button variant="ghost" size="icon" aria-label="Następny miesiąc" onClick={() => step(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {definition.weekdays.map((name, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground truncate" title={name}>{name.slice(0, 3)}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => <div key={`lead-${i}`} />)}
        {Array.from({ length: month.days }, (_, i) => {
          const date = { ...view, day: i + 1 };
          const dayEvents = eventsOn(definition, events, date);
          const isToday = first + i === today;
          const isSelected = selected?.year === date.year && selected.month === date.month && selected.day === date.day;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "min-h-14 rounded-md border border-border p-1 text-left text-xs hover:bg-muted/50",
                first + i < today && "text-muted-foreground",
                isToday && "border-primary bg-primary/10 font-semibold",
                isSelected && "ring-2 ring-primary",
              )}
            >
              <div>{i + 1}</div>
              {dayEvents.map((e) => (
                <div key={e.id} className="truncate rounded bg-primary/20 px-1 text-[10px]" title={e.title}>{e.title}</div>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
