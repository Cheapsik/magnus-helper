import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Denomination } from "@/lib/campaignSystem";
import { splitMoney, toSmallest } from "@/lib/currency";
import { NumberInput } from "@/components/ui/number-input";

/**
 * Enters an amount as a count per denomination, highest first, and reports it
 * in the smallest denomination. Without a campaign currency it is one plain
 * number. Keeps the counts as typed (e.g. 15 of a coin worth 10) until the
 * amount changes from outside.
 */
export function MoneyInput({
  value,
  onChange,
  currency,
  className,
  inputClassName,
  id,
}: {
  value: number;
  onChange: (amountInSmallest: number) => void;
  currency: Denomination[];
  className?: string;
  inputClassName?: string;
  id?: string;
}) {
  const denominations = [...currency].filter((d) => d.rate >= 1).sort((a, b) => b.rate - a.rate);
  const [parts, setParts] = useState(() => splitMoney(value, denominations));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setParts(splitMoney(value, denominations));
  }

  if (denominations.length === 0) {
    return (
      <NumberInput
        id={id}
        value={value}
        min={0}
        onChange={(v) => onChange(Math.max(0, Math.round(v)))}
        className={cn("text-center", inputClassName, className)}
      />
    );
  }

  const setPart = (denominationId: string, count: number) => {
    const next = { ...parts, [denominationId]: Math.max(0, Math.round(count)) };
    const amount = toSmallest(next, denominations);
    setParts(next);
    setSynced(amount);
    onChange(amount);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {denominations.map((d, index) => (
        <label key={d.id} className="flex items-center gap-1" title={d.name}>
          <NumberInput
            id={index === 0 ? id : undefined}
            value={parts[d.id] ?? 0}
            min={0}
            onChange={(v) => setPart(d.id, v)}
            className={cn("w-16 text-center", inputClassName)}
            aria-label={d.name}
          />
          <span className="text-xs text-muted-foreground">{d.short}</span>
        </label>
      ))}
    </div>
  );
}
