import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CardKind,
  type CardTypeDef,
  type LabelledRef,
  CARD_KINDS,
  CARD_KIND_LABELS,
  findField,
  newId,
} from "@/lib/cardSchema";
import {
  type CampaignSystem,
  type Difficulty,
  type OutcomeBand,
  type TestMode,
  type TestType,
  TEST_MODE_LABELS,
  emptyTestSources,
} from "@/lib/campaignSystem";
import { type RefTarget, listRefTargets, refKey } from "@/lib/structureOps";
import { diceIssue } from "@/lib/testEngine";
import { useCampaignSystem } from "@/lib/cardStore";
import { NumberInput } from "@/components/ui/number-input";
import { AddRow } from "@/components/system/FieldEditor";
import { Labeled, MoveButtons, iconBtn, inputCls } from "@/components/system/controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** What the source value and the difficulty mean in each mode, in the GM's words. */
const MODE_HELP: Record<TestMode, string> = {
  rollUnder: "Sukces, gdy rzut jest równy lub niższy od wartości z karty powiększonej o modyfikator trudności.",
  rollOver: "Do rzutu dodawana jest wartość z karty; sukces, gdy wynik osiąga stopień trudności (liczbę docelową).",
  pool: "Rzucasz tyle kości, ile wynosi wartość z karty plus modyfikator trudności. Każda kość od progu w górę to sukces.",
  bands: "Rzut plus wartość z karty plus modyfikator trudności; wynik wskazuje przedział z nazwanym skutkiem.",
};

const DIFFICULTY_VALUE_LABEL: Record<TestMode, string> = {
  rollUnder: "Modyfikator wartości",
  rollOver: "Liczba docelowa",
  pool: "Kości dodatkowe",
  bands: "Modyfikator wyniku",
};

function newTestType(name: string): TestType {
  const difficulty = { id: newId(), name: "Przeciętny", value: 0 };
  return {
    id: newId(),
    name,
    mode: "rollUnder",
    dice: "1k100",
    difficulties: [difficulty],
    defaultDifficultyId: difficulty.id,
    sources: emptyTestSources(),
  };
}

/** Switching modes keeps the ladder and sources; settings only one mode reads get sensible starters. */
function withMode(type: TestType, mode: TestMode): TestType {
  const next: TestType = { ...type, mode };
  // Critical thresholds point the other way in the two compared modes.
  if (mode !== type.mode) delete next.critical;
  if (mode === "pool" && !next.pool) next.pool = { successAt: 5, required: 1 };
  if (mode === "bands" && !next.bands?.length) {
    next.bands = [
      { id: newId(), label: "Porażka", atMost: 5 },
      { id: newId(), label: "Sukces" },
    ];
  }
  return next;
}

