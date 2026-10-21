import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ClocksPanel } from "@/components/clocks/ClocksPanel";
import { PlayerScreenControls } from "@/components/player-screen/PlayerScreenControls";
import { useCalendarState, useCampaignDate } from "@/components/calendar/useCampaignDate";
import { useApp } from "@/context/AppContext";
import { useScene } from "@/context/SceneContext";
import { rollDiceNotation, type DiceRollResult } from "@/lib/diceNotation";
import { advanceTurn, type GmTile, type TileType } from "@/lib/gmScreen";
import { cn } from "@/lib/utils";
import { RefPicker } from "./RefPicker";
import { TableRollTile } from "./TableRollTile";

export const TILE_LABELS: Record<TileType, string> = {
  initiative: "Inicjatywa",
  clocks: "Zegary",
  table: "Tabela losowa",
  dice: "Kości",
  codex: "Wpis kodeksu",
  note: "Notatka MG",
  scene: "Scena",
  date: "Data świata",
  players: "Ekran graczy",
};

const empty = (text: string) => <p className="text-sm text-muted-foreground">{text}</p>;

function InitiativeTile() {
  const { combatants, combatRound, setCombatRound, combatTurn, setCombatTurn } = useApp();
  // Same order and turn index as the combat tracker.
  const sorted = useMemo(() => [...combatants].sort((a, b) => b.initiative - a.initiative), [combatants]);
  const next = () => {
    const n = advanceTurn(combatTurn, combatRound, sorted.length);
    setCombatTurn(n.turn);
    setCombatRound(n.round);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Runda {combatRound}</span>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/combat">
            <ExternalLink className="mr-1 h-4 w-4" /> Otwórz tracker
          </Link>
        </Button>
      </div>
      {sorted.length === 0 ? (
        empty("Brak uczestników w bieżącej walce.")
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((c, i) => (
            <li
              key={c.id}
              className={cn(
                "rounded-md border border-border px-3 py-2",
                i === combatTurn && "border-primary bg-primary/10",
                c.resource.max > 0 && c.resource.current <= 0 && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={cn("truncate font-medium", c.isEnemy && "text-destructive")}>{c.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {c.resource.max > 0 ? `${c.resource.current}/${c.resource.max}` : c.resource.current} · ini {c.initiative}
                </span>
              </div>
              {c.resource.max > 0 && <Progress className="mt-1 h-1.5" value={(c.resource.current / c.resource.max) * 100} />}
            </li>
          ))}
        </ul>
      )}
      <Button className="h-12 w-full text-base" onClick={next} disabled={sorted.length === 0}>
        Następna tura <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

function DiceTile() {
  const [notation, setNotation] = useState("");
  const [last, setLast] = useState<{ label: string; result: DiceRollResult | null } | null>(null);
  const roll = (n: string) => setLast({ label: n, result: rollDiceNotation(n) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {QUICK_DICE.map((d) => (
          <Button key={d} variant="outline" className="h-12 font-mono" onClick={() => roll(`1k${d}`)}>
            k{d}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (notation.trim()) roll(notation.trim());
        }}
      >
        <Input className="h-12" value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="np. 2k6+3" />
        <Button type="submit" className="h-12">
          Rzuć
        </Button>
      </form>
      {last && (
        <p className="text-sm">
          <span className="text-muted-foreground">{last.label}: </span>
          {last.result ? (
            <>
              <span className="font-mono text-2xl font-bold text-primary">{last.result.total}</span>
              {last.result.dice.flatMap((d) => d.results).length > 1 && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  [{last.result.dice.flatMap((d) => d.results).join(", ")}]
                  {last.result.modifier !== 0 && ` ${last.result.modifier > 0 ? "+" : ""}${last.result.modifier}`}
                </span>
              )}
            </>
          ) : (
            <span className="text-destructive">nieprawidłowa notacja</span>
          )}
        </p>
      )}
    </div>
  );
}

function CodexTile({ refId, editing, onPick }: { refId?: string; editing: boolean; onPick: (id: string) => void }) {
  const { codexEntries } = useApp();
  const entry = codexEntries.find((e) => e.id === refId);
  if (codexEntries.length === 0) return empty("Kodeks kampanii jest pusty.");
  if (editing || !entry)
    return (
      <RefPicker
        value={entry?.id}
        options={codexEntries.map((e) => ({ id: e.id, label: e.title }))}
        onPick={onPick}
        placeholder="Wybierz wpis kodeksu"
      />
    );
  return (
    <div className="space-y-1">
      <h3 className="font-semibold">{entry.title}</h3>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p>
    </div>
  );
}

function SceneTile() {
  const { activeScene } = useScene();
  if (!activeScene) return empty("Brak aktywnej sceny.");
  return (
    <div className="space-y-1">
      <h3 className="font-semibold">{activeScene.name}</h3>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{activeScene.description}</p>
    </div>
  );
}

function DateTile() {
  const date = useCampaignDate();
  const [, setState] = useCalendarState();
  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">{date}</p>
      <Button variant="outline" className="h-12 w-full" onClick={() => setState((s) => ({ ...s, today: s.today + 1 }))}>
        <CalendarPlus className="mr-2 h-5 w-5" /> +1 dzień
      </Button>
    </div>
  );
}

export function TileBody({
  tile,
  editing,
  onConfig,
}: {
  tile: GmTile;
  editing: boolean;
  onConfig: (patch: GmTile["config"]) => void;
}) {
  const pick = (refId: string) => onConfig({ refId });
  switch (tile.type) {
    case "initiative":
      return <InitiativeTile />;
    case "clocks":
      return <ClocksPanel />;
    case "table":
      return <TableRollTile refId={tile.config.refId} editing={editing} onPick={pick} />;
    case "dice":
      return <DiceTile />;
    case "codex":
      return <CodexTile refId={tile.config.refId} editing={editing} onPick={pick} />;
    case "note":
      return (
        <Textarea
          className="min-h-32"
          value={tile.config.text ?? ""}
          onChange={(e) => onConfig({ text: e.target.value })}
          placeholder="Notatki MG…"
        />
      );
    case "scene":
      return <SceneTile />;
    case "date":
      return <DateTile />;
    case "players":
      return <PlayerScreenControls />;
  }
}
