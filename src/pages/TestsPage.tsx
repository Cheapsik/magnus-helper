import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings2, Target, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type Card as CampaignCard, type CardKind, CARD_KINDS, CARD_KIND_LABELS, cardTitle, newId, readNumberRef } from "@/lib/cardSchema";
import { type TestMode, type TestType } from "@/lib/campaignSystem";
import { useCampaignSystem, useCards } from "@/lib/cardStore";
import { refKey } from "@/lib/structureOps";
import { type TestOutcome, diceIssue, pickDifficulty, resolveTest } from "@/lib/testEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

const HISTORY_KEY = "rpg_test_history";
const HISTORY_LIMIT = 50;

type HistoryEntry = {
  id: string;
  at: number;
  testTypeName: string;
  /** Who and what was rolled, e.g. "Alda · Siła" or "Wartość 45". */
  source: string;
  outcome: TestOutcome;
};

type SourceMode = "card" | "manual";

const selectCls =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** How a difficulty step reads in the chip: a target number, or a modifier. */
function difficultyValueText(mode: TestMode, value: number): string {
  return mode === "rollOver" ? String(value) : signed(value);
}

/** What will be compared, before rolling — the GM sees the stakes up front. */
function preview(testType: TestType, value: number, modifier: number, difficultyValue: number): { label: string; text: string } {
  const adjusted = value + modifier;
  switch (testType.mode) {
    case "rollUnder":
      return { label: "Liczba docelowa", text: `${testType.dice} ≤ ${adjusted + difficultyValue}` };
    case "rollOver":
      return { label: "Rzut + wartość vs stopień trudności", text: `${testType.dice} ${signed(adjusted)} ≥ ${difficultyValue}` };
    case "pool": {
      const pool = testType.pool;
      const sides = testType.dice.replace(/^\s*\d*/, "");
      return {
        label: pool ? `Sukces od ${pool.successAt}, potrzeba ${pool.required}` : "Pula kości",
        text: `${Math.max(0, adjusted + difficultyValue)}${sides}`,
      };
    }
    case "bands":
      return { label: "Wynik", text: `${testType.dice} ${signed(adjusted + difficultyValue)}` };
  }
}

function isPositive(outcome: TestOutcome): boolean | null {
  if (outcome.kind === "invalid") return false;
  if (outcome.kind === "bands") return null;
  return outcome.success;
}

