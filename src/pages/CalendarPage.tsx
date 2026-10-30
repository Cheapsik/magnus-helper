import { useState } from "react";
import { Moon, Plus, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import { MentionTextarea } from "@/components/mention/MentionTextarea";
import { CalendarSettings } from "@/components/calendar/CalendarSettings";
import { DateFields } from "@/components/calendar/DateFields";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { useCalendarState } from "@/components/calendar/useCampaignDate";
import { logChronicleEvent } from "@/lib/chronicle";
import { cn } from "@/lib/utils";
import {
  eventDayIndex, formatDate, fromDayIndex, moonPhase, toDayIndex,
  type CalendarDate, type CalendarEvent,
} from "@/lib/campaignCalendar";
import { confirmDialog } from "@/components/ui/dialogs";

function relative(days: number): string {
  if (days === 0) return "dziś";
  if (days === 1) return "jutro";
  if (days === -1) return "wczoraj";
  return days > 0 ? `za ${days} dni` : `${-days} dni temu`;
}

export default function CalendarPage() {
  const [state, setState] = useCalendarState();
  const { definition, today, events } = state;
  const todayDate = fromDayIndex(definition, today) ?? { year: definition.startYear, month: 0, day: 1 };

  const [view, setView] = useState({ year: todayDate.year, month: todayDate.month });
  const [selected, setSelected] = useState<CalendarDate>(todayDate);
  const [jump, setJump] = useState(7);
  const [setTo, setSetTo] = useState<CalendarDate>(todayDate);
  const [showSettings, setShowSettings] = useState(false);
  const [title, setTitle] = useState("");
  const [yearly, setYearly] = useState(false);

  const goTo = (index: number) => {
    const date = fromDayIndex(definition, index);
    if (index === today) return;
    const diff = index - today;
    logChronicleEvent({ kind: "calendar", text: `Czas w świecie: ${diff > 0 ? "+" : ""}${diff} dni → ${formatDate(definition, index)}` });
    setState((s) => ({ ...s, today: index }));
    if (date) setView({ year: date.year, month: date.month });
  };

  const updateEvent = (id: string, patch: Partial<CalendarEvent>) =>
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const addEvent = () => {
    if (!title.trim() || toDayIndex(definition, selected) === null) return;
    const event: CalendarEvent = { id: crypto.randomUUID(), title: title.trim(), date: selected, description: "", yearly };
    setState((s) => ({ ...s, events: [...s.events, event] }));
    setTitle("");
    setYearly(false);
  };

  const dated = events
    .map((event) => ({ event, index: eventDayIndex(definition, event, today) }))
    .sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity));
  const upcoming = dated.filter((d) => d.index !== null && d.index >= today);
  const past = dated.filter((d) => d.index !== null && d.index < today).reverse();
  const outside = dated.filter((d) => d.index === null);

  const renderEvent = ({ event, index }: { event: CalendarEvent; index: number | null }) => (
    <Card key={event.id} className={cn(index !== null && index < today && "opacity-60")}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{event.title}</div>
            <div className="text-xs text-muted-foreground">
              {index === null ? "data spoza kalendarza" : `${formatDate(definition, index)} · ${relative(index - today)}`}
            </div>
          </div>
          {event.yearly && <Badge variant="secondary">co roku</Badge>}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Usuń wydarzenie"
            onClick={async () => {
              if (await confirmDialog(`Usunąć wydarzenie „${event.title}”?`, { confirmLabel: "Usuń", destructive: true })) {
                setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== event.id) }));
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <MentionTextarea
          value={event.description}
          onChange={(description) => updateEvent(event.id, { description })}
          placeholder="Opis, @wzmianki…"
          className="text-xs"
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Dziś w świecie</div>
              <div className="text-xl font-semibold">{formatDate(definition, today)}</div>
              {definition.moons.map((moon, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Moon className="h-3 w-3" /> {moon.name}: {moonPhase(moon, today) ?? "—"}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
              <Settings2 className="h-4 w-4" /> Ustawienia kalendarza
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => goTo(today + 1)}>+1 dzień</Button>
            <NumberInput aria-label="Liczba dni" className="w-20" value={jump} onChange={setJump} />
            <Button size="sm" variant="outline" onClick={() => goTo(today + jump)}>Przesuń o {jump} dni</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateFields definition={definition} value={setTo} onChange={setSetTo} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const index = toDayIndex(definition, setTo);
                if (index !== null) goTo(index);
              }}
            >
              Ustaw datę
            </Button>
          </div>
        </CardContent>
      </Card>

      {showSettings && (
        <Card>
          <CardContent className="p-4">
            <CalendarSettings definition={definition} onChange={(d) => setState((s) => ({ ...s, definition: d }))} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <MonthGrid
              definition={definition}
              events={events}
              today={today}
              view={view}
              selected={selected}
              onView={setView}
              onSelect={setSelected}
            />
            <div className="space-y-2">
              <Label htmlFor="cal-event-title">Nowe wydarzenie</Label>
              <div className="flex gap-2">
                <Input
                  id="cal-event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEvent()}
                  placeholder="Tytuł"
                />
                <Button onClick={addEvent} disabled={!title.trim()}>
                  <Plus className="h-4 w-4" /> Dodaj
                </Button>
              </div>
              <DateFields definition={definition} value={selected} onChange={setSelected} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={yearly} onCheckedChange={(v) => setYearly(v === true)} /> Powtarzaj co roku
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Nadchodzące</h2>
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Brak nadchodzących wydarzeń.</p>}
            {upcoming.map(renderEvent)}
          </section>
          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Minęły</h2>
              {past.map(renderEvent)}
            </section>
          )}
          {outside.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Poza kalendarzem</h2>
              {outside.map(renderEvent)}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
