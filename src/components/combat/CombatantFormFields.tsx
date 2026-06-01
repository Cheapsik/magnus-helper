import { useId } from "react";
import type { Combatant } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NumberInput } from "@/components/ui/number-input";
import { CombatStatCell, NARROW_NUM } from "@/components/game/CombatStatCell";
import { getStatFullName } from "@/lib/gameStatGlossary";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import { Shield } from "lucide-react";
import { getStatGlossaryEntry } from "@/lib/gameStatGlossary";

export function emptyCombatant(partial?: Partial<Combatant>): Combatant {
  return {
    id: crypto.randomUUID(),
    name: "",
    initiative: 30,
    ww: 30,
    us: 25,
    sb: 3,
    hp: { current: 10, max: 10 },
    armor: 0,
    toughness: 3,
    statuses: [],
    notes: "",
    isEnemy: true,
    ...partial,
  };
}

export function formatCombatantSummary(c: Combatant): string {
  const parts = [
    `Inic ${c.initiative}`,
    `WW ${c.ww}`,
    `US ${c.us}`,
    `SB ${c.sb}`,
    `PŻ ${c.hp.current}/${c.hp.max}`,
    `Pnc ${c.armor}`,
    `${getStatGlossaryEntry("wtSoak").abbr} ${c.toughness}`,
  ];
  return parts.join(" · ");
}

interface CombatantFormFieldsProps {
  combatant: Combatant;
  onChange: (c: Combatant) => void;
  idPrefix?: string;
}

export function CombatantFormFields({ combatant: d, onChange, idPrefix = "c" }: CombatantFormFieldsProps) {
  const uid = useId();
  const base = `${idPrefix}-${uid}`;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-px">
          <label htmlFor={`${base}-name`} className="block text-[10px] leading-tight text-muted-foreground">
            Imię<span className="text-destructive"> *</span>
          </label>
          <Input
            id={`${base}-name`}
            value={d.name}
            onChange={(e) => onChange({ ...d, name: e.target.value })}
            className="h-8 w-full text-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={!d.isEnemy ? "default" : "outline"}
            className="h-8 text-xs px-2"
            onClick={() => onChange({ ...d, isEnemy: false })}
          >
            Sojusznik
          </Button>
          <Button
            type="button"
            size="sm"
            variant={d.isEnemy ? "destructive" : "outline"}
            className="h-8 text-xs px-2"
            onClick={() => onChange({ ...d, isEnemy: true })}
          >
            Wróg
          </Button>
        </div>
      </div>

      <Separator className="my-0" />

      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
        <CombatStatCell statKey="inic">
          <NumberInput value={d.initiative} onChange={(v) => onChange({ ...d, initiative: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="ww">
          <NumberInput value={d.ww} onChange={(v) => onChange({ ...d, ww: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="us">
          <NumberInput value={d.us} onChange={(v) => onChange({ ...d, us: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="sb">
          <NumberInput value={d.sb} onChange={(v) => onChange({ ...d, sb: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell label={`${getStatFullName("pż")} — bieżące`}>
          <NumberInput
            value={d.hp.current}
            onChange={(v) => onChange({ ...d, hp: { ...d.hp, current: v } })}
            className={NARROW_NUM}
          />
        </CombatStatCell>
        <CombatStatCell label={`${getStatFullName("pż")} — maksimum`} tooltip="Maksymalna liczba punktów żywotności.">
          <NumberInput value={d.hp.max} onChange={(v) => onChange({ ...d, hp: { ...d.hp, max: v } })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="pnc">
          <NumberInput value={d.armor} onChange={(v) => onChange({ ...d, armor: v })} className={NARROW_NUM} />
        </CombatStatCell>
        <CombatStatCell statKey="wtSoak">
          <NumberInput value={d.toughness} onChange={(v) => onChange({ ...d, toughness: v })} className={NARROW_NUM} />
        </CombatStatCell>
      </div>

      <div className="space-y-px">
        <label htmlFor={`${base}-notes`} className="block text-[10px] leading-tight text-muted-foreground">
          Broń, opis, notatki
        </label>
        <Textarea
          id={`${base}-notes`}
          value={d.notes}
          onChange={(e) => onChange({ ...d, notes: e.target.value })}
          rows={2}
          className="min-h-[52px] w-full text-xs"
          placeholder="Np. tasak (SB+2), zdolności specjalne…"
        />
      </div>
    </div>
  );
}

export function CombatantStatLine({ c }: { c: Combatant }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      <span>
        <StatAbbrWithTooltip statKey="inic" className="text-muted-foreground">
          Inic
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">{c.initiative}</span>
      </span>
      <span>
        <StatAbbrWithTooltip statKey="ww" className="text-muted-foreground">
          WW
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">{c.ww}</span>
      </span>
      <span>
        <StatAbbrWithTooltip statKey="us" className="text-muted-foreground">
          US
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">{c.us}</span>
      </span>
      <span>
        <StatAbbrWithTooltip statKey="sb" className="text-muted-foreground">
          SB
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">{c.sb}</span>
      </span>
      <span>
        <StatAbbrWithTooltip statKey="pż" className="text-muted-foreground">
          PŻ
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">
          {c.hp.current}/{c.hp.max}
        </span>
      </span>
      <span className="flex items-center gap-0.5">
        <StatAbbrWithTooltip statKey="pnc" className="flex items-center gap-0.5 text-muted-foreground">
          <Shield className="h-2.5 w-2.5" />
          <span className="font-bold text-foreground">{c.armor}</span>
        </StatAbbrWithTooltip>
      </span>
      <span>
        <StatAbbrWithTooltip statKey="wtSoak" className="text-muted-foreground">
          {getStatGlossaryEntry("wtSoak").abbr}
        </StatAbbrWithTooltip>{" "}
        <span className="font-bold text-foreground">{c.toughness}</span>
      </span>
    </div>
  );
}
