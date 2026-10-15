import type { Denomination } from "@/lib/campaignSystem";

/**
 * Helpers for "Waluta kampanii" (CONTEXT.md). Every amount Magnus stores is a
 * whole number of the smallest denomination (rate 1); denominations only
 * matter when an amount is shown or entered.
 */

/** Usable denominations, highest rate first; a broken rate (< 1) is ignored. */
function byRateDescending(currency: Denomination[]): Denomination[] {
  return currency.filter((d) => Number.isFinite(d.rate) && d.rate >= 1).sort((a, b) => b.rate - a.rate);
}

export function formatMoney(amountInSmallest: number, currency: Denomination[]): string {
  const amount = Math.round(Number.isFinite(amountInSmallest) ? amountInSmallest : 0);
  const denominations = byRateDescending(currency);
  if (denominations.length === 0) return String(amount);

  const sign = amount < 0 ? "-" : "";
  let rest = Math.abs(amount);
  const parts: string[] = [];
  for (const denomination of denominations) {
    const count = Math.floor(rest / denomination.rate);
    rest -= count * denomination.rate;
    if (count > 0) parts.push(`${count} ${denomination.short}`);
  }
  if (rest > 0) parts.push(String(rest));
  if (parts.length === 0) return `0 ${denominations[denominations.length - 1].short}`;
  return sign + parts.join(" ");
}

/** Amount from a count per denomination id; unknown ids count for nothing. */
export function toSmallest(parts: Record<string, number>, currency: Denomination[]): number {
  return byRateDescending(currency).reduce((sum, d) => {
    const count = parts[d.id];
    return sum + (Number.isFinite(count) ? Math.round(count) : 0) * d.rate;
  }, 0);
}

/** The greedy breakdown of a non-negative amount, one entry per denomination (zeros included). */
export function splitMoney(amountInSmallest: number, currency: Denomination[]): Record<string, number> {
  let rest = Math.max(0, Math.round(Number.isFinite(amountInSmallest) ? amountInSmallest : 0));
  const parts: Record<string, number> = {};
  for (const denomination of byRateDescending(currency)) {
    parts[denomination.id] = Math.floor(rest / denomination.rate);
    rest -= parts[denomination.id] * denomination.rate;
  }
  return parts;
}

/** Problems that make amounts ambiguous — shown as a hint in the currency editor. */
export function currencyIssues(currency: Denomination[]): string[] {
  if (currency.length === 0) return [];
  const issues: string[] = [];
  for (const d of currency) {
    if (!Number.isInteger(d.rate) || d.rate < 1) {
      issues.push(`Przelicznik nominału „${d.name.trim() || d.short || "bez nazwy"}” musi być liczbą całkowitą ≥ 1.`);
    }
  }
  if (!currency.some((d) => d.rate === 1)) {
    issues.push("Żaden nominał nie ma przelicznika 1 — najmniejszy nominał musi mieć 1.");
  }
  const seen = new Set<number>();
  const duplicated = new Set<number>();
  for (const d of currency) {
    if (seen.has(d.rate)) duplicated.add(d.rate);
    seen.add(d.rate);
  }
  for (const rate of duplicated) issues.push(`Kilka nominałów ma ten sam przelicznik: ${rate}.`);
  return issues;
}
