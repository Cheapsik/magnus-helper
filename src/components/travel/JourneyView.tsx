import { useState } from "react";
import { AlertTriangle, Footprints } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCalendarState } from "@/components/calendar/useCampaignDate";
import { formatDate, fromDayIndex } from "@/lib/campaignCalendar";
import { logChronicleEvent } from "@/lib/chronicle";
import { rollTable, type RandomTable } from "@/lib/randomTables";
import {
  advanceDay, canAdvance, chronicleText, daysTravelled, depletedSupplies, stageLabel, STATUS_LABELS, totalDays, weatherTableFor, type Journey,
} from "@/lib/travel";
import { cn } from "@/lib/utils";

/** Progress along the route, the "next day" action and the travel log. */
export function JourneyView({ journey, tables, onChange }: {
  journey: Journey;
  tables: RandomTable[];
  onChange: (fn: (j: Journey) => Journey) => void;
}) {
  const [calendar, setCalendar] = useCalendarState();
  const [note, setNote] = useState("");
  const stage = journey.stages[journey.stageIndex];
  const total = totalDays(journey);

  const roll = (tableId: string | null) => {
    const table = tables.find((t) => t.id === tableId);
    return (table && rollTable(table, tables)?.text) || "";
  };

  const nextDay = () => {
    const today = calendar.today + 1;
    const { definition } = calendar;
    const next = advanceDay(
      journey,
      {
        date: formatDate(definition, today),
        weather: roll(weatherTableFor(journey, fromDayIndex(definition, today)?.month)),
        event: roll(journey.eventTableId),
        note: note.trim(),
      },
      crypto.randomUUID(),
    );
    setCalendar((prev) => ({ ...prev, today: prev.today + 1 }));
    onChange(() => next);
    logChronicleEvent({ kind: "travel", text: chronicleText(next, next.log[next.log.length - 1]) });
    setNote("");
    const out = depletedSupplies(next);
    if (out.length) toast.warning(`Wyczerpane zapasy: ${out.map((s) => s.name).join(", ")}`);
    if (next.status === "done") toast.success(`Podróż „${next.name || "bez nazwy"}” zakończona.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={journey.status === "travelling" ? "default" : "secondary"}>{STATUS_LABELS[journey.status]}</Badge>
        <span className="text-sm text-muted-foreground">
          Dzień {daysTravelled(journey)} z {total}
          {stage && journey.status !== "done" && <> · etap {journey.stageIndex + 1}: {stageLabel(stage)} (dzień {journey.dayInStage} z {stage.days})</>}
        </span>
      </div>

      {journey.stages.length > 0 && (
        <div className="flex h-6 gap-0.5" role="img" aria-label={`Postęp: ${daysTravelled(journey)} z ${total} dni`}>
          {journey.stages.map((s, i) => {
            const done = journey.status === "done" || i < journey.stageIndex ? s.days : i === journey.stageIndex ? journey.dayInStage : 0;
            return (
              <div key={s.id} className="relative overflow-hidden rounded bg-secondary" style={{ flexGrow: s.days, flexBasis: 0 }} title={`${stageLabel(s)}: ${s.days} dni`}>
                <div className="h-full bg-primary transition-all" style={{ width: `${(done / s.days) * 100}%` }} />
                <span className="absolute inset-0 truncate px-1 text-[11px] leading-6 mix-blend-difference text-white">{s.to}</span>
              </div>
            );
          })}
        </div>
      )}
      {stage?.note && journey.status !== "done" && <p className="text-sm whitespace-pre-wrap">{stage.note}</p>}

      {journey.supplies.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {journey.supplies.map((s) => {
            const out = s.amount <= 0;
            const low = !out && s.perDay > 0 && s.amount < s.perDay;
            return (
              <li key={s.id} className={cn("rounded border px-2 py-1 text-sm", out && "border-destructive text-destructive", low && "border-amber-500")}>
                {out && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" aria-label="Wyczerpane" />}
                {s.name || "Bez nazwy"}: <span className="font-semibold">{s.amount}</span>
                {s.perDay > 0 && <span className="text-muted-foreground"> (−{s.perDay}/dzień)</span>}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Input className="flex-1 min-w-48" placeholder="Notatka MG do tego dnia (opcjonalnie)" aria-label="Notatka MG" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button onClick={nextDay} disabled={!canAdvance(journey)}>
          <Footprints className="h-4 w-4 mr-1" /> Kolejny dzień podróży
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Przesuwa kalendarz kampanii o jeden dzień, zużywa zapasy, losuje pogodę i zdarzenie z wybranych tabel i zapisuje dzień w kronice.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Dziennik podróży</h3>
        {journey.log.length === 0 ? (
          <p className="text-sm text-muted-foreground">Jeszcze nie ruszyliście w drogę.</p>
        ) : (
          <ol className="space-y-2">
            {[...journey.log].reverse().map((d) => (
              <li key={d.id} className="rounded border p-2 text-sm space-y-0.5">
                <p className="font-medium">
                  Dzień {d.day}
                  {d.date && <span className="text-muted-foreground font-normal"> · {d.date}</span>}
                  <span className="text-muted-foreground font-normal"> · {d.stage}</span>
                </p>
                {d.weather && <p><span className="text-muted-foreground">Pogoda:</span> {d.weather}</p>}
                {d.event && <p><span className="text-muted-foreground">Zdarzenie:</span> {d.event}</p>}
                {d.note && <p className="whitespace-pre-wrap">{d.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
