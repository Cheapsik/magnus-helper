import { LEGEND_TYPES, STATUSES } from "../constants";
import { statusLabel, statusStroke, typeColor } from "../colors";

export function LegendPanel({ embedded }: { embedded?: boolean }) {
  return (
    <div className={embedded ? "" : "border-t border-border px-3 py-3 shrink-0 bg-card/20"}>
      {!embedded && (
        <div className="text-[10px] uppercase tracking-wider text-primary mb-2">Legenda</div>
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
        {LEGEND_TYPES.map((t) => (
          <div key={t} className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block w-3 h-0.5 shrink-0 rounded-full"
              style={{ background: typeColor(t) }}
            />
            <span className="text-[9px] text-muted-foreground truncate">{t}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 pt-2 space-y-1">
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <svg width="24" height="6" className="shrink-0">
              <line
                x1="0"
                y1="3"
                x2="24"
                y2="3"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                strokeDasharray={statusStroke(s) === "0" ? undefined : statusStroke(s)}
              />
            </svg>
            <span className="text-[9px] text-muted-foreground">{statusLabel[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
