import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CardKind, type FieldRef, CARD_KINDS, CARD_KIND_LABELS, newId } from "@/lib/cardSchema";
import {
  type AttackType,
  type CampaignSystem,
  type DefenseType,
  type HitLocation,
  type HitLocationTable,
  HIT_RESOLUTION_LABELS,
  type HitResolution,
} from "@/lib/campaignSystem";
import { isDiceNotation } from "@/lib/diceNotation";
import { numericRefTargets } from "@/lib/structureOps";
import { useCampaignSystem } from "@/lib/cardStore";
import { NumberInput } from "@/components/ui/number-input";
import { AddRow } from "@/components/system/FieldEditor";
import { Labeled, MoveButtons, RefSelect, iconBtn, inputCls } from "@/components/system/controls";

const TIE_LABELS: Record<Extract<HitResolution, { kind: "opposed" }>["tie"], string> = {
  defender: "Remis wygrywa broniący",
  attacker: "Remis wygrywa atakujący",
  reroll: "Remis: rzut ponownie",
};

const DAMAGE_LABELS: Record<AttackType["damage"]["source"], string> = {
  weapon: "Kości z karty atakującego",
  fixed: "Stała wartość",
  manual: "Wpisywane ręcznie",
};

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function newAttackType(name: string, system: CampaignSystem): AttackType {
  return {
    id: newId(),
    name,
    testTypeId: system.testTypes[0]?.id,
    hit: { kind: "self" },
    damage: { source: "manual" },
    reduction: { enabled: false, minimum: 0 },
    useHitLocations: false,
  };
}

function withHitKind(attack: AttackType, kind: HitResolution["kind"], system: CampaignSystem): AttackType {
  const hit: HitResolution =
    kind === "vsDefense"
      ? { kind, defenseId: system.defenseTypes[0]?.id ?? "" }
      : kind === "opposed"
        ? { kind, tie: "defender" }
        : { kind };
  return { ...attack, hit };
}

function SubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {hint && <p className="text-[length:--fs-meta] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Attack types, defense types and the hit-location table of the campaign (docs/adr/0006). */
export function CombatSettingsEditor() {
  const [system, setSystem] = useCampaignSystem();
  return (
    <div className="space-y-8">
      <AttackTypes system={system} setSystem={setSystem} />
      <DefenseTypes system={system} setSystem={setSystem} />
      <HitLocations system={system} setSystem={setSystem} />
    </div>
  );
}

type Setter = (fn: (prev: CampaignSystem) => CampaignSystem) => void;
type SectionProps = { system: CampaignSystem; setSystem: Setter };

function AttackTypes({ system, setSystem }: SectionProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const attacks = system.attackTypes;

  const setAttacks = (fn: (prev: AttackType[]) => AttackType[]) =>
    setSystem((prev) => ({ ...prev, attackTypes: fn(prev.attackTypes) }));
  const update = (id: string, fn: (attack: AttackType) => AttackType) =>
    setAttacks((prev) => prev.map((attack) => (attack.id === id ? fn(attack) : attack)));

  const add = () => {
    const created = newAttackType(newName.trim(), system);
    setAttacks((prev) => [...prev, created]);
    setOpen(created.id);
    setNewName("");
  };

  return (
    <section className="space-y-3">
      <SubHeading
        title="Rodzaje ataku"
        hint="Rodzaj ataku mówi trackerowi walki, jak rozstrzygnąć trafienie, policzyć obrażenia i odjąć redukcję. Każdy krok możesz zostawić ręczny."
      />
      {attacks.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Kampania nie ma jeszcze rodzajów ataku. Dodaj pierwszy, np. „Atak wręcz” albo „Zaklęcie”.
        </p>
      )}
      {attacks.map((attack, index) => (
        <AttackSection
          key={attack.id}
          attack={attack}
          system={system}
          expanded={open === attack.id}
          onToggle={() => setOpen((current) => (current === attack.id ? null : attack.id))}
          first={index === 0}
          last={index === attacks.length - 1}
          onChange={(fn) => update(attack.id, fn)}
          onMove={(direction) => setAttacks((prev) => move(prev, prev.findIndex((a) => a.id === attack.id), direction))}
          onDuplicate={() => {
            const copy = { ...structuredClone(attack), id: newId(), name: `${attack.name} (kopia)` };
            setAttacks((prev) => {
              const at = prev.findIndex((a) => a.id === attack.id);
              return [...prev.slice(0, at + 1), copy, ...prev.slice(at + 1)];
            });
            setOpen(copy.id);
          }}
          onDelete={() => setAttacks((prev) => prev.filter((a) => a.id !== attack.id))}
        />
      ))}
      <AddRow placeholder="Nazwa nowego rodzaju ataku" value={newName} onValue={setNewName} onAdd={add} />
    </section>
  );
}

