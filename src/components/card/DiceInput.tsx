import { toast } from "sonner";
import { Dices } from "lucide-react";
import { rollDiceNotation } from "@/lib/diceNotation";

/** Rolls a dice-notation value from a card and reports the result. */
export function rollFromCard(label: string, notation: string): void {
  const result = rollDiceNotation(notation);
  if (!result) {
    toast.error(`„${notation}” to nie jest notacja kości`);
    return;
  }
  const faces = result.dice.flatMap((group) => group.results).join(", ");
  const modifier = result.modifier ? ` ${result.modifier > 0 ? "+" : "−"}${Math.abs(result.modifier)}` : "";
  toast.success(`${label}: ${result.total}`, { description: `${notation} → ${faces}${modifier}` });
}

export function DiceInput({
  label,
  value,
  onChange,
  readOnly,
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        placeholder="np. 1k6+2"
        onChange={(e) => onChange(e.target.value)}
        className={className ?? "paper-input"}
        aria-label={label}
      />
      <button
        type="button"
        className="paper-icon-btn"
        disabled={!value.trim()}
        onClick={() => rollFromCard(label, value)}
        aria-label={`Rzuć: ${label}`}
      >
        <Dices className="h-4 w-4" />
      </button>
    </span>
  );
}
