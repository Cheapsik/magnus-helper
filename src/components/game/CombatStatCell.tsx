import type { ReactNode } from "react";
import type { GameStatKey } from "@/lib/gameStatGlossary";
import { getStatFullName } from "@/lib/gameStatGlossary";

/** Pola liczbowe w siatce — pełna szerokość komórki, wyrównanie do lewej. */
export const NARROW_NUM = "h-7 w-full min-w-0 text-left tabular-nums text-xs px-2 py-0.5";

type CombatStatCellProps = {
  statKey?: GameStatKey;
  /** Nadpisuje etykietę; domyślnie pełna nazwa ze słownika dla `statKey`. */
  label?: string;
  /** Dodatkowy opis po najechaniu (natywny `title`). */
  tooltip?: string;
  required?: boolean;
  children: ReactNode;
};

export function CombatStatCell({ statKey, label, tooltip, required, children }: CombatStatCellProps) {
  const displayLabel = label ?? (statKey != null ? getStatFullName(statKey) : "");
  const titleAttr = tooltip?.trim() ? tooltip : undefined;

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-0.5">
      <div className="flex min-h-0 items-end justify-start text-left">
        <span
          title={titleAttr}
          className="min-w-0 hyphens-auto text-balance text-left text-[8px] leading-[1.2] text-muted-foreground sm:text-[9px] line-clamp-2"
        >
          {displayLabel}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
      </div>
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
