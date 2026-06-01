import { cn } from "@/lib/utils";

export type CombatViewMode = "walka" | "gotowi" | "presety" | "postacie";

const MODES: { id: CombatViewMode; label: string }[] = [
  { id: "walka", label: "Walka" },
  { id: "gotowi", label: "Potwory" },
  { id: "postacie", label: "Postacie" },
  { id: "presety", label: "Presety" },
];

interface CombatViewModeNavProps {
  value: CombatViewMode;
  onChange: (mode: CombatViewMode) => void;
}

export function CombatViewModeNav({ value, onChange }: CombatViewModeNavProps) {
  return (
    <nav
      className="flex items-center gap-3 overflow-x-auto border-b border-border pb-2 scrollbar-none"
      aria-label="Tryb trackera"
    >
      {MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "shrink-0 text-sm font-medium transition-colors whitespace-nowrap",
              active
                ? "text-primary border-b-2 border-primary -mb-[9px] pb-2"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </nav>
  );
}
