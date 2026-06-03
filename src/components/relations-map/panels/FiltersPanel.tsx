import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUSES } from "../constants";
import { statusLabel } from "../colors";
import type { FilterState } from "../types";
import { FilterRow } from "../shared/FormBits";
import { useRelationsMap } from "../context/RelationsMapContext";

export function FiltersPanel({ embedded }: { embedded?: boolean }) {
  const { filters, setFilters, allTags, allTypes, resetFilters } = useRelationsMap();

  return (
    <div className={embedded ? "space-y-2" : "border-t border-border px-3 py-3 space-y-2 shrink-0"}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-primary">Filtry</span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[10px] text-muted-foreground hover:text-primary"
          >
            Reset
          </button>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end -mt-1 mb-1">
          <button
            type="button"
            onClick={resetFilters}
            className="text-[10px] text-muted-foreground hover:text-primary"
          >
            Reset
          </button>
        </div>
      )}
      <FilterRow label="Typ postaci">
        <Select
          value={filters.kind}
          onValueChange={(v) => setFilters((f) => ({ ...f, kind: v as FilterState["kind"] }))}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="npc">NPC</SelectItem>
            <SelectItem value="hero">Bohaterowie</SelectItem>
          </SelectContent>
        </Select>
      </FilterRow>
      <FilterRow label="Frakcja / tag">
        <Select
          value={filters.faction}
          onValueChange={(v) => setFilters((f) => ({ ...f, faction: v }))}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterRow>
      <FilterRow label="Status relacji">
        <Select
          value={filters.status}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v as FilterState["status"] }))}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterRow>
      <FilterRow label="Typ relacji">
        <Select
          value={filters.relationType}
          onValueChange={(v) => setFilters((f) => ({ ...f, relationType: v }))}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {allTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterRow>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="pinned-filter"
          checked={filters.pinnedOnly}
          onCheckedChange={(v) => setFilters((f) => ({ ...f, pinnedOnly: !!v }))}
        />
        <label htmlFor="pinned-filter" className="text-xs">
          Tylko przypięte
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="changed-filter"
          checked={filters.changedOnly}
          onCheckedChange={(v) => setFilters((f) => ({ ...f, changedOnly: !!v }))}
        />
        <label htmlFor="changed-filter" className="text-xs">
          Zmiany od ostatniej sesji
        </label>
      </div>
    </div>
  );
}
