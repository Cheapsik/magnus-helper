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
  Shield,
  Heart,
  MoreVertical,
} from "lucide-react";
import type { Combatant } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/number-input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";
import { CombatStatCell, NARROW_NUM } from "@/components/game/CombatStatCell";
import { getStatFullName, getStatGlossaryEntry } from "@/lib/gameStatGlossary";
import { cn } from "@/lib/utils";

const COMMON_STATUSES = [
  "Ogłuszony",
  "Powalony",
  "Krwawienie",
  "Zmęczony",
  "Przestraszony",
  "Oślepiony",
  "Oszołomiony",
  "Bezbronny",
  "Unieruchomiony",
  "Zatruty",
];

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
}: CombatantCardProps) {
  const d = isEditing && editDraft ? editDraft : c;
  const hpPercent = c.hp.max > 0 ? (c.hp.current / c.hp.max) * 100 : 0;

  return (
    <Card
      className={cn(
        "transition-all overflow-hidden",
        isActive && "ring-2 ring-primary shadow-md shadow-primary/10",
        isDead && "opacity-40",
      )}
    >
      <CardContent className="p-0">
        {isEditing ? (
          <div className="space-y-1.5 p-2.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-px">
                <label htmlFor={`edit-name-${d.id}`} className="block text-[10px] leading-tight text-muted-foreground">
                  Imię
                </label>
                <Input
                  id={`edit-name-${d.id}`}
                  value={d.name}
                  onChange={(e) => onEditDraftChange({ ...d, name: e.target.value })}
                  className="h-8 w-full text-sm"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant={!d.isEnemy ? "default" : "outline"}
                  className="h-8 text-xs px-2"
                  onClick={() => onEditDraftChange({ ...d, isEnemy: false })}
                >
                  Sojusznik
                </Button>
                <Button
                  size="sm"
                  variant={d.isEnemy ? "destructive" : "outline"}
                  className="h-8 text-xs px-2"
                  onClick={() => onEditDraftChange({ ...d, isEnemy: true })}
                >
                  Wróg
                </Button>
              </div>
            </div>
            <Separator className="my-0" />
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
              <CombatStatCell statKey="inic">
                <NumberInput value={d.initiative} onChange={(v) => onEditDraftChange({ ...d, initiative: v })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="ww">
                <NumberInput value={d.ww} onChange={(v) => onEditDraftChange({ ...d, ww: v })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="us">
                <NumberInput value={d.us} onChange={(v) => onEditDraftChange({ ...d, us: v })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="sb">
                <NumberInput value={d.sb} onChange={(v) => onEditDraftChange({ ...d, sb: v })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell label={`${getStatFullName("pż")} — bieżące`}>
                <NumberInput
                  value={d.hp.current}
                  onChange={(v) => onEditDraftChange({ ...d, hp: { ...d.hp, current: v } })}
                  className={NARROW_NUM}
                />
              </CombatStatCell>
              <CombatStatCell label={`${getStatFullName("pż")} — maksimum`} tooltip="Maksymalna liczba punktów żywotności.">
                <NumberInput value={d.hp.max} onChange={(v) => onEditDraftChange({ ...d, hp: { ...d.hp, max: v } })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="pnc">
                <NumberInput value={d.armor} onChange={(v) => onEditDraftChange({ ...d, armor: v })} className={NARROW_NUM} />
              </CombatStatCell>
              <CombatStatCell statKey="wtSoak">
                <NumberInput value={d.toughness} onChange={(v) => onEditDraftChange({ ...d, toughness: v })} className={NARROW_NUM} />
              </CombatStatCell>
            </div>
            <div className="space-y-px">
              <label htmlFor={`edit-notes-${d.id}`} className="block text-[10px] leading-tight text-muted-foreground">
                Notatki
              </label>
              <Textarea
                id={`edit-notes-${d.id}`}
                value={d.notes}
                onChange={(e) => onEditDraftChange({ ...d, notes: e.target.value })}
                rows={2}
                className="min-h-[40px] w-full text-xs"
              />
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-9 flex-1 gap-1 text-xs" onClick={onSaveEdit}>
                <Check className="h-3 w-3" />
                Zapisz
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={onCancelEdit}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2">
                {isActive && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary animate-pulse" />}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-base font-semibold leading-tight",
                    c.isEnemy ? "text-destructive" : "text-foreground",
                  )}
                >
                  {c.name}
                </span>
                <Button size="sm" variant="default" className="h-9 shrink-0 gap-1 px-3 text-xs" onClick={onAction}>
                  <Crosshair className="h-3.5 w-3.5" />
                  Akcja
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" title="Więcej opcji">
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

              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                <span className="text-muted-foreground">
                  <StatAbbrWithTooltip statKey="inic" className="text-muted-foreground">
                    Inic
                  </StatAbbrWithTooltip>{" "}
                  <span className="font-bold text-foreground">{c.initiative}</span>
                </span>
                <span className="text-muted-foreground">
                  <StatAbbrWithTooltip statKey="ww" className="text-muted-foreground">
                    WW
                  </StatAbbrWithTooltip>{" "}
                  <span className="font-bold text-foreground">{c.ww}</span>
                </span>
                <span className="text-muted-foreground">
                  <StatAbbrWithTooltip statKey="us" className="text-muted-foreground">
                    US
                  </StatAbbrWithTooltip>{" "}
                  <span className="font-bold text-foreground">{c.us}</span>
                </span>
                <span className="text-muted-foreground">
                  <StatAbbrWithTooltip statKey="sb" className="text-muted-foreground">
                    SB
                  </StatAbbrWithTooltip>{" "}
                  <span className="font-bold text-foreground">{c.sb}</span>
                </span>
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <StatAbbrWithTooltip statKey="pnc" className="flex items-center gap-0.5 text-muted-foreground">
                    <Shield className="h-2.5 w-2.5" />
                    <span className="font-bold text-foreground">{c.armor}</span>
                  </StatAbbrWithTooltip>
                </span>
                <span className="text-muted-foreground">
                  <StatAbbrWithTooltip statKey="wtSoak" className="text-muted-foreground">
                    {getStatGlossaryEntry("wtSoak").abbr}
                  </StatAbbrWithTooltip>{" "}
                  <span className="font-bold text-foreground">{c.toughness}</span>
                </span>
              </div>
            </div>

            <div className="px-3 pb-2">
              <div className="mx-auto flex max-w-md items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0"
                  onClick={() => onAdjustHp(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-primary" : "bg-destructive",
                      )}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-0.5 text-sm font-bold tabular-nums">
                  <Heart className="h-3.5 w-3.5 text-destructive" />
                  {c.hp.current}/{c.hp.max}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0"
                  onClick={() => onAdjustHp(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {c.statuses.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {c.statuses.map((s) => (
                    <Badge
                      key={s}
                      variant="destructive"
                      className="h-5 cursor-pointer gap-0.5 px-1.5 py-0 text-[9px]"
                      onClick={() => onToggleStatus(s)}
                    >
                      {s} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
              className="flex h-10 w-full items-center justify-center gap-1 border-t border-border/50 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="text-xs">Zwiń</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="text-xs">Więcej (HP, stany)</span>
                </>
              )}
            </button>

            {isExpanded && (
              <div className="space-y-2 border-t border-border/50 px-3 pb-3 pt-2">
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {[-5, -3, -1, 1, 3, 5].map((delta) => (
                    <Button
                      key={delta}
                      type="button"
                      size="sm"
                      variant={delta < 0 ? "destructive" : "secondary"}
                      className="h-11 text-sm font-semibold"
                      onClick={() => onAdjustHp(delta)}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </Button>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Stany</label>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onToggleStatus(s)}
                        className={cn(
                          "rounded border px-2 py-1 text-[10px] transition-colors",
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
                    <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">Notatki</label>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{c.notes}</p>
                  </div>
                )}

                <Button type="button" size="sm" className="h-10 w-full gap-1.5 text-xs" onClick={onAction}>
                  <Crosshair className="h-3.5 w-3.5" />
                  Rozwiąż akcję bojową
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
