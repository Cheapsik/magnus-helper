import { newId } from "@/lib/cardSchema";

export const MAPS_KEY = "rpg_maps";

export type PinLinkKind = "hero" | "npc" | "monster" | "quest" | "faction" | "map";
export type PinLink = { kind: PinLinkKind; id: string };

export const PIN_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#64748b"] as const;
export const PIN_ICONS = ["pin", "castle", "home", "skull", "star", "flag"] as const;
export type PinIcon = (typeof PIN_ICONS)[number];

export type MapPin = {
  id: string;
  /** Position as a fraction (0–1) of the image width/height, so pins survive resizing. */
  x: number;
  y: number;
  label: string;
  color: string;
  icon: PinIcon;
  note: string;
  links: PinLink[];
};

/** The image blob is stored in IndexedDB under the map's id (see imageStore). */
export type CampaignMap = { id: string; name: string; createdAt: string; pins: MapPin[] };

/** Pan/zoom state: screen = offset + imagePixel * scale. */
export type MapView = { scale: number; x: number; y: number };

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function newMap(name: string): CampaignMap {
  return { id: newId(), name, createdAt: new Date().toISOString(), pins: [] };
}

export function newPin(x: number, y: number): MapPin {
  return { id: newId(), x, y, label: "Nowa pinezka", color: PIN_COLORS[0], icon: "pin", note: "", links: [] };
}

/** Viewport-relative point → clamped image fraction. */
export function toFraction(px: number, py: number, view: MapView, width: number, height: number): { x: number; y: number } {
  return {
    x: clamp((px - view.x) / (width * view.scale), 0, 1),
    y: clamp((py - view.y) / (height * view.scale), 0, 1),
  };
}

/** Image fraction → viewport-relative point. */
export function toScreen(fx: number, fy: number, view: MapView, width: number, height: number): { x: number; y: number } {
  return { x: view.x + fx * width * view.scale, y: view.y + fy * height * view.scale };
}

/** Zooms by `factor` keeping the viewport point (px, py) fixed over the same image spot. */
export function zoomAt(view: MapView, factor: number, px: number, py: number): MapView {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** Centers the whole image in the viewport. */
export function fitView(vw: number, vh: number, width: number, height: number): MapView {
  const scale = clamp(Math.min(vw / width, vh / height), MIN_SCALE, MAX_SCALE);
  return { scale, x: (vw - width * scale) / 2, y: (vh - height * scale) / 2 };
}

/** Removes a map and strips links to it from pins on every other map. */
export function removeMap(maps: CampaignMap[], mapId: string): CampaignMap[] {
  return maps
    .filter((m) => m.id !== mapId)
    .map((m) =>
      m.pins.some((p) => p.links.some((l) => l.kind === "map" && l.id === mapId))
        ? { ...m, pins: m.pins.map((p) => ({ ...p, links: p.links.filter((l) => !(l.kind === "map" && l.id === mapId)) })) }
        : m,
    );
}

export function updatePin(maps: CampaignMap[], mapId: string, pinId: string, patch: Partial<MapPin>): CampaignMap[] {
  return maps.map((m) => (m.id === mapId ? { ...m, pins: m.pins.map((p) => (p.id === pinId ? { ...p, ...patch } : p)) } : m));
}
