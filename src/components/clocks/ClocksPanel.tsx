import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Link2, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDone, moveClock, normalizeClock, tick, useClocks, type Clock } from "@/lib/clocks";
import { cn } from "@/lib/utils";
import { ClockDial } from "./ClockDial";
import { ClockEditor, useQuestTitles } from "./ClockEditor";

/**
 * Self-contained clock list: reads and writes campaign storage itself, so it
 * can be dropped anywhere (the clocks page, the combat side panel).
 * `wide` lays clocks out as a card grid with bigger dials for the full page.
 */
export function ClocksPanel({ wide = false }: { wide?: boolean }) {
  const [clocks, setClocks] = useClocks();
  const quests = useQuestTitles();
  const [editing, setEditing] = useState<Clock | null>(null);

  const update = (id: string, fn: (c: Clock) => Clock) => setClocks((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  const save = (c: Clock) =>
    setClocks((prev) => (prev.some((p) => p.id === c.id) ? prev.map((p) => (p.id === c.id ? c : p)) : [...prev, c]));
  const remove = (c: Clock) => {
    if (!confirm(`Czy na pewno usunąć zegar '${c.name}'?`)) return;
    setClocks((prev) => prev.filter((p) => p.id !== c.id));
  };
  const questTitle = (id: string | null) => (id ? quests.find((q) => q.id === id)?.title : undefined);

  const iconBtn = "h-8 w-8";
  const smallBtn = "h-7 w-7 shrink-0";
  return (
    <div className="space-y-3">
      {wide && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          Zegar pokazuje, jak blisko jest coś, co się stanie, jeśli gracze nie zareagują: pościg straży, rytuał kultu, burza
          nad przełęczą. Gdy bohaterowie zwlekają albo coś pójdzie nie tak, zamaluj segment (kliknij tarczę lub „+”).
          Pełny zegar oznacza, że zdarzenie właśnie następuje. Zegar oznaczony okiem widzą gracze na ekranie graczy.
        </p>
      )}
      <Button size="sm" onClick={() => setEditing(normalizeClock({ segments: 4 }))}>
        <Plus className="h-4 w-4 mr-1" /> Dodaj zegar
      </Button>

      {clocks.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm py-6">Brak zegarów. Dodaj pierwszy przyciskiem powyżej.</p>
      ) : (
        <ul className={cn(wide ? "grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4" : "space-y-2")}>
          {clocks.map((c, i) => {
            const done = isDone(c);
            const quest = questTitle(c.questId);
            return (
              <li key={c.id}>
                <Card className={cn(done && "border-destructive")}>
                  <CardContent className={cn("flex gap-3", wide ? "p-4" : "p-2")}>
                    <button
                      type="button"
                      className="shrink-0 rounded-full disabled:cursor-default"
                      disabled={done}
                      onClick={() => update(c.id, (x) => tick(x, 1))}
                      aria-label={`Dodaj segment: ${c.name}`}
                      title="Kliknij, aby dodać segment"
                    >
                      <ClockDial clock={c} size={wide ? 96 : 56} />
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start gap-0.5">
                        <p className="font-medium truncate flex-1 pt-1">{c.name}</p>
                        {c.visibleToPlayers && <Eye className="mt-1.5 mr-1 h-4 w-4 text-muted-foreground shrink-0" aria-label="Widoczny dla graczy" />}
                        <Button variant="ghost" size="icon" className={smallBtn} aria-label="Edytuj" onClick={() => setEditing(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={smallBtn} aria-label="Przesuń wyżej" disabled={i === 0} onClick={() => setClocks((prev) => moveClock(prev, c.id, -1))}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={smallBtn} aria-label="Przesuń niżej" disabled={i === clocks.length - 1} onClick={() => setClocks((prev) => moveClock(prev, c.id, 1))}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn(smallBtn, "text-destructive")} aria-label="Usuń" onClick={() => remove(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.filled}/{c.segments}
                        {done && <span className="ml-2 font-semibold text-destructive">Pełny</span>}
                      </p>
                      {quest && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Link2 className="h-3 w-3 shrink-0" /> {quest}
                        </p>
                      )}
                      {wide && c.note && <p className="text-xs whitespace-pre-wrap">{c.note}</p>}
                      <div className="flex gap-1 pt-1">
                        <Button variant="outline" size="icon" className={iconBtn} aria-label="Cofnij segment" disabled={c.filled === 0} onClick={() => update(c.id, (x) => tick(x, -1))}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className={iconBtn} aria-label="Dodaj segment" disabled={done} onClick={() => update(c.id, (x) => tick(x, 1))}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={iconBtn} aria-label="Wyzeruj" disabled={c.filled === 0} onClick={() => update(c.id, (x) => ({ ...x, filled: 0 }))}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ClockEditor clock={editing} onSave={save} onClose={() => setEditing(null)} />
    </div>
  );
}
