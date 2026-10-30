import { X } from "lucide-react";
import { LINK_KIND_LABEL, linkKey, type LinkTarget } from "@/components/maps/PinPanels";
import type { PinLink, PinLinkKind } from "@/lib/maps";

interface PinLinkEditorProps {
  links: PinLink[];
  targets: LinkTarget[];
  /** The current map, which must not link to itself. */
  excludeMapId: string;
  onChange: (links: PinLink[]) => void;
}

/** Add/remove entity links (cards, quests, clocks, factions, maps) on a pin. */
export function PinLinkEditor({ links, targets, excludeMapId, onChange }: PinLinkEditorProps) {
  const byKey = new Map(targets.map((t) => [linkKey(t), t]));
  const linked = new Set(links.map(linkKey));
  const available = targets.filter((t) => !linked.has(linkKey(t)) && !(t.kind === "map" && t.id === excludeMapId));
  const kinds = Object.keys(LINK_KIND_LABEL) as PinLinkKind[];
  return (
    <div className="space-y-1.5">
      <label className="field-label block">Powiązania</label>
      <div className="flex flex-wrap gap-1">
        {links.map((l) => {
          const t = byKey.get(linkKey(l));
          if (!t) return null;
          return (
            <span key={linkKey(l)} className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs">
              <span className="text-muted-foreground">{LINK_KIND_LABEL[l.kind]}:</span> {t.name}
              <button type="button" aria-label="Usuń powiązanie" onClick={() => onChange(links.filter((x) => linkKey(x) !== linkKey(l)))}>
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
          if (t) onChange([...links, { kind: t.kind, id: t.id }]);
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
  );
}
