import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarDate, CalendarDefinition } from "@/lib/campaignCalendar";

export function DateFields({ definition, value, onChange }: {
  definition: CalendarDefinition;
  value: CalendarDate;
  onChange: (date: CalendarDate) => void;
}) {
  const maxDay = definition.months[value.month]?.days ?? 1;
  return (
    <div className="flex flex-wrap gap-2">
      <NumberInput
        aria-label="Dzień"
        className="w-16"
        min={1}
        max={maxDay}
        value={value.day}
        onChange={(day) => onChange({ ...value, day })}
      />
      <Select
        value={String(value.month)}
        onValueChange={(m) => {
          const month = Number(m);
          onChange({ ...value, month, day: Math.min(value.day, definition.months[month].days) });
        }}
      >
        <SelectTrigger aria-label="Miesiąc" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {definition.months.map((m, i) => (
            <SelectItem key={i} value={String(i)}>{m.name || `Miesiąc ${i + 1}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberInput aria-label="Rok" className="w-24" value={value.year} onChange={(year) => onChange({ ...value, year })} />
    </div>
  );
}
