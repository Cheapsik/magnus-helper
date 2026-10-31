import { useSyncExternalStore } from "react";
import { Cloud, CloudOff, CloudUpload } from "lucide-react";
import { getSyncStatus, onSyncStatus } from "@/lib/cloudSync";
import { cn } from "@/lib/utils";

const waitingChanges = (n: number) =>
  n === 1 ? "1 zmiana czeka" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} zmiany czekają` : `${n} zmian czeka`;

/** Whether the campaign reached the cloud (lib/cloudSync). `compact` keeps only the icon. */
export default function SyncIndicator({ compact }: { compact?: boolean }) {
  const sync = useSyncExternalStore(onSyncStatus, getSyncStatus);
  if (!sync.active) return null;
  const [Icon, label, title, tone] =
    sync.stalled && sync.pending > 0
      ? ([CloudOff, `Offline: ${waitingChanges(sync.pending)}`, "Nie udało się wysłać zmian. Są zapisane na tym urządzeniu i pójdą do chmury, gdy wróci połączenie.", "text-primary"] as const)
      : sync.sending || sync.pending > 0
        ? ([CloudUpload, "Zapisuję…", "Wysyłam zmiany do chmury.", "text-muted-foreground"] as const)
        : ([Cloud, "Zapisano", "Wszystkie zmiany są w chmurze.", "text-muted-foreground"] as const);
  return (
    <span className={cn("flex items-center gap-1.5 px-2 text-[length:--fs-sm]", tone)} title={title} role="status">
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={compact ? "sr-only" : "whitespace-nowrap"}>{label}</span>
    </span>
  );
}
