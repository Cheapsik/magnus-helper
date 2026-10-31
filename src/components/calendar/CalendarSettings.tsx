import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { realCalendar, type CalendarDefinition } from "@/lib/campaignCalendar";
import { confirmDialog } from "@/components/ui/dialogs";

export function CalendarSettings({ definition, onChange }: {
  definition: CalendarDefinition;
  onChange: (definition: CalendarDefinition) => void;
}) {
  const weekdaysText = definition.weekdays.join(", ");
  const [weekdaysDraft, setWeekdaysDraft] = useState(weekdaysText);
  useEffect(() => { setWeekdaysDraft(weekdaysText); }, [weekdaysText]);

  const set = (patch: Partial<CalendarDefinition>) => onChange({ ...definition, ...patch });
  const setMonth = (i: number, patch: Partial<CalendarDefinition["months"][number]>) =>
    set({ months: definition.months.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  const setMoon = (i: number, patch: Partial<CalendarDefinition["moons"][number]>) =>
    set({ moons: definition.moons.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          if (await confirmDialog("Zastąpić miesiące, dni tygodnia i księżyce kalendarzem rzeczywistym?", { description: "Wydarzenia zostaną.", confirmLabel: "Zastąp" })) {
            onChange(realCalendar(definition.startYear));
          }
        }}
      >
        Zacznij od kalendarza rzeczywistego
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cal-era">Oznaczenie ery (opcjonalne)</Label>
          <Input id="cal-era" value={definition.era} onChange={(e) => set({ era: e.target.value })} placeholder="np. po Założeniu" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-start">Rok początkowy</Label>
          <NumberInput id="cal-start" value={definition.startYear} onChange={(startYear) => set({ startYear })} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cal-weekdays">Dni tygodnia (oddzielone przecinkami)</Label>
        <Input
          id="cal-weekdays"
          value={weekdaysDraft}
          onChange={(e) => setWeekdaysDraft(e.target.value)}
          onBlur={() => set({ weekdays: weekdaysDraft.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Miesiące</Label>
        {definition.months.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label="Nazwa miesiąca" value={m.name} onChange={(e) => setMonth(i, { name: e.target.value })} />
            <NumberInput aria-label="Liczba dni" className="w-20" min={1} value={m.days} onChange={(days) => setMonth(i, { days })} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Usuń miesiąc"
              disabled={definition.months.length <= 1}
              onClick={() => set({ months: definition.months.filter((_, idx) => idx !== i) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set({ months: [...definition.months, { name: `Miesiąc ${definition.months.length + 1}`, days: 30 }] })}>
          <Plus className="h-4 w-4" /> Miesiąc
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Księżyce</Label>
        {definition.moons.length > 0 && (
          <p className="text-xs text-muted-foreground">Cykl w dniach; przesunięcie to wiek księżyca w pierwszym dniu roku początkowego (0 = nów).</p>
        )}
        {definition.moons.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label="Nazwa księżyca" value={m.name} onChange={(e) => setMoon(i, { name: e.target.value })} />
            <NumberInput aria-label="Cykl" className="w-20" min={1} value={m.cycle} onChange={(cycle) => setMoon(i, { cycle })} />
            <NumberInput aria-label="Przesunięcie" className="w-20" min={0} value={m.offset} onChange={(offset) => setMoon(i, { offset })} />
            <Button variant="ghost" size="icon" aria-label="Usuń księżyc" onClick={() => set({ moons: definition.moons.filter((_, idx) => idx !== i) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set({ moons: [...definition.moons, { name: "Księżyc", cycle: 28, offset: 0 }] })}>
          <Plus className="h-4 w-4" /> Księżyc
        </Button>
      </div>
    </div>
  );
}
