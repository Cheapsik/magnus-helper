import type { RelationStatus } from "./types";

const TYPE_COLORS: Record<string, string> = {
  rodzina: "hsl(210 70% 62%)",
  sojusz: "hsl(140 55% 52%)",
  przyjaźń: "hsl(155 50% 48%)",
  przyjazn: "hsl(155 50% 48%)",
  romans: "hsl(330 70% 65%)",
  wrogość: "hsl(0 75% 55%)",
  wrogosc: "hsl(0 75% 55%)",
  "mentor-uczeń": "hsl(45 80% 58%)",
  "mentor-uczen": "hsl(45 80% 58%)",
  "pracodawca-pracobiorca": "hsl(200 35% 58%)",
  rywal: "hsl(25 80% 58%)",
  tajemnica: "hsl(280 60% 65%)",
  dług: "hsl(28 70% 55%)",
  dlug: "hsl(28 70% 55%)",
  zależność: "hsl(195 40% 55%)",
  zaleznosc: "hsl(195 40% 55%)",
  neutralny: "hsl(40 25% 70%)",
};

export function typeColor(t: string): string {
  const k = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    const nk = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (k.includes(nk) || nk.includes(k)) return color;
  }
  if (k.includes("wrog")) return TYPE_COLORS.wrogosc;
  if (k.includes("rywal")) return TYPE_COLORS.rywal;
  return TYPE_COLORS.neutralny;
}

export function statusStroke(s: RelationStatus): string {
  switch (s) {
    case "ukryta":
      return "6 4";
    case "zmienna":
      return "8 4";
    case "zerwana":
      return "2 4";
    default:
      return "0";
  }
}

export const statusLabel: Record<RelationStatus, string> = {
  aktywna: "Aktywna",
  ukryta: "Ukryta",
  zmienna: "Zmienna",
  zerwana: "Zerwana",
};

export function edgeStrokeWidth(strength: number, highlighted?: boolean): number {
  const base = 2 + (strength || 3) * 0.6;
  return highlighted ? base + 1.5 : base;
}

/** Muted color for small edge arrow markers */
export function subtleMarkerColor(color: string): string {
  if (color.includes("/")) return color;
  return color.replace(/\)$/, " / 0.55)");
}
