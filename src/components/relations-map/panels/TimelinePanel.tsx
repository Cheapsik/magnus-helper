import { useRelationsMap } from "../context/RelationsMapContext";

export function TimelinePanel() {
  const { timeline } = useRelationsMap();

  if (timeline.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Brak wpisów. Zmieniaj relacje, by zapisywać historię.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {timeline.map((t, i) => (
        <div key={i} className="border-l-2 border-primary/60 pl-2 py-1">
          <div className="text-[10px] text-muted-foreground">
            {new Date(t.ts).toLocaleString()}
            {t.session && ` · ${t.session}`}
          </div>
          <div className="text-xs text-foreground/80">{t.source}</div>
          <div className="text-sm">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
