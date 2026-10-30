import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCalendarState } from "@/components/calendar/useCampaignDate";
import { JourneySetup } from "@/components/travel/JourneySetup";
import { JourneyView } from "@/components/travel/JourneyView";
import type { RandomTable } from "@/lib/randomTables";
import { daysTravelled, normalizeJourney, STATUS_LABELS, totalDays, useJourneys, type Journey } from "@/lib/travel";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/components/ui/dialogs";

export default function TravelPage() {
  const [journeys, setJourneys] = useJourneys();
  const [tables] = useLocalStorage<RandomTable[]>("rpg_random_tables", []);
  const [{ definition }] = useCalendarState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = journeys.find((j) => j.id === selectedId) ?? journeys[0];

  const update = (id: string) => (fn: (j: Journey) => Journey) => setJourneys((prev) => prev.map((j) => (j.id === id ? fn(j) : j)));
  const add = () => {
    const j = normalizeJourney({ name: `Podróż ${journeys.length + 1}` });
    setJourneys((prev) => [...prev, j]);
    setSelectedId(j.id);
  };
  const remove = async (j: Journey) => {
    if (!(await confirmDialog(`Usunąć podróż „${j.name}”?`, { confirmLabel: "Usuń", destructive: true }))) return;
    setJourneys((prev) => prev.filter((p) => p.id !== j.id));
  };
  const restart = async (j: Journey) => {
    if (!(await confirmDialog("Wrócić na początek trasy i wyczyścić dziennik?", { description: "Zapasy i kalendarz nie zostaną cofnięte.", confirmLabel: "Wróć na początek" }))) return;
    update(j.id)((x) => ({ ...x, status: "planned", stageIndex: 0, dayInStage: 0, log: [] }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          <Button size="sm" onClick={add}>
            <Plus className="h-4 w-4 mr-1" /> Nowa podróż
          </Button>
          {journeys.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Brak podróży.</p>
          ) : (
            <ul className="space-y-1">
              {journeys.map((j) => (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(j.id)}
                    className={cn("w-full rounded border px-3 py-2 text-left text-sm hover:bg-accent", selected?.id === j.id && "border-primary bg-accent")}
                  >
                    <p className="font-medium truncate">{j.name || "Bez nazwy"}</p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABELS[j.status]} · {daysTravelled(j)}/{totalDays(j)} dni
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-2">
                <h2 className="text-lg font-semibold flex-1 truncate">{selected.name || "Bez nazwy"}</h2>
                {selected.status === "done" && <Badge variant="secondary">zakończona</Badge>}
                <Button variant="ghost" size="icon-sm" aria-label="Zacznij od nowa" title="Zacznij od nowa" onClick={() => restart(selected)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label="Usuń podróż" onClick={() => remove(selected)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Tabs defaultValue={selected.stages.length ? "road" : "setup"} key={selected.id}>
                <TabsList>
                  <TabsTrigger value="road">W drodze</TabsTrigger>
                  <TabsTrigger value="setup">Trasa i zapasy</TabsTrigger>
                </TabsList>
                <TabsContent value="road">
                  <JourneyView journey={selected} tables={tables} onChange={update(selected.id)} />
                </TabsContent>
                <TabsContent value="setup">
                  <JourneySetup journey={selected} tables={tables} months={definition.months} onChange={update(selected.id)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
