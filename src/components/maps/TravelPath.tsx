import { Dices, Route, Trash2 } from "lucide-react";
import { rollTable, type RandomTable } from "@/lib/randomTables";
import type { TravelPath } from "@/lib/mapFog";
import { toScreen, type MapPin, type MapView } from "@/lib/maps";
import { Button } from "@/components/ui/button";

/** SVG lines for every path, in viewport coordinates (pointer-transparent). */
export function TravelPathLines({ paths, pins, view, size }: { paths: TravelPath[]; pins: MapPin[]; view: MapView; size: { w: number; h: number } }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {paths.map((t) => {
        const a = pins.find((p) => p.id === t.fromPinId);
        const b = pins.find((p) => p.id === t.toPinId);
        if (!a || !b) return null;
        const s = toScreen(a.x, a.y, view, size.w, size.h);
        const e = toScreen(b.x, b.y, view, size.w, size.h);
        return <line key={t.id} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#f59e0b" strokeWidth={3} strokeDasharray="8 6" strokeLinecap="round" />;
      })}
    </svg>
  );
}

interface TravelPanelProps {
  paths: TravelPath[];
  pins: MapPin[];
  tables: RandomTable[];
  onChange: (id: string, patch: Partial<TravelPath>) => void;
  onDelete: (id: string) => void;
}

/** Path list: pick an encounter table and travel (rolls it). */
export function TravelPanel({ paths, pins, tables, onChange, onDelete }: TravelPanelProps) {
  const label = (id: string) => pins.find((p) => p.id === id)?.label ?? "?";
  if (!paths.length) return null;
  return (
    <div className="space-y-1.5 border-t pt-1.5">
      <label className="field-label block">Szlaki</label>
      {paths.map((t) => (
        <div key={t.id} className="space-y-1 rounded border p-1.5 text-xs">
          <div className="flex items-center gap-1">
            <Route className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="flex-1 truncate font-medium">{label(t.fromPinId)} → {label(t.toPinId)}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(t.id)} aria-label="Usuń szlak"><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="flex gap-1">
            <select value={t.tableId ?? ""} onChange={(e) => onChange(t.id, { tableId: e.target.value || null })} className="h-7 min-w-0 flex-1 rounded border bg-card px-1">
              <option value="">Bez spotkań</option>
              {tables.map((tb) => <option key={tb.id} value={tb.id}>{tb.name}</option>)}
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2"
              onClick={() => {
                const table = tables.find((x) => x.id === t.tableId);
                const r = table && rollTable(table, tables);
                onChange(t.id, { lastRoll: r ? `${r.roll}: ${r.text}` : table ? "Nieprawidłowa tabela" : "W drodze bez przygód" });
              }}
            >
              <Dices className="h-3.5 w-3.5" />Podróżuj
            </Button>
          </div>
          {t.lastRoll && <p className="whitespace-pre-wrap rounded bg-muted px-1.5 py-1">{t.lastRoll}</p>}
        </div>
      ))}
    </div>
  );
}
