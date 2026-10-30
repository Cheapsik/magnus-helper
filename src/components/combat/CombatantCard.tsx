import { useState } from "react";
import {
  Plus,
  Trash2,
  Minus,
  Crosshair,
  Edit2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from "lucide-react";
import type { Combatant } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CombatantFormFields } from "@/components/combat/CombatantFormFields";
import { cn } from "@/lib/utils";

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  isDead: boolean;
  editDraft: Combatant | null;
  onEditDraftChange: (draft: Combatant) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAction: () => void;
  onToggleExpand: () => void;
  onAdjustHp: (delta: number) => void;
  onToggleStatus: (status: string) => void;
  /** The campaign's conditions (CONTEXT.md: "Stan"). */
  conditionNames: string[];
}

export function CombatantCard({
  combatant: c,
  isActive,
  isEditing,
  isExpanded,
  isDead,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDuplicate,
  onRemove,
  onAction,
  onToggleExpand,
  onAdjustHp,
  onToggleStatus,
  conditionNames,
}: CombatantCardProps) {
  const d = isEditing && editDraft ? editDraft : c;
  const hpPercent = c.resource.max > 0 ? (c.resource.current / c.resource.max) * 100 : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        isActive && "live-marker border-destructive/40 bg-destructive/[0.04]",
        isDead && "opacity-40",
      )}
    >
      <CardContent className="p-0">
        {isEditing ? (
          <div className="space-y-2 p-2.5">
            {editDraft && <CombatantFormFields combatant={d} onChange={onEditDraftChange} idPrefix="edit" />}
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1" onClick={onSaveEdit}>
                <Check className="h-3 w-3" />
                Zapisz
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={onToggleExpand} className="w-full text-left px-3 pb-1.5 pt-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[length:--fs-section] font-semibold leading-tight",
                    c.isEnemy ? "text-destructive" : "text-foreground",
                  )}
                >
                  {c.name}
                </span>

                <span className="text-[length:--fs-meta] text-muted-foreground tabular-nums">
                  <span className="font-bold text-foreground">{c.initiative}</span>
                </span>

                {c.resource.max > 0 && (
                  <span className={cn(
                    "text-[length:--fs-meta] font-bold tabular-nums",
                    hpPercent > 50 ? "text-success" : hpPercent > 25 ? "text-primary" : "text-destructive",
                  )}>
                    {c.resource.current}/{c.resource.max}
                  </span>
                )}

                {c.statuses.length > 0 && (
                  <span className="text-[12px] text-destructive font-medium">{c.statuses.length} stan{c.statuses.length > 1 ? "y" : ""}</span>
                )}

                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-2 border-t border-border/50 px-3 pb-3 pt-2">
                <div className="flex items-center justify-end gap-1.5">
                  <Button size="sm" variant="default" className="shrink-0" onClick={onAction}>
                    <Crosshair className="h-3.5 w-3.5" />
                    Akcja
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="shrink-0" title="Więcej opcji">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={onStartEdit}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onDuplicate}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplikuj
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onRemove}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[length:--fs-meta]">
                  <span className="text-muted-foreground">
                    Inicjatywa <span className="font-bold text-foreground">{c.initiative}</span>
                  </span>
                  {c.stats.map((stat) => (
                    <span key={stat.label} className="text-muted-foreground">
                      {stat.label} <span className="font-bold text-foreground">{stat.value}</span>
                    </span>
                  ))}
                </div>

                <div className="flex max-w-lg items-center gap-2">
                  <Button type="button" size="icon" variant="secondary" className="shrink-0" onClick={() => onAdjustHp(-1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-primary" : "bg-destructive",
                        )}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className="flex shrink-0 items-baseline gap-1 text-sm font-bold tabular-nums">
                    {c.resourceLabel && <span className="text-[12px] font-normal text-muted-foreground">{c.resourceLabel}</span>}
                    {c.resource.current}/{c.resource.max}
                  </span>
                  <Button type="button" size="icon" variant="secondary" className="shrink-0" onClick={() => onAdjustHp(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <QuickAmount onApply={onAdjustHp} />

                {c.statuses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.statuses.map((s) => (
                      <Badge
                        key={s}
                        variant="destructive"
                        className="h-5 cursor-pointer gap-0.5 px-1.5 py-0 text-[12px]"
                        onClick={() => onToggleStatus(s)}
                      >
                        {s} ×
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Stany</label>
                  <div className="flex flex-wrap gap-1">
                    {conditionNames.length === 0 && (
                      <span className="text-[12px] text-muted-foreground">Kampania nie ma zdefiniowanych stanów.</span>
                    )}
                    {conditionNames.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onToggleStatus(s)}
                        className={cn(
                          "rounded border px-2 py-1 text-[12px] transition-colors",
                          c.statuses.includes(s)
                            ? "border-destructive/30 bg-destructive/20 text-destructive"
                            : "border-border text-muted-foreground hover:border-muted-foreground",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {c.notes && (
                  <div>
                    <label className="mb-0.5 block text-[12px] font-medium text-muted-foreground">Notatki</label>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{c.notes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Type the amount and press Enter to wound, or pick Leczenie to heal by it. */
function QuickAmount({ onApply }: { onApply: (delta: number) => void }) {
  const [value, setValue] = useState("");
  const apply = (sign: 1 | -1) => {
    const amount = Math.abs(Number.parseInt(value, 10));
    if (!Number.isFinite(amount) || amount === 0) return;
    onApply(sign * amount);
    setValue("");
  };
  return (
    <form
      className="flex max-w-lg items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        apply(-1);
      }}
    >
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Ile? Enter = rana"
        aria-label="Wartość rany lub leczenia"
        className="w-40"
      />
      <Button type="submit" size="sm" variant="destructive">Rana</Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => apply(1)}>Leczenie</Button>
    </form>
  );
}
