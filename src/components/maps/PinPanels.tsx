import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCards } from "@/lib/cardStore";
import { cardTitle } from "@/lib/cardSchema";
import { FACTIONS_KEY, type Faction } from "@/lib/factions";
import { PIN_COLORS, PIN_ICONS, type CampaignMap, type MapPin, type PinLink, type PinLinkKind } from "@/lib/maps";
import { PIN_ICON_COMPONENTS } from "@/components/maps/MapCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const LINK_KIND_LABEL: Record<PinLinkKind, string> = {
  hero: "Bohater",
  npc: "NPC",
  monster: "Potwór",
  quest: "Quest",
  faction: "Frakcja",
  map: "Mapa",
};

export type LinkTarget = PinLink & { name: string };

/** Everything a pin can link to, so links resolve to names and dangling ones can be hidden. */
export function useLinkTargets(maps: CampaignMap[]): LinkTarget[] {
  const [heroes] = useCards("hero");
  const [npcs] = useCards("npc");
  const [monsters] = useCards("monster");
  const [questState] = useLocalStorage<{ quests?: { id: string; title: string }[] }>("rpg_quests", {});
  const [factions] = useLocalStorage<Faction[]>(FACTIONS_KEY, []);
  return useMemo(
    () => [
      ...heroes.map((c) => ({ kind: "hero" as const, id: c.id, name: cardTitle(c) })),
      ...npcs.map((c) => ({ kind: "npc" as const, id: c.id, name: cardTitle(c) })),
      ...monsters.map((c) => ({ kind: "monster" as const, id: c.id, name: cardTitle(c) })),
      ...(questState.quests ?? []).map((q) => ({ kind: "quest" as const, id: q.id, name: q.title || "Bez tytułu" })),
      ...factions.map((f) => ({ kind: "faction" as const, id: f.id, name: f.name })),
      ...maps.map((m) => ({ kind: "map" as const, id: m.id, name: m.name })),
    ],
    [heroes, npcs, monsters, questState, factions, maps],
  );
}

export const linkKey = (l: PinLink) => `${l.kind}:${l.id}`;

interface PinPopoverProps {
  pin: MapPin;
  targets: Map<string, LinkTarget>;
  onOpenLink: (link: LinkTarget) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function PinPopover({ pin, targets, onOpenLink, onEdit, onDelete, onClose }: PinPopoverProps) {
  const links = pin.links.map((l) => targets.get(linkKey(l))).filter((l): l is LinkTarget => !!l);
  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pin.color }} />
          <div className="flex-1 text-sm font-semibold break-words">{pin.label}</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Zamknij"><X className="h-4 w-4" /></button>
        </div>
        {pin.note && <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">{pin.note}</p>}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {links.map((l) => (
              <button
                key={linkKey(l)}
                type="button"
                onClick={() => onOpenLink(l)}
                className="rounded border bg-muted px-1.5 py-0.5 text-[11px] hover:bg-accent"
              >
                <span className="text-muted-foreground">{LINK_KIND_LABEL[l.kind]}:</span> {l.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edytuj</Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" />Usuń</Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PinEditorDialogProps {
  pin: MapPin | null;
  mapId: string;
  targets: LinkTarget[];
  onSave: (patch: Partial<MapPin>) => void;
  onClose: () => void;
}

export function PinEditorDialog({ pin, mapId, targets, onSave, onClose }: PinEditorDialogProps) {
  const [draft, setDraft] = useState<MapPin | null>(pin);
  useEffect(() => setDraft(pin), [pin]);
  const byKey = useMemo(() => new Map(targets.map((t) => [linkKey(t), t])), [targets]);
  if (!draft) return null;

  const linked = new Set(draft.links.map(linkKey));
  const available = targets.filter((t) => !linked.has(linkKey(t)) && !(t.kind === "map" && t.id === mapId));
  const kinds = Object.keys(LINK_KIND_LABEL) as PinLinkKind[];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pinezka</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Nazwa" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {PIN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Kolor ${c}`}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={cn("h-6 w-6 rounded-full border-2", draft.color === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {PIN_ICONS.map((i) => {
                const Icon = PIN_ICON_COMPONENTS[i];
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ikona ${i}`}
                    onClick={() => setDraft({ ...draft, icon: i })}
                    className={cn("flex h-7 w-7 items-center justify-center rounded border", draft.icon === i ? "border-foreground bg-accent" : "border-transparent")}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Notatka" rows={4} />
          <div className="space-y-1.5">
            <label className="field-label block">Powiązania</label>
            <div className="flex flex-wrap gap-1">
              {draft.links.map((l) => {
                const t = byKey.get(linkKey(l));
                if (!t) return null;
                return (
                  <span key={linkKey(l)} className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs">
                    <span className="text-muted-foreground">{LINK_KIND_LABEL[l.kind]}:</span> {t.name}
                    <button type="button" aria-label="Usuń powiązanie" onClick={() => setDraft({ ...draft, links: draft.links.filter((x) => linkKey(x) !== linkKey(l)) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => {
                const t = byKey.get(e.target.value);
                if (t) setDraft({ ...draft, links: [...draft.links, { kind: t.kind, id: t.id }] });
              }}
              className="h-9 w-full rounded-md border bg-card px-2 text-sm"
            >
              <option value="">+ Dodaj powiązanie…</option>
              {kinds.map((k) => {
                const opts = available.filter((t) => t.kind === k);
                return opts.length ? (
                  <optgroup key={k} label={LINK_KIND_LABEL[k]}>
                    {opts.map((t) => <option key={linkKey(t)} value={linkKey(t)}>{t.name}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button
            onClick={() => {
              const { id: _id, x: _x, y: _y, ...patch } = draft;
              onSave({ ...patch, label: patch.label.trim() || "Pinezka" });
              onClose();
            }}
          >
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
