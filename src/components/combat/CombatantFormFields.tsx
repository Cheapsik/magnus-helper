import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Combatant } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";

export function emptyCombatant(partial?: Partial<Combatant>): Combatant {
  return {
    id: crypto.randomUUID(),
    name: "",
    initiative: 0,
    resource: { current: 10, max: 10 },
    stats: [],
    statuses: [],
    notes: "",
    isEnemy: true,
    ...partial,
  };
}

export function formatCombatantSummary(c: Combatant): string {
  return [
    `Inicjatywa ${c.initiative}`,
    `${c.resourceLabel ?? "Zasób"} ${c.resource.current}/${c.resource.max}`,
    ...c.stats.map((stat) => `${stat.label} ${stat.value}`),
  ].join(" · ");
}

const NUM = "h-8 w-20";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-px">
      <label htmlFor={id} className="block text-[10px] leading-tight text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * A fight participant typed in by hand, or edited mid-fight. Only what the
 * tracker itself keeps: order, main resource, extra values to show, notes.
 */
export function CombatantFormFields({
  combatant: d,
  onChange,
  idPrefix = "c",
}: {
  combatant: Combatant;
  onChange: (c: Combatant) => void;
  idPrefix?: string;
}) {
  const base = `${idPrefix}-${useId()}`;
  const setStat = (index: number, patch: Partial<Combatant["stats"][number]>) =>
    onChange({ ...d, stats: d.stats.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)) });

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field id={`${base}-name`} label="Nazwa">
            <Input id={`${base}-name`} value={d.name} onChange={(e) => onChange({ ...d, name: e.target.value })} className="h-8 text-sm" />
          </Field>
        </div>
        <div className="flex shrink-0 items-center gap-1" role="radiogroup" aria-label="Strona">
          <Button
            type="button"
            size="sm"
            variant={!d.isEnemy ? "default" : "outline"}
            className="h-8 px-2 text-xs"
            role="radio"
            aria-checked={!d.isEnemy}
            onClick={() => onChange({ ...d, isEnemy: false })}
          >
            Sojusznik
          </Button>
          <Button
            type="button"
            size="sm"
            variant={d.isEnemy ? "destructive" : "outline"}
            className="h-8 px-2 text-xs"
            role="radio"
            aria-checked={d.isEnemy}
            onClick={() => onChange({ ...d, isEnemy: true })}
          >
            Wróg
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field id={`${base}-init`} label="Inicjatywa">
          <NumberInput id={`${base}-init`} value={d.initiative} onChange={(v) => onChange({ ...d, initiative: v })} className={NUM} />
        </Field>
        <Field id={`${base}-res-label`} label="Zasób główny">
          <Input
            id={`${base}-res-label`}
            value={d.resourceLabel ?? ""}
            placeholder="np. Zdrowie"
            onChange={(e) => onChange({ ...d, resourceLabel: e.target.value || undefined })}
            className="h-8 w-28 text-sm"
          />
        </Field>
        <Field id={`${base}-res-cur`} label="Aktualnie">
          <NumberInput
            id={`${base}-res-cur`}
            value={d.resource.current}
            onChange={(v) => onChange({ ...d, resource: { ...d.resource, current: v } })}
            className={NUM}
          />
        </Field>
        <Field id={`${base}-res-max`} label="Maksimum">
          <NumberInput
            id={`${base}-res-max`}
            value={d.resource.max}
            onChange={(v) => onChange({ ...d, resource: { ...d.resource, max: v } })}
            className={NUM}
          />
        </Field>
      </div>

      <div className="space-y-1">
        <span className="block text-[10px] leading-tight text-muted-foreground">Inne wartości widoczne w trackerze</span>
        {d.stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={stat.label}
              onChange={(e) => setStat(index, { label: e.target.value })}
              placeholder="Nazwa"
              className="h-8 flex-1 text-sm"
              aria-label="Nazwa wartości"
            />
            <NumberInput value={stat.value} onChange={(v) => setStat(index, { value: v })} className={NUM} aria-label="Wartość" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onChange({ ...d, stats: d.stats.filter((_, i) => i !== index) })}
              aria-label="Usuń wartość"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => onChange({ ...d, stats: [...d.stats, { label: "", value: 0 }] })}
        >
          <Plus className="h-3.5 w-3.5" /> Dodaj wartość
        </Button>
      </div>

      <Field id={`${base}-notes`} label="Notatki">
        <Textarea
          id={`${base}-notes`}
          value={d.notes}
          onChange={(e) => onChange({ ...d, notes: e.target.value })}
          rows={2}
          className="min-h-[40px] text-xs"
        />
      </Field>
    </div>
  );
}

export function CombatantStatLine({ c }: { c: Combatant }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      <span>
        Inicjatywa <span className="font-bold text-foreground">{c.initiative}</span>
      </span>
      <span>
        {c.resourceLabel ?? "Zasób"}{" "}
        <span className="font-bold text-foreground">
          {c.resource.current}/{c.resource.max}
        </span>
      </span>
      {c.stats.map((stat) => (
        <span key={stat.label}>
          {stat.label} <span className="font-bold text-foreground">{stat.value}</span>
        </span>
      ))}
    </div>
  );
}
