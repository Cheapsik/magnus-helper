import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Polish plural form: 1 → one, 2–4 (not 12–14) → few, otherwise many. */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (n === 1) return one;
  return m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}