function AttackSection({
  attack,
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
  attack: AttackType;
  system: CampaignSystem;
  expanded: boolean;
  onToggle: () => void;
  first: boolean;
  last: boolean;
  onChange: (fn: (attack: AttackType) => AttackType) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { hit, damage } = attack;
  const hasTable = system.hitLocations !== null;

  return (
    <section className="rounded-md border border-border">
      <header className="flex items-center gap-1.5 border-b border-border bg-white/[0.03] px-2 py-1.5">
        <button
          type="button"
          className={iconBtn}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Zwiń: ${attack.name}` : `Rozwiń: ${attack.name}`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <input
          className={cn(inputCls, "flex-1 border-transparent bg-transparent font-medium hover:border-input")}
          value={attack.name}
          onChange={(e) => onChange((a) => ({ ...a, name: e.target.value }))}
          aria-label="Nazwa rodzaju ataku"
        />
        <span className="hidden shrink-0 text-[length:--fs-meta] text-muted-foreground sm:inline">
          {HIT_RESOLUTION_LABELS[hit.kind]}
        </span>
        <MoveButtons onMove={onMove} first={first} last={last} label={attack.name} />
        <button type="button" className={iconBtn} onClick={onDuplicate} aria-label={`Duplikuj: ${attack.name}`}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={cn(iconBtn, "hover:text-destructive")} onClick={onDelete} aria-label={`Usuń: ${attack.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {expanded && (
        <div className="space-y-4 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Labeled label="Rodzaj testu atakującego" className="w-64">
              <select
                className={inputCls}
                value={attack.testTypeId ?? ""}
                onChange={(e) =>
                  onChange((a) => {
                    const { testTypeId: _removed, ...rest } = a;
                    return e.target.value ? { ...rest, testTypeId: e.target.value } : rest;
                  })
                }
              >
                <option value="">Rzut wpisywany ręcznie</option>
                {system.testTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.trim() || "Bez nazwy"}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Rozstrzygnięcie trafienia" className="w-64">
              <select
                className={inputCls}
                value={hit.kind}
                onChange={(e) => onChange((a) => withHitKind(a, e.target.value as HitResolution["kind"], system))}
              >
                {(Object.keys(HIT_RESOLUTION_LABELS) as HitResolution["kind"][]).map((kind) => (
                  <option key={kind} value={kind}>
                    {HIT_RESOLUTION_LABELS[kind]}
                  </option>
                ))}
              </select>
            </Labeled>
            {hit.kind === "vsDefense" && (
              <Labeled label="Obrona celu" className="w-48">
                <select
                  className={inputCls}
                  value={hit.defenseId}
                  onChange={(e) => onChange((a) => ({ ...a, hit: { kind: "vsDefense", defenseId: e.target.value } }))}
                >
                  <option value="">Wybierz obronę</option>
                  {system.defenseTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name.trim() || "Bez nazwy"}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {hit.kind === "opposed" && (
              <Labeled label="Remis" className="w-64">
                <select
                  className={inputCls}
                  value={hit.tie}
                  onChange={(e) => onChange((a) => ({ ...a, hit: { kind: "opposed", tie: e.target.value as typeof hit.tie } }))}
                >
                  {(Object.keys(TIE_LABELS) as (keyof typeof TIE_LABELS)[]).map((tie) => (
                    <option key={tie} value={tie}>
                      {TIE_LABELS[tie]}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
          </div>
          <p className="text-[length:--fs-meta] text-muted-foreground">
            {hit.kind === "self" && "Trafienie, gdy test atakującego się powiedzie."}
            {hit.kind === "vsDefense" &&
              "Pole obrony celu (ustawiasz je na karcie, w powiązaniach z narzędziami) zastępuje wartość poziomu trudności."}
            {hit.kind === "opposed" && "Broniący wykonuje ten sam test. Atakujący musi odnieść sukces i mieć wyższy wynik."}
            {hit.kind === "manual" && "Magnus Helper pokaże rzut, a trafienie oceniasz Ty."}
          </p>

          <div className="space-y-2">
            <SubHeading title="Obrażenia" />
            <div className="flex flex-wrap items-end gap-2">
              <Labeled label="Źródło obrażeń" className="w-64">
                <select
                  className={inputCls}
                  value={damage.source}
                  onChange={(e) => onChange((a) => ({ ...a, damage: { ...a.damage, source: e.target.value as AttackType["damage"]["source"] } }))}
                >
                  {(Object.keys(DAMAGE_LABELS) as AttackType["damage"]["source"][]).map((source) => (
                    <option key={source} value={source}>
                      {DAMAGE_LABELS[source]}
                    </option>
                  ))}
                </select>
              </Labeled>
              {damage.source === "fixed" && (
                <Labeled label="Wartość" className="w-24">
                  <NumberInput
                    value={damage.fixed ?? 0}
                    onChange={(fixed) => onChange((a) => ({ ...a, damage: { ...a.damage, fixed } }))}
                    className="h-8 text-center"
                  />
                </Labeled>
              )}
              <label className="flex items-center gap-1.5 pb-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={damage.addMargin ?? false}
                  onChange={(e) => onChange((a) => ({ ...a, damage: { ...a.damage, addMargin: e.target.checked } }))}
                />
                Dodaj margines udanego ataku
              </label>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {CARD_KINDS.map((kind) => (
                <Labeled key={kind} label={`Dodaj pole atakującego (${CARD_KIND_LABELS[kind].toLowerCase()})`}>
                  <RefSelect
                    targets={numericRefTargets(system.cards[kind])}
                    value={damage.addField?.[kind]}
                    onChange={(ref) => onChange((a) => withAddField(a, kind, ref))}
                    label={`Dodaj pole atakującego: ${CARD_KIND_LABELS[kind]}`}
                    emptyLabel="Nic"
                  />
                </Labeled>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={attack.reduction.enabled}
                onChange={(e) => onChange((a) => ({ ...a, reduction: { ...a.reduction, enabled: e.target.checked } }))}
              />
              Odejmuj redukcję obrażeń celu
            </label>
            {attack.reduction.enabled && (
              <Labeled label="Minimum po redukcji" className="w-32">
                <select
                  className={inputCls}
                  value={attack.reduction.minimum}
                  onChange={(e) => onChange((a) => ({ ...a, reduction: { ...a.reduction, minimum: e.target.value === "1" ? 1 : 0 } }))}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </select>
              </Labeled>
            )}
            <label className={cn("flex items-center gap-1.5 text-sm", !hasTable && "opacity-50")}>
              <input
                type="checkbox"
                disabled={!hasTable}
                checked={attack.useHitLocations && hasTable}
                onChange={(e) => onChange((a) => ({ ...a, useHitLocations: e.target.checked }))}
              />
              Losuj lokację trafienia{!hasTable && " (włącz tabelę lokacji poniżej)"}
            </label>
          </div>
        </div>
      )}
    </section>
  );
}

function withAddField(attack: AttackType, kind: CardKind, ref: FieldRef | undefined): AttackType {
  const { [kind]: _removed, ...rest } = attack.damage.addField ?? {};
  return { ...attack, damage: { ...attack.damage, addField: ref ? { ...rest, [kind]: ref } : rest } };
}

function DefenseTypes({ system, setSystem }: SectionProps) {
  const [newName, setNewName] = useState("");
  const defenses = system.defenseTypes;

  const setDefenses = (fn: (prev: DefenseType[]) => DefenseType[]) =>
    setSystem((prev) => ({ ...prev, defenseTypes: fn(prev.defenseTypes) }));

  const remove = (id: string) =>
    setSystem((prev) => ({
      ...prev,
      defenseTypes: prev.defenseTypes.filter((d) => d.id !== id),
      // An attack aimed at this defense falls back to the GM calling the hit.
      attackTypes: prev.attackTypes.map((a) => (a.hit.kind === "vsDefense" && a.hit.defenseId === id ? { ...a, hit: { kind: "manual" } } : a)),
      cards: Object.fromEntries(
        CARD_KINDS.map((kind) => {
          const { [id]: _removed, ...defenses } = prev.cards[kind].roles.defenses;
          return [kind, { ...prev.cards[kind], roles: { ...prev.cards[kind].roles, defenses } }];
        }),
      ) as CampaignSystem["cards"],
    }));

  return (
    <section className="max-w-xl space-y-3">
      <SubHeading
        title="Typy obrony"
        hint="Nazwane wartości, które cel stawia atakowi (np. „Klasa pancerza”, „Unik”). Pole z wartością przypisujesz na karcie, w Ustawienia → Karty."
      />
      {defenses.length > 0 && (
        <ul className="space-y-1">
          {defenses.map((defense, index) => (
            <li key={defense.id} className="flex items-center gap-1.5 rounded-md border border-border/70 px-2 py-1">
              <input
                className={cn(inputCls, "flex-1 border-transparent bg-transparent hover:border-input")}
                value={defense.name}
                onChange={(e) => setDefenses((prev) => prev.map((d) => (d.id === defense.id ? { ...d, name: e.target.value } : d)))}
                aria-label="Nazwa typu obrony"
              />
              <MoveButtons
                onMove={(direction) => setDefenses((prev) => move(prev, index, direction))}
                first={index === 0}
                last={index === defenses.length - 1}
                label={defense.name}
              />
              <button type="button" className={cn(iconBtn, "hover:text-destructive")} onClick={() => remove(defense.id)} aria-label={`Usuń: ${defense.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow
        placeholder="Nazwa nowego typu obrony"
        value={newName}
        onValue={setNewName}
        onAdd={() => {
          setDefenses((prev) => [...prev, { id: newId(), name: newName.trim() }]);
          setNewName("");
        }}
      />
    </section>
  );
}

const EMPTY_TABLE: HitLocationTable = { dice: "1k100", reverseAttackRoll: false, locations: [] };

function HitLocations({ system, setSystem }: SectionProps) {
  const [newName, setNewName] = useState("");
  const table = system.hitLocations;

  const setTable = (fn: (prev: HitLocationTable) => HitLocationTable) =>
    setSystem((prev) => ({ ...prev, hitLocations: prev.hitLocations ? fn(prev.hitLocations) : prev.hitLocations }));

  const heading = (
    <SubHeading
      title="Lokacje trafień"
      hint="Opcjonalna tabela: rzut wskazuje trafioną część celu, a każda lokacja może mieć własną redukcję obrażeń (przypisaną na karcie)."
    />
  );

  if (!table) {
    return (
      <section className="space-y-2">
        {heading}
        <button
          type="button"
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-white/[0.06]"
          onClick={() => setSystem((prev) => ({ ...prev, hitLocations: structuredClone(EMPTY_TABLE) }))}
        >
          Włącz lokacje trafień
        </button>
      </section>
    );
  }

  const removeLocation = (id: string) =>
    setSystem((prev) => ({
      ...prev,
      hitLocations: prev.hitLocations && {
        ...prev.hitLocations,
        locations: prev.hitLocations.locations.filter((l) => l.id !== id),
      },
      cards: Object.fromEntries(
        CARD_KINDS.map((kind) => {
          const { [id]: _removed, ...locationReduction } = prev.cards[kind].roles.locationReduction;
          return [kind, { ...prev.cards[kind], roles: { ...prev.cards[kind].roles, locationReduction } }];
        }),
      ) as CampaignSystem["cards"],
    }));

  const issue = isDiceNotation(table.dice) ? null : `Niepoprawna notacja kości: „${table.dice}”`;
  const nextBound = Math.max(0, ...table.locations.map((l) => l.atMost)) + 10;

  return (
    <section className="max-w-2xl space-y-3">
      {heading}
      <div className="flex flex-wrap items-end gap-3">
        <Labeled label="Kość lokacji" className="w-32">
          <input
            className={cn(inputCls, issue && "border-destructive")}
            value={table.dice}
            onChange={(e) => setTable((t) => ({ ...t, dice: e.target.value }))}
            aria-invalid={issue !== null}
          />
        </Labeled>
        <label className="flex items-center gap-1.5 pb-1.5 text-sm">
          <input
            type="checkbox"
            checked={table.reverseAttackRoll}
            onChange={(e) => setTable((t) => ({ ...t, reverseAttackRoll: e.target.checked }))}
          />
          Odwróć cyfry rzutu ataku (tylko k100)
        </label>
        <button
          type="button"
          className="ml-auto pb-1.5 text-[length:--fs-meta] text-muted-foreground hover:text-destructive"
          onClick={() => setSystem((prev) => ({ ...prev, hitLocations: null }))}
        >
          Wyłącz lokacje trafień
        </button>
      </div>
      {issue && <p className="text-[length:--fs-meta] text-destructive">{issue}</p>}

      <ul className="space-y-1">
        {table.locations.map((location: HitLocation) => (
          <li key={location.id} className="flex items-center gap-1.5 rounded-md border border-border/70 px-2 py-1">
            <input
              className={cn(inputCls, "flex-1 border-transparent bg-transparent hover:border-input")}
              value={location.name}
              onChange={(e) =>
                setTable((t) => ({ ...t, locations: t.locations.map((l) => (l.id === location.id ? { ...l, name: e.target.value } : l)) }))
              }
              aria-label="Nazwa lokacji"
            />
            <span className="shrink-0 text-[length:--fs-meta] text-muted-foreground">do rzutu</span>
            <NumberInput
              value={location.atMost}
              onChange={(atMost) =>
                setTable((t) => ({ ...t, locations: t.locations.map((l) => (l.id === location.id ? { ...l, atMost } : l)) }))
              }
              className="h-8 w-20 text-center"
              aria-label={`Do rzutu: ${location.name}`}
            />
            <button type="button" className={cn(iconBtn, "hover:text-destructive")} onClick={() => removeLocation(location.id)} aria-label={`Usuń: ${location.name}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <AddRow
        placeholder="Nazwa nowej lokacji"
        value={newName}
        onValue={setNewName}
        onAdd={() => {
          setTable((t) => ({ ...t, locations: [...t.locations, { id: newId(), name: newName.trim(), atMost: nextBound }] }));
          setNewName("");
        }}
      />
    </section>
  );
}
