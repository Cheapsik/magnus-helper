import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Eraser } from "lucide-react";
import { useRelationsMap } from "../context/RelationsMapContext";

export function SessionPanel({ embedded }: { embedded?: boolean }) {
  const {
    persisted,
    previewSessionId,
    setPreviewSessionId,
    startNewSession,
    clearChangedFlags,
    hasChangedFlags,
    timeline,
    currentSessionName,
  } = useRelationsMap();

  const records = [...persisted.sessionRecords].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className={embedded ? "space-y-2" : "border-t border-border px-3 py-3 shrink-0 max-h-[180px] overflow-y-auto"}>
      <div className="flex items-center justify-end gap-1 mb-1">
        <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={startNewSession} title="Nowa sesja">
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 disabled:opacity-30"
          onClick={clearChangedFlags}
          disabled={!hasChangedFlags}
          title="Wyczyść znaczniki NEW"
        >
          <Eraser className="h-3 w-3" />
        </Button>
      </div>
      {previewSessionId && (
        <div className="mb-2 p-2 border border-primary/40 bg-primary/5 text-[10px]">
          <div className="text-primary font-medium mb-1">Podgląd sesji</div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] w-full"
            onClick={() => setPreviewSessionId(null)}
          >
            Wróć do bieżącego
          </Button>
        </div>
      )}
      {records.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Brak zapisanych sesji.</p>
      )}
      <div className="space-y-1">
        {records.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPreviewSessionId(s.id === previewSessionId ? null : s.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 border text-xs transition-colors",
              previewSessionId === s.id
                ? "border-primary bg-primary/10 text-primary"
                : persisted.currentSessionId === s.id
                  ? "border-primary/40 bg-card"
                  : "border-border hover:border-primary/50"
            )}
          >
            <div className="font-medium truncate">{s.name}</div>
            <div className="text-[9px] text-muted-foreground">
              {new Date(s.startedAt).toLocaleDateString()}
              {s.endedAt ? ` · zakończona` : persisted.currentSessionId === s.id ? " · aktywna" : ""}
              {" · "}
              {s.snapshot.length} rel.
            </div>
          </button>
        ))}
      </div>
      {currentSessionName && timeline.length > 0 && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            Ostatnie zmiany
          </div>
          {timeline
            .filter((t) => !t.session || t.session === currentSessionName)
            .slice(0, 3)
            .map((t, i) => (
              <div
                key={i}
                className="text-[9px] text-muted-foreground py-0.5 border-l border-primary/30 pl-1.5 mb-1"
              >
                <div className="truncate">{t.message}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