export default function TestsPage() {
  const [system] = useCampaignSystem();
  const [heroes] = useCards("hero");
  const [npcs] = useCards("npc");
  const [monsters] = useCards("monster");
  const cardsByKind: Record<CardKind, CampaignCard[]> = { hero: heroes, npc: npcs, monster: monsters };
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);

  const [testTypeId, setTestTypeId] = useState<string>();
  const [sourceMode, setSourceMode] = useState<SourceMode>("card");
  const [kind, setKind] = useState<CardKind>("hero");
  const [cardId, setCardId] = useState<string>();
  const [sourceKey, setSourceKey] = useState<string>();
  const [manualValue, setManualValue] = useState(0);
  const [difficultyId, setDifficultyId] = useState<string>();
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState<HistoryEntry | null>(null);

  const testTypes = system.testTypes;
  if (testTypes.length === 0) {
    return (
      <div className="animate-fade-in">
        <Card className="border-dashed">
          <CardContent className="space-y-3 p-6 text-center">
            <Target className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ta kampania nie ma jeszcze rodzajów testów. Określ, czym się rzuca i z czym porównuje wynik, a potem wróć tutaj.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/settings?tab=testy">
                <Settings2 className="h-4 w-4" /> Zdefiniuj rodzaje testów
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const testType = testTypes.find((t) => t.id === testTypeId) ?? testTypes[0];
  const difficulty = pickDifficulty(testType, difficultyId);
  const sources = testType.sources?.[kind] ?? [];
  const cards = cardsByKind[kind];
  const card = cards.find((c) => c.id === cardId) ?? cards[0];
  const source = sources.find((s) => refKey(s.ref) === sourceKey) ?? sources[0];
  const fromCard = sourceMode === "card";
  const cardReady = Boolean(card && source);
  const value = fromCard ? (card && source ? readNumberRef(card.values, source.ref) : 0) : manualValue;
  const issue = diceIssue(testType);
  const canRoll = !issue && (!fromCard || cardReady);
  const stakes = preview(testType, value, modifier, difficulty?.value ?? 0);

  const roll = () => {
    if (!canRoll) return;
    const outcome = resolveTest(testType, { value, difficultyId: difficulty?.id, modifier });
    const entry: HistoryEntry = {
      id: newId(),
      at: Date.now(),
      testTypeName: testType.name,
      source: fromCard && card && source ? `${cardTitle(card)} · ${source.label}` : `Wartość ${value}`,
      outcome,
    };
    setResult(entry);
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  };

  const clearHistory = () => {
    setResult(null);
    setHistory([]);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="field-label">Rodzaj testu</label>
          <Link to="/settings?tab=testy" className="text-xs text-muted-foreground hover:text-foreground">
            Edytuj rodzaje testów
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {testTypes.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === testType.id ? "default" : "outline"}
              className="text-xs"
              onClick={() => {
                setTestTypeId(t.id);
                setDifficultyId(undefined);
                setSourceKey(undefined);
              }}
            >
              {t.name.trim() || "Bez nazwy"}
            </Button>
          ))}
        </div>
        {issue && (
          <p className="mt-1.5 text-xs text-destructive">
            {issue}.{" "}
            <Link to="/settings?tab=testy" className="underline">
              Popraw w ustawieniach
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="field-label">Wartość</label>
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Źródło wartości">
            {(
              [
                ["card", "Z karty"],
                ["manual", "Wpisz ręcznie"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={sourceMode === mode}
                onClick={() => setSourceMode(mode)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  sourceMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {fromCard ? (
          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Typ karty">
              {CARD_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={k === kind}
                  onClick={() => {
                    setKind(k);
                    setCardId(undefined);
                    setSourceKey(undefined);
                  }}
                  className={cn(
                    "flex-1 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    k === kind ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {CARD_KIND_LABELS[k]}
                </button>
              ))}
            </div>
            <select
              className={selectCls}
              value={card?.id ?? ""}
              onChange={(e) => setCardId(e.target.value)}
              disabled={cards.length === 0}
              aria-label="Karta"
            >
              {cards.length === 0 && <option value="">Brak kart</option>}
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {cardTitle(c)}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={source ? refKey(source.ref) : ""}
              onChange={(e) => setSourceKey(e.target.value)}
              disabled={sources.length === 0}
              aria-label="Pole karty"
            >
              {sources.length === 0 && <option value="">Brak pól dla tego testu</option>}
              {sources.map((s) => (
                <option key={refKey(s.ref)} value={refKey(s.ref)}>
                  {s.label}
                  {card ? ` (${readNumberRef(card.values, s.ref)})` : ""}
                </option>
              ))}
            </select>
            {!cardReady && (
              <p className="text-xs text-muted-foreground sm:col-span-3">
                {cards.length === 0
                  ? `Brak kart typu ${CARD_KIND_LABELS[kind]}. Wpisz wartość ręcznie albo dodaj kartę.`
                  : "Ten test nie ma wskazanych pól dla tego typu karty. Wskaż je w ustawieniach rodzajów testów albo wpisz wartość ręcznie."}
              </p>
            )}
          </div>
        ) : (
          <NumberInput value={manualValue} onChange={setManualValue} className="h-12 text-center text-lg font-bold" aria-label="Wartość" />
        )}
      </section>

      {testType.difficulties.length > 0 && (
        <section>
          <label className="field-label mb-1.5 block">Poziom trudności</label>
          <div className="flex flex-wrap gap-1.5">
            {testType.difficulties.map((d) => (
              <Button
                key={d.id}
                size="sm"
                variant={difficulty?.id === d.id ? "default" : "outline"}
                className="text-xs"
                onClick={() => setDifficultyId(d.id)}
              >
                {d.name} ({difficultyValueText(testType.mode, d.value)})
              </Button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Dodatkowy modyfikator</label>
          <NumberInput value={modifier} onChange={setModifier} className="h-12 text-center text-lg font-bold" />
        </div>
        <Card className="border-primary/30">
          <CardContent className="flex h-full flex-col justify-center p-2 text-center">
            <div className="text-xs text-muted-foreground">{stakes.label}</div>
            <div className="text-xl font-bold text-primary">{stakes.text}</div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={roll} disabled={!canRoll} className="h-12 w-full gap-2 text-base font-semibold">
        <Target className="h-5 w-5" /> Rzuć
      </Button>

      {result && <OutcomeCard key={result.id} entry={result} />}

      {history.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="field-label">Ostatnie testy</label>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={clearHistory}>
              <Trash2 className="h-3 w-3" /> Wyczyść
            </Button>
          </div>
          <div className="max-h-[28rem] space-y-1 overflow-y-auto">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function headline(outcome: TestOutcome): string {
  switch (outcome.kind) {
    case "invalid":
      return "Nie można rzucić";
    case "bands":
      return outcome.band?.label || "Poza przedziałami";
    case "pool":
      return outcome.success ? "Sukces" : "Porażka";
    default:
      if (outcome.critical === "success") return "Krytyczny sukces";
      if (outcome.critical === "failure") return "Krytyczna porażka";
      return outcome.success ? "Sukces" : "Porażka";
  }
}

/** The number to show big: the roll for roll-under, the total otherwise. */
function mainNumber(outcome: TestOutcome): string {
  switch (outcome.kind) {
    case "rollUnder":
      return String(outcome.roll);
    case "rollOver":
    case "bands":
      return String(outcome.total);
    case "pool":
      return String(outcome.successes);
    case "invalid":
      return "—";
  }
}

function OutcomeCard({ entry }: { entry: HistoryEntry }) {
  const { outcome } = entry;
  const positive = isPositive(outcome);
  const tone = positive === null ? "primary" : positive ? "success" : "destructive";

  return (
    <Card
      className={cn(
        "animate-fade-in border-2",
        tone === "success" && "border-success",
        tone === "destructive" && "border-destructive",
        tone === "primary" && "border-primary",
      )}
      style={
        positive === null
          ? undefined
          : { animation: positive ? "pulse-success 0.6s ease-out, fade-in 0.3s ease-out" : "pulse-fail 0.6s ease-out, fade-in 0.3s ease-out" }
      }
    >
      <CardContent className="space-y-1 p-4 text-center">
        <div className="text-xs text-muted-foreground">
          {entry.testTypeName} · {entry.source}
          {outcome.kind !== "invalid" && outcome.difficulty ? ` · ${outcome.difficulty.name}` : ""}
          {outcome.kind !== "invalid" && outcome.modifier !== 0 ? ` · mod. ${signed(outcome.modifier)}` : ""}
        </div>
        <div
          className={cn(
            "text-sm font-bold uppercase tracking-wider",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
            tone === "primary" && "text-primary",
          )}
        >
          {headline(outcome)}
        </div>
        <div className="animate-dice-bounce text-4xl font-bold">{mainNumber(outcome)}</div>
        <OutcomeDetails outcome={outcome} />
      </CardContent>
    </Card>
  );
}

function Faces({ faces, good, bad }: { faces: number[]; good?: (face: number) => boolean; bad?: (face: number) => boolean }) {
  if (faces.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1 pt-1">
      {faces.map((face, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded border px-1 text-sm font-semibold tabular-nums",
            good?.(face) && "border-success/60 bg-success/15 text-success",
            !good?.(face) && bad?.(face) && "border-destructive/60 bg-destructive/15 text-destructive",
          )}
        >
          {face}
        </span>
      ))}
    </div>
  );
}

function OutcomeDetails({ outcome }: { outcome: TestOutcome }) {
  switch (outcome.kind) {
    case "invalid":
      return <div className="text-sm text-muted-foreground">{outcome.summary}</div>;
    case "rollUnder":
    case "rollOver": {
      const comparison =
        outcome.kind === "rollUnder"
          ? `rzut ${outcome.roll} vs cel ${outcome.target}`
          : `rzut ${outcome.natural} ${signed(outcome.total - outcome.natural)} = ${outcome.total} vs ${outcome.target}`;
      const of = outcome.success ? "sukcesu" : "porażki";
      return (
        <>
          <div className="text-sm text-muted-foreground">
            {comparison} · margines {of}: {outcome.margin}
          </div>
          {outcome.degrees !== null && (
            <div className="text-xs text-muted-foreground">
              {outcome.degreesLabel}: {outcome.degrees}
            </div>
          )}
          {outcome.faces.length > 1 && <Faces faces={outcome.faces} />}
        </>
      );
    }
    case "pool":
      return (
        <>
          <div className="text-sm text-muted-foreground">
            sukcesów {outcome.successes} z wymaganych {outcome.required} · kości {outcome.diceCount}
            {outcome.faces.length > outcome.diceCount ? ` (+${outcome.faces.length - outcome.diceCount} dodatkowe)` : ""}
          </div>
          <Faces
            faces={outcome.faces}
            good={(face) => face >= (outcome.faces.length ? successAtOf(outcome) : Infinity)}
            bad={(face) => face === 1}
          />
        </>
      );
    case "bands":
      return (
        <>
          <div className="text-sm text-muted-foreground">
            rzut {outcome.natural} {signed(outcome.total - outcome.natural)} = {outcome.total}
          </div>
          {outcome.faces.length > 1 && <Faces faces={outcome.faces} />}
        </>
      );
  }
}

/**
 * The pool outcome doesn't carry the threshold, so infer it as the lowest face
 * that could have counted: successes are the dice at or over it.
 */
function successAtOf(outcome: Extract<TestOutcome, { kind: "pool" }>): number {
  const sorted = [...outcome.faces].sort((a, b) => b - a);
  const hits = outcome.successes + (outcome.ones > 0 ? outcome.ones : 0);
  return sorted[Math.max(0, Math.min(sorted.length, hits) - 1)] ?? Infinity;
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { outcome } = entry;
  const positive = isPositive(outcome);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate">
          <span className="text-muted-foreground">{entry.testTypeName}</span>
          <span className="ml-2 text-xs text-muted-foreground">{entry.source}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{outcome.summary}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            positive === null && "bg-primary/20 text-primary",
            positive === true && "bg-success/20 text-success",
            positive === false && "bg-destructive/20 text-destructive",
          )}
        >
          {headline(outcome)}
        </span>
        <span className="min-w-[2ch] text-right font-bold">{mainNumber(outcome)}</span>
      </div>
    </div>
  );
}
