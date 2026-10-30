import { type ReactNode, useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldRef, RandomRule } from "@/lib/cardSchema";
import { type RefTarget, refFromKey, refKey } from "@/lib/structureOps";

export const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export const inputCls =
  "field field-sm w-full";

export function MoveButtons({
  onMove,
  first,
  last,
  label,
}: {
  onMove: (direction: -1 | 1) => void;
  first: boolean;
  last: boolean;
  label: string;
}) {
  return (
    <>
      <button type="button" className={iconBtn} disabled={first} onClick={() => onMove(-1)} aria-label={`Przesuń wyżej: ${label}`}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={iconBtn} disabled={last} onClick={() => onMove(1)} aria-label={`Przesuń niżej: ${label}`}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

export function Labeled({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[length:--fs-meta] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Picks one value on the card a role can point at, or none. */
export function RefSelect({
  targets,
  value,
  onChange,
  label,
  emptyLabel = "Brak",
}: {
  targets: RefTarget[];
  value: FieldRef | undefined;
  onChange: (next: FieldRef | undefined) => void;
  label: string;
  emptyLabel?: string;
}) {
  const current = refKey(value);
  const known = targets.some((target) => refKey(target.ref) === current);
  return (
    <select className={inputCls} value={current} onChange={(e) => onChange(refFromKey(e.target.value))} aria-label={label}>
      <option value="">{emptyLabel}</option>
      {value && !known && <option value={current}>Pole niedostępne (ukryte lub usunięte)</option>}
      {targets.map((target) => (
        <option key={refKey(target.ref)} value={refKey(target.ref)}>
          {target.label}
        </option>
      ))}
    </select>
  );
}

/** The generator's rule for a field or column: nothing, a number range, or a list to pick from. */
export function RandomRuleEditor({
  value,
  onChange,
  allowList = true,
}: {
  value: RandomRule | undefined;
  onChange: (next: RandomRule | undefined) => void;
  allowList?: boolean;
}) {
  const kind = value?.kind ?? "none";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Labeled label="Losowanie" className="w-40">
        <select
          className={inputCls}
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "range") onChange({ kind: "range", min: 1, max: 6 });
            else if (next === "list") onChange({ kind: "list", values: [] });
            else if (next === "dice") onChange({ kind: "dice", notation: "4k6", dropLowest: 1 });
            else onChange(undefined);
          }}
        >
          <option value="none">Bez losowania</option>
          <option value="range">Zakres liczb</option>
          <option value="dice">Rzut kośćmi</option>
          {allowList && <option value="list">Lista wartości</option>}
        </select>
      </Labeled>
      {value?.kind === "range" && (
        <>
          <Labeled label="Od" className="w-20">
            <input
              type="number"
              className={inputCls}
              value={value.min}
              onChange={(e) => onChange({ ...value, min: Number(e.target.value) || 0 })}
            />
          </Labeled>
          <Labeled label="Do" className="w-20">
            <input
              type="number"
              className={inputCls}
              value={value.max}
              onChange={(e) => onChange({ ...value, max: Number(e.target.value) || 0 })}
            />
          </Labeled>
        </>
      )}
      {value?.kind === "dice" && (
        <>
          <Labeled label="Notacja" className="w-28">
            <input
              className={inputCls}
              value={value.notation}
              placeholder="np. 4k6"
              onChange={(e) => onChange({ ...value, notation: e.target.value })}
            />
          </Labeled>
          <Labeled label="Odrzuć najniższe" className="w-28">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={value.dropLowest ?? 0}
              onChange={(e) => onChange({ ...value, dropLowest: Number(e.target.value) || 0 })}
            />
          </Labeled>
          <Labeled label="Odrzuć najwyższe" className="w-28">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={value.dropHighest ?? 0}
              onChange={(e) => onChange({ ...value, dropHighest: Number(e.target.value) || 0 })}
            />
          </Labeled>
        </>
      )}
      {value?.kind === "list" && (
        <Labeled label="Wartości (po przecinku)" className="min-w-[12rem] flex-1">
          <CommaListInput values={value.values} onChange={(values) => onChange({ kind: "list", values })} />
        </Labeled>
      )}
    </div>
  );
}

export function OptionsEditor({ options, onChange }: { options: string[]; onChange: (next: string[]) => void }) {
  return (
    <Labeled label="Opcje (po przecinku)" className="min-w-[12rem] flex-1">
      <CommaListInput values={options} onChange={onChange} />
    </Labeled>
  );
}

/** Edits a list as comma-separated text; commits on blur so typing a comma isn't swallowed. */
export function CommaListInput({ values, onChange }: { values: string[]; onChange: (next: string[]) => void }) {
  const joined = values.join(", ");
  const [draft, setDraft] = useState(joined);
  useEffect(() => setDraft(joined), [joined]);
  const commit = () => onChange(draft.split(",").map((item) => item.trim()).filter(Boolean));
  return (
    <input
      className={inputCls}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}
