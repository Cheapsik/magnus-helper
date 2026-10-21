import { useState } from "react";
import { CalendarCheck, ExternalLink, Pause, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SafetyItemList } from "@/components/safety/SafetyItemList";
import { openPlayerScreenWindow, usePlayerScreen } from "@/lib/playerScreen";
import { setPlayerScreenPaused, useSafety, type SafetyState } from "@/lib/safety";

const today = () => new Date().toISOString().slice(0, 10);

export default function SafetyPage() {
  const [safety, setSafety] = useSafety();
  const [screen, setScreen] = usePlayerScreen();
  const [topicDraft, setTopicDraft] = useState("");

  const update = (patch: Partial<SafetyState>) => setSafety((prev) => ({ ...prev, ...patch }));

  const addTopic = () => {
    const text = topicDraft.trim();
    if (!text) return;
    update({ topics: [...safety.topics, { id: crypto.randomUUID(), text, done: false }] });
    setTopicDraft("");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className={screen.paused ? "border-destructive" : undefined}>
        <CardContent className="p-4 space-y-3">
          <Button
            type="button"
            size="lg"
            variant={screen.paused ? "default" : "destructive"}
            className="w-full h-16 text-lg"
            onClick={() => setPlayerScreenPaused(!screen.paused)}
          >
            {screen.paused ? <Play className="h-6 w-6 mr-2" /> : <Pause className="h-6 w-6 mr-2" />}
            {screen.paused ? "Wznów ekran graczy" : "Przerwa (karta X)"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Gracze sygnalizują kartę X gestem lub słowem przy stole — Ty wciskasz przycisk, a ekran graczy pokazuje spokojną planszę przerwy bez żadnej treści.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={openPlayerScreenWindow}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Otwórz ekran graczy
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                id="safety-show"
                checked={screen.showSafety}
                onCheckedChange={(v) => setScreen((prev) => ({ ...prev, showSafety: v, blank: v ? false : prev.blank }))}
              />
              <Label htmlFor="safety-show">Pokaż ustalenia na ekranie graczy</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="safety-log" checked={safety.logPauses} onCheckedChange={(v) => update({ logPauses: v })} />
              <Label htmlFor="safety-log">Zapisuj przerwy w kronice (bez szczegółów)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SafetyItemList
          title="Granice"
          hint="Treści, które nigdy nie pojawiają się w grze."
          items={safety.lines}
          onChange={(lines) => update({ lines })}
        />
        <SafetyItemList
          title="Zasłony"
          hint="Mogą się wydarzyć, ale poza kadrem — bez opisywania."
          items={safety.veils}
          onChange={(veils) => update({ veils })}
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="safety-notes">Notatki do ustaleń</Label>
          <Textarea id="safety-notes" rows={4} value={safety.notes} onChange={(e) => update({ notes: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="safety-reviewed">Ostatni przegląd ustaleń</Label>
            <Input
              id="safety-reviewed"
              type="date"
              className="w-auto"
              value={safety.reviewedAt}
              onChange={(e) => update({ reviewedAt: e.target.value })}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => update({ reviewedAt: today() })}>
              Dzisiaj
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Sesja zero — do omówienia</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!safety.topics.some((t) => t.done)}
              onClick={() => update({ topics: safety.topics.map((t) => ({ ...t, done: false })) })}
            >
              Odznacz wszystko
            </Button>
          </div>
          <ul className="space-y-1">
            {safety.topics.map((topic) => (
              <li key={topic.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`topic-${topic.id}`}
                  checked={topic.done}
                  onCheckedChange={(v) =>
                    update({ topics: safety.topics.map((t) => (t.id === topic.id ? { ...t, done: v === true } : t)) })
                  }
                />
                <Label htmlFor={`topic-${topic.id}`} className="flex-1 font-normal">
                  {topic.text}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Usuń temat: ${topic.text}`}
                  onClick={() => update({ topics: safety.topics.filter((t) => t.id !== topic.id) })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTopic();
            }}
          >
            <Input aria-label="Nowy temat" placeholder="Dodaj temat…" value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} />
            <Button type="submit" variant="outline" size="icon" aria-label="Dodaj temat" disabled={!topicDraft.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
