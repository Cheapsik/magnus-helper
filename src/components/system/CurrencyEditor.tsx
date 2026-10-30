import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { newId } from "@/lib/cardSchema";
import type { Denomination } from "@/lib/campaignSystem";
import { useCampaignSystem } from "@/lib/cardStore";
import { currencyIssues, formatMoney } from "@/lib/currency";
import { AddRow } from "@/components/system/FieldEditor";
import { Labeled, MoveButtons, iconBtn, inputCls } from "@/components/system/controls";
import { NumberInput } from "@/components/ui/number-input";

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** A new coin is worth ten of the most valuable one so far; the first one is the base unit. */
function nextRate(currency: Denomination[]): number {
  if (currency.length === 0) return 1;
  return Math.max(...currency.map((d) => d.rate)) * 10;
}

function shortFrom(name: string): string {
  return name.trim().slice(0, 2).toLowerCase();
}

/** "Waluta kampanii" (CONTEXT.md): denominations shared by loot, the shop and wealth on cards. */
export function CurrencyEditor() {
  const [system, setSystem] = useCampaignSystem();
  const [draft, setDraft] = useState("");
  const [example, setExample] = useState(1234);
  const currency = system.currency;
  const issues = currencyIssues(currency);

  const update = (fn: (prev: Denomination[]) => Denomination[]) =>
    setSystem((prev) => ({ ...prev, currency: fn(prev.currency) }));

  const patch = (id: string, change: Partial<Omit<Denomination, "id">>) =>
    update((prev) => prev.map((d) => (d.id === id ? { ...d, ...change } : d)));

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    update((prev) => [...prev, { id: newId(), name, short: shortFrom(name), rate: nextRate(prev) }]);
    setDraft("");
  };

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-[length:--fs-meta] text-muted-foreground">
        Kwoty w łupie i sklepie są zapisywane w najmniejszym nominale. Przelicznik mówi, ile najmniejszych monet jest wart
        dany nominał — najmniejszy ma przelicznik 1.
      </p>

      {currency.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Kampania nie ma jeszcze waluty — kwoty są pokazywane jako zwykłe liczby. Dodaj pierwszy nominał, zaczynając od
          najmniejszego.
        </p>
      ) : (
        <ul className="space-y-1">
          {currency.map((denomination, index) => (
            <li
              key={denomination.id}
              className="flex flex-wrap items-end gap-2 rounded-md border border-border/70 px-2 py-1.5 sm:flex-nowrap"
            >
              <Labeled label="Nazwa" className="min-w-[8rem] flex-1">
                <input
                  className={inputCls}
                  value={denomination.name}
                  onChange={(e) => patch(denomination.id, { name: e.target.value })}
                />
              </Labeled>
              <Labeled label="Skrót" className="w-20">
                <input
                  className={inputCls}
                  value={denomination.short}
                  onChange={(e) => patch(denomination.id, { short: e.target.value })}
                />
              </Labeled>
              <Labeled label="Przelicznik" className="w-24">
                <NumberInput
                  className={inputCls}
                  value={denomination.rate}
                  min={1}
                  onChange={(v) => patch(denomination.id, { rate: Math.max(1, Math.round(v)) })}
                />
              </Labeled>
              <div className="flex shrink-0 items-center pb-0.5">
                <MoveButtons
                  onMove={(direction) =>
                    update((prev) => {
                      const at = prev.findIndex((d) => d.id === denomination.id);
                      return at < 0 ? prev : move(prev, at, direction);
                    })
                  }
                  first={index === 0}
                  last={index === currency.length - 1}
                  label={denomination.name}
                />
                <button
                  type="button"
                  className={cn(iconBtn, "hover:text-destructive")}
                  onClick={() => update((prev) => prev.filter((d) => d.id !== denomination.id))}
                  aria-label={`Usuń nominał: ${denomination.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddRow placeholder="Nazwa nowego nominału" value={draft} onValue={setDraft} onAdd={add} />

      {issues.length > 0 && (
        <div className="space-y-0.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {issues.map((issue) => (
            <p key={issue} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {issue}
            </p>
          ))}
        </div>
      )}

      {currency.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Przykład:</span>
          <NumberInput
            className={cn(inputCls, "w-24")}
            value={example}
            min={0}
            onChange={(v) => setExample(Math.max(0, Math.round(v)))}
            aria-label="Przykładowa kwota w najmniejszym nominale"
          />
          <span className="text-muted-foreground">→</span>
          <span className="font-medium tabular-nums">{formatMoney(example, currency)}</span>
        </div>
      )}
    </div>
  );
}