function duplicate(type: TestType): TestType {
  return { ...structuredClone(type), id: newId(), name: `${type.name} (kopia)` };
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Card values a test can be rolled from: numbers only, so text and dice fields are left out. */
function numericTargets(cardType: CardTypeDef): RefTarget[] {
  return listRefTargets(cardType).filter(({ ref }) => {
    const field = findField(cardType, ref.fieldId);
    if (!field) return false;
    if (field.type === "table") return field.columns?.find((column) => column.id === ref.columnId)?.type === "number";
    return field.type === "number" || field.type === "track" || field.type === "currentMax";
  });
}

export function TestTypesEditor() {
  const [system, setSystem] = useCampaignSystem();
  const [open, setOpen] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TestType | null>(null);
  const types = system.testTypes;

  const setTypes = (fn: (prev: TestType[]) => TestType[]) =>
    setSystem((prev) => ({ ...prev, testTypes: fn(prev.testTypes) }));
  const update = (id: string, fn: (type: TestType) => TestType) =>
    setTypes((prev) => prev.map((type) => (type.id === id ? fn(type) : type)));

  const add = () => {
    const created = newTestType(newName.trim());
    setTypes((prev) => [...prev, created]);
    setOpen(created.id);
    setNewName("");
  };

  const remove = (id: string) => {
    // An attack that rolled this test falls back to a hand-entered roll rather than pointing at nothing.
    setSystem((prev: CampaignSystem) => ({
      ...prev,
      testTypes: prev.testTypes.filter((type) => type.id !== id),
      attackTypes: prev.attackTypes.map((attack) => {
        if (attack.testTypeId !== id) return attack;
        const { testTypeId: _removed, ...manual } = attack;
        return manual;
      }),
    }));
    setDeleteTarget(null);
  };

  const usedBy = deleteTarget ? system.attackTypes.filter((attack) => attack.testTypeId === deleteTarget.id) : [];

  return (
    <div className="space-y-3">
      <p className="text-[length:--fs-meta] text-muted-foreground">
        Rodzaj testu opisuje, jak Magnus rozstrzyga rzut: czym się rzuca, z czym porównuje wynik i z których pól karty
        wolno go wykonać. Magnus nie zna żadnych zasad — wszystko ustalasz tutaj.
      </p>

      {types.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Kampania nie ma jeszcze rodzajów testów. Dodaj pierwszy, np. „Test cechy” albo „Test umiejętności”.
        </p>
      )}

      {types.map((type, index) => (
        <TestTypeSection
          key={type.id}
          type={type}
          system={system}
          expanded={open === type.id}
          onToggle={() => setOpen((current) => (current === type.id ? null : type.id))}
          first={index === 0}
          last={index === types.length - 1}
          onChange={(fn) => update(type.id, fn)}
          onMove={(direction) => setTypes((prev) => move(prev, prev.findIndex((t) => t.id === type.id), direction))}
          onDuplicate={() => {
            const copy = duplicate(type);
            setTypes((prev) => {
              const at = prev.findIndex((t) => t.id === type.id);
              return [...prev.slice(0, at + 1), copy, ...prev.slice(at + 1)];
            });
            setOpen(copy.id);
          }}
          onDelete={() => setDeleteTarget(type)}
        />
      ))}

      <AddRow placeholder="Nazwa nowego rodzaju testu" value={newName} onValue={setNewName} onAdd={add} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć rodzaj testu „{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Drabina trudności i ustawienia tego testu znikną.
              {usedBy.length > 0 &&
                ` Rodzaje ataku, które go używają (${usedBy.map((attack) => attack.name).join(", ")}), przejdą na rzut wpisywany ręcznie.`}{" "}
              Historia wykonanych testów zostanie zachowana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget.id)}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TestTypeSection({
  type,
  system,
  expanded,
  onToggle,
  first,
  last,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  type: TestType;
  system: CampaignSystem;
  expanded: boolean;
  onToggle: () => void;
  first: boolean;
  last: boolean;
  onChange: (fn: (type: TestType) => TestType) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const issue = diceIssue(type);
  const compared = type.mode === "rollUnder" || type.mode === "rollOver";

  return (
    <section className="rounded-md border border-border">
      <header className="flex items-center gap-1.5 border-b border-border bg-white/[0.03] px-2 py-1.5">
        <button
          type="button"
          className={iconBtn}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Zwiń: ${type.name}` : `Rozwiń: ${type.name}`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <input
          className={cn(inputCls, "flex-1 border-transparent bg-transparent font-medium hover:border-input")}
          value={type.name}
          onChange={(e) => onChange((t) => ({ ...t, name: e.target.value }))}
          aria-label="Nazwa rodzaju testu"
        />
        <span className="hidden shrink-0 text-[length:--fs-meta] text-muted-foreground sm:inline">
          {TEST_MODE_LABELS[type.mode]} · {type.dice || "—"}
        </span>
        {issue && <span className="shrink-0 text-[length:--fs-meta] text-destructive">błąd kości</span>}
        <MoveButtons onMove={onMove} first={first} last={last} label={type.name} />
        <button type="button" className={iconBtn} onClick={onDuplicate} aria-label={`Duplikuj: ${type.name}`}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, "hover:text-destructive")}
          onClick={onDelete}
          aria-label={`Usuń: ${type.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {expanded && (
        <div className="space-y-4 p-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-end gap-2">
              <Labeled label="Tryb" className="w-64">
                <select
                  className={inputCls}
                  value={type.mode}
                  onChange={(e) => onChange((t) => withMode(t, e.target.value as TestMode))}
                >
                  {(Object.keys(TEST_MODE_LABELS) as TestMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {TEST_MODE_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label={type.mode === "pool" ? "Kość w puli" : "Kości"} className="w-32">
                <input
                  className={cn(inputCls, issue && "border-destructive")}
                  value={type.dice}
                  onChange={(e) => onChange((t) => ({ ...t, dice: e.target.value }))}
                  placeholder={type.mode === "pool" ? "np. 1k10" : "np. 1k100"}
                  aria-invalid={issue !== null}
                />
              </Labeled>
            </div>
            {issue && <p className="text-[length:--fs-meta] text-destructive">{issue}</p>}
            <p className="text-[length:--fs-meta] text-muted-foreground">{MODE_HELP[type.mode]}</p>
          </div>

          <DifficultyLadder type={type} onChange={onChange} />

          {type.mode === "pool" && <PoolSettings type={type} onChange={onChange} />}
          {type.mode === "bands" && <BandsEditor type={type} onChange={onChange} />}

          {compared && (
            <div className="grid gap-4 md:grid-cols-2">
              <MarginSettings type={type} onChange={onChange} />
              <CriticalSettings type={type} onChange={onChange} />
            </div>
          )}

          <SourcesEditor type={type} system={system} onChange={onChange} />
        </div>
      )}
    </section>
  );
}

type SubEditorProps = { type: TestType; onChange: (fn: (type: TestType) => TestType) => void };

function SubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      {hint && <p className="text-[length:--fs-meta] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DifficultyLadder({ type, onChange }: SubEditorProps) {
  const [newName, setNewName] = useState("");
  const defaultId = type.defaultDifficultyId ?? type.difficulties[0]?.id;

  const setDifficulties = (fn: (prev: Difficulty[]) => Difficulty[]) =>
    onChange((t) => {
      const difficulties = fn(t.difficulties);
      const keepsDefault = difficulties.some((d) => d.id === t.defaultDifficultyId);
      return { ...t, difficulties, defaultDifficultyId: keepsDefault ? t.defaultDifficultyId : difficulties[0]?.id };
    });
  const patch = (id: string, values: Partial<Difficulty>) =>
    setDifficulties((prev) => prev.map((d) => (d.id === id ? { ...d, ...values } : d)));

  return (
    <div className="space-y-1.5">
      <SubHeading
        title="Drabina trudności"
        hint={`${DIFFICULTY_VALUE_LABEL[type.mode]} dla każdego stopnia. Zaznaczony stopień jest wybierany domyślnie.`}
      />
      {type.difficulties.length === 0 && (
        <p className="text-[length:--fs-meta] text-muted-foreground">Bez stopni trudności test rzuca się bez modyfikatora.</p>
      )}
      <ul className="space-y-1">
        {type.difficulties.map((difficulty, index) => (
          <li key={difficulty.id} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`domyslna-${type.id}`}
              checked={difficulty.id === defaultId}
              onChange={() => onChange((t) => ({ ...t, defaultDifficultyId: difficulty.id }))}
              aria-label={`Domyślna trudność: ${difficulty.name}`}
              title="Domyślna"
            />
            <input
              className={cn(inputCls, "flex-1")}
              value={difficulty.name}
              onChange={(e) => patch(difficulty.id, { name: e.target.value })}
              aria-label="Nazwa stopnia trudności"
            />
            <NumberInput
              className={cn(inputCls, "w-24 shrink-0 text-right")}
              value={difficulty.value}
              onChange={(value) => patch(difficulty.id, { value })}
              aria-label={DIFFICULTY_VALUE_LABEL[type.mode]}
            />
            <MoveButtons
              onMove={(direction) => setDifficulties((prev) => move(prev, index, direction))}
              first={index === 0}
              last={index === type.difficulties.length - 1}
              label={difficulty.name}
            />
            <button
              type="button"
              className={cn(iconBtn, "hover:text-destructive")}
              onClick={() => setDifficulties((prev) => prev.filter((d) => d.id !== difficulty.id))}
              aria-label={`Usuń stopień: ${difficulty.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <AddRow
        placeholder="Nazwa nowego stopnia trudności"
        value={newName}
        onValue={setNewName}
        onAdd={() => {
          const name = newName.trim();
          setDifficulties((prev) => [...prev, { id: newId(), name, value: 0 }]);
          setNewName("");
        }}
      />
    </div>
  );
}

/** A number the GM may leave empty to switch the option off. */
function OptionalNumber({
  value,
  onChange,
  label,
  placeholder = "wył.",
}: {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  label: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);
  return (
    <input
      className={cn(inputCls, "text-right")}
      inputMode="numeric"
      value={draft}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => {
        const text = e.target.value.trim();
        if (text !== "" && text !== "-" && Number.isNaN(Number(text))) return;
        setDraft(e.target.value);
        if (text === "") onChange(undefined);
        else if (text !== "-") onChange(Number(text));
      }}
    />
  );
}

function MarginSettings({ type, onChange }: SubEditorProps) {
  const margin = type.margin;
  return (
    <div className="space-y-1.5">
      <SubHeading title="Margines" hint="Liczy stopnie: margines (różnica rzutu i celu) podzielony przez dzielnik, w dół." />
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={margin !== undefined}
          onChange={(e) =>
            onChange((t) => {
              if (e.target.checked) return { ...t, margin: { divisor: 10, label: "Stopnie" } };
              const { margin: _removed, ...rest } = t;
              return rest;
            })
          }
        />
        Licz stopnie sukcesu i porażki
      </label>
      {margin && (
        <div className="flex flex-wrap gap-2">
          <Labeled label="Dzielnik" className="w-24">
            <NumberInput
              className={cn(inputCls, "text-right")}
              value={margin.divisor}
              min={1}
              onChange={(divisor) => onChange((t) => ({ ...t, margin: { ...margin, divisor } }))}
            />
          </Labeled>
          <Labeled label="Nazwa" className="min-w-[8rem] flex-1">
            <input
              className={inputCls}
              value={margin.label}
              onChange={(e) => onChange((t) => ({ ...t, margin: { ...margin, label: e.target.value } }))}
            />
          </Labeled>
        </div>
      )}
    </div>
  );
}

function CriticalSettings({ type, onChange }: SubEditorProps) {
  const critical = type.critical ?? {};
  // A low roll is good when rolling under, a high one when rolling over.
  const lowIsGood = type.mode === "rollUnder";
  const successKey = lowIsGood ? "successAtMost" : "successAtLeast";
  const failureKey = lowIsGood ? "failureAtLeast" : "failureAtMost";

  const set = (key: keyof NonNullable<TestType["critical"]>, value: number | undefined) =>
    onChange((t) => {
      const next = { ...t.critical, [key]: value };
      if (value === undefined) delete next[key];
      if (Object.keys(next).length > 0) return { ...t, critical: next };
      const { critical: _removed, ...rest } = t;
      return rest;
    });

  return (
    <div className="space-y-1.5">
      <SubHeading
        title="Krytyki"
        hint="Sprawdzane na samym rzucie kości. Krytyczny sukces zawsze się udaje, krytyczna porażka zawsze zawodzi. Puste pole wyłącza."
      />
      <div className="flex flex-wrap gap-2">
        <Labeled label={`Krytyczny sukces, gdy rzut ${lowIsGood ? "≤" : "≥"}`} className="w-44">
          <OptionalNumber value={critical[successKey]} onChange={(v) => set(successKey, v)} label="Próg krytycznego sukcesu" />
        </Labeled>
        <Labeled label={`Krytyczna porażka, gdy rzut ${lowIsGood ? "≥" : "≤"}`} className="w-44">
          <OptionalNumber value={critical[failureKey]} onChange={(v) => set(failureKey, v)} label="Próg krytycznej porażki" />
        </Labeled>
      </div>
    </div>
  );
}

function PoolSettings({ type, onChange }: SubEditorProps) {
  const pool = type.pool ?? { successAt: 5, required: 1 };
  const set = (patch: Partial<typeof pool>) =>
    onChange((t) => {
      const next = { ...(t.pool ?? pool), ...patch };
      if (next.explodeAt === undefined) delete next.explodeAt;
      return { ...t, pool: next };
    });

  return (
    <div className="space-y-1.5">
      <SubHeading title="Pula kości" />
      <div className="flex flex-wrap items-end gap-2">
        <Labeled label="Sukces od wyniku" className="w-32">
          <NumberInput className={cn(inputCls, "text-right")} value={pool.successAt} onChange={(successAt) => set({ successAt })} />
        </Labeled>
        <Labeled label="Wymagane sukcesy" className="w-32">
          <NumberInput className={cn(inputCls, "text-right")} value={pool.required} min={0} onChange={(required) => set({ required })} />
        </Labeled>
        <Labeled label="Dodatkowa kość od wyniku" className="w-44">
          <OptionalNumber value={pool.explodeAt} onChange={(explodeAt) => set({ explodeAt })} label="Próg dodatkowej kości" />
        </Labeled>
        <label className="flex h-8 items-center gap-1.5 text-sm">
          <input type="checkbox" checked={pool.onesCancel === true} onChange={(e) => set({ onesCancel: e.target.checked })} />
          Każda „1” kasuje jeden sukces
        </label>
      </div>
    </div>
  );
}

function BandsEditor({ type, onChange }: SubEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const bands = type.bands ?? [];
  const setBands = (fn: (prev: OutcomeBand[]) => OutcomeBand[]) => onChange((t) => ({ ...t, bands: fn(t.bands ?? []) }));
  const patch = (id: string, values: Partial<OutcomeBand>) =>
    setBands((prev) =>
      prev.map((band) => {
        if (band.id !== id) return band;
        const next = { ...band, ...values };
        if (next.atMost === undefined) delete next.atMost;
        return next;
      }),
    );

  return (
    <div className="space-y-1.5">
      <SubHeading
        title="Przedziały wyników"
        hint="Wynik trafia do pierwszego przedziału, którego górna granica jest od niego większa lub równa. Ostatni przedział zostaw bez granicy, by obejmował resztę."
      />
      <ul className="space-y-1">
        {bands.map((band, index) => (
          <li key={band.id} className="flex items-center gap-1.5">
            <input
              className={cn(inputCls, "flex-1")}
              value={band.label}
              onChange={(e) => patch(band.id, { label: e.target.value })}
              aria-label="Nazwa przedziału"
            />
            <span className="shrink-0 text-[length:--fs-meta] text-muted-foreground">do</span>
            <div className="w-24 shrink-0">
              <OptionalNumber
                value={band.atMost}
                onChange={(atMost) => patch(band.id, { atMost })}
                label={`Górna granica: ${band.label}`}
                placeholder="i więcej"
              />
            </div>
            <MoveButtons
              onMove={(direction) => setBands((prev) => move(prev, index, direction))}
              first={index === 0}
              last={index === bands.length - 1}
              label={band.label}
            />
            <button
              type="button"
              className={cn(iconBtn, "hover:text-destructive")}
              onClick={() => setBands((prev) => prev.filter((b) => b.id !== band.id))}
              aria-label={`Usuń przedział: ${band.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <AddRow
        placeholder="Nazwa nowego przedziału"
        value={newLabel}
        onValue={setNewLabel}
        onAdd={() => {
          const label = newLabel.trim();
          setBands((prev) => [...prev, { id: newId(), label }]);
          setNewLabel("");
        }}
      />
    </div>
  );
}

function SourcesEditor({ type, system, onChange }: SubEditorProps & { system: CampaignSystem }) {
  const setSources = (kind: CardKind, fn: (prev: LabelledRef[]) => LabelledRef[]) =>
    onChange((t) => {
      const sources = { ...emptyTestSources(), ...t.sources };
      return { ...t, sources: { ...sources, [kind]: fn(sources[kind]) } };
    });

  return (
    <div className="space-y-1.5">
      <SubHeading title="Z czego można rzucać" hint="Pola liczbowe kart, które ten test może wykorzystać jako wartość." />
      <div className="grid gap-3 md:grid-cols-3">
        {CARD_KINDS.map((kind) => (
          <SourceList
            key={kind}
            kind={kind}
            targets={numericTargets(system.cards[kind])}
            entries={type.sources?.[kind] ?? []}
            onChange={(fn) => setSources(kind, fn)}
          />
        ))}
      </div>
    </div>
  );
}

function SourceList({
  kind,
  targets,
  entries,
  onChange,
}: {
  kind: CardKind;
  targets: RefTarget[];
  entries: LabelledRef[];
  onChange: (fn: (prev: LabelledRef[]) => LabelledRef[]) => void;
}) {
  const known = new Set(targets.map((target) => refKey(target.ref)));
  const orphans = entries.filter((entry) => !known.has(refKey(entry.ref)));

  return (
    <div className="min-w-0 space-y-1 rounded-md border border-border/70 p-2">
      <span className="text-[length:--fs-meta] font-medium text-muted-foreground">{CARD_KIND_LABELS[kind]}</span>
      {targets.length === 0 && (
        <p className="text-[length:--fs-meta] text-muted-foreground">Karta nie ma pól liczbowych.</p>
      )}
      <ul className="space-y-1">
        {targets.map((target) => {
          const key = refKey(target.ref);
          const entry = entries.find((e) => refKey(e.ref) === key);
          return (
            <li key={key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={entry !== undefined}
                onChange={(e) =>
                  onChange((prev) =>
                    e.target.checked
                      ? [...prev, { ref: target.ref, label: target.label }]
                      : prev.filter((x) => refKey(x.ref) !== key),
                  )
                }
                aria-label={`Rzucaj z: ${target.label}`}
              />
              {entry ? (
                <input
                  className={cn(inputCls, "h-7 flex-1")}
                  value={entry.label}
                  placeholder={target.label}
                  title={target.label}
                  onChange={(e) =>
                    onChange((prev) => prev.map((x) => (refKey(x.ref) === key ? { ...x, label: e.target.value } : x)))
                  }
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      onChange((prev) => prev.map((x) => (refKey(x.ref) === key ? { ...x, label: target.label } : x)));
                    }
                  }}
                  aria-label={`Nazwa w teście: ${target.label}`}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{target.label}</span>
              )}
            </li>
          );
        })}
        {orphans.map((entry) => (
          <li key={refKey(entry.ref)} className="flex items-center gap-1.5 text-[length:--fs-meta] text-destructive">
            <span className="min-w-0 flex-1 truncate">„{entry.label}”: pole niedostępne (ukryte lub usunięte)</span>
            <button
              type="button"
              className={cn(iconBtn, "hover:text-destructive")}
              onClick={() => onChange((prev) => prev.filter((x) => refKey(x.ref) !== refKey(entry.ref)))}
              aria-label={`Usuń: ${entry.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
