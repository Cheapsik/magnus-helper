import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Castle, Flag, Home, MapPin, Maximize, Skull, Star, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { fitView, toFraction, toScreen, zoomAt, type MapPin as Pin, type MapView, type PinIcon } from "@/lib/maps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PIN_ICON_COMPONENTS: Record<PinIcon, LucideIcon> = {
  pin: MapPin,
  castle: Castle,
  home: Home,
  skull: Skull,
  star: Star,
  flag: Flag,
};

type Drag = {
  kind: "pan" | "pin" | "fog";
  pinId?: string;
  pointerId: number;
  startX: number;
  startY: number;
  startView: MapView;
  moved: boolean;
};

interface MapCanvasProps {
  imageUrl: string;
  pins: Pin[];
  addMode: boolean;
  selectedPinId: string | null;
  onSelect: (pinId: string | null) => void;
  onAddPin: (x: number, y: number) => void;
  onMovePin: (pinId: string, x: number, y: number) => void;
  renderPopover: (pin: Pin) => ReactNode;
  /** Drawn between the image and the pins (fog, travel paths). */
  renderOverlay?: (ctx: { view: MapView; size: { w: number; h: number } }) => ReactNode;
  /** While set, dragging on empty map paints fog instead of panning. */
  fogTool?: "reveal" | "hide" | null;
  onPaintFog?: (x: number, y: number) => void;
  /** Short text on a pin (e.g. linked clock progress). */
  pinBadge?: (pin: Pin) => string | null;
}

const POPOVER_WIDTH = 256;

export function MapCanvas({ imageUrl, pins, addMode, selectedPinId, onSelect, onAddPin, onMovePin, renderPopover, renderOverlay, fogTool, onPaintFog, pinBadge }: MapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<MapView>({ scale: 1, x: 0, y: 0 });
  const [dragPin, setDragPin] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    // React's onWheel is passive, so preventDefault (no page scroll) needs a native listener.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", onWheel); };
  }, []);

  const fit = (w = size?.w, h = size?.h) => {
    const el = viewportRef.current;
    if (el && w && h) setView(fitView(el.clientWidth, el.clientHeight, w, h));
  };

  const local = (e: PointerEvent) => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (dragRef.current || !size || target.closest("[data-map-ui]")) return;
    const pinId = target.closest<HTMLElement>("[data-pin-id]")?.dataset.pinId;
    const kind = pinId ? "pin" : fogTool ? "fog" : "pan";
    dragRef.current = { kind, pinId, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startView: view, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kind === "fog") paintAt(e);
  };

  const paintAt = (e: PointerEvent) => {
    const p = local(e);
    const f = toFraction(p.x, p.y, view, size!.w, size!.h);
    onPaintFog?.(f.x, f.y);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || !size) return;
    if (d.kind === "fog") { paintAt(e); return; }
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    if (d.kind === "pan") setView({ ...d.startView, x: d.startView.x + dx, y: d.startView.y + dy });
    else {
      const p = local(e);
      setDragPin({ id: d.pinId!, ...toFraction(p.x, p.y, view, size.w, size.h) });
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || !size) return;
    dragRef.current = null;
    if (d.kind === "fog") return;
    if (d.kind === "pin") {
      if (d.moved && dragPin) onMovePin(dragPin.id, dragPin.x, dragPin.y);
      else onSelect(d.pinId!);
      setDragPin(null);
    } else if (!d.moved) {
      if (addMode) {
        const p = local(e);
        const f = toFraction(p.x, p.y, view, size.w, size.h);
        onAddPin(f.x, f.y);
      } else onSelect(null);
    }
  };

  const onPointerCancel = () => { dragRef.current = null; setDragPin(null); };

  const zoomCenter = (factor: number) => setView((v) => zoomAt(v, factor, viewport.w / 2, viewport.h / 2));

  // Bring a pin picked from the sidebar into view.
  useEffect(() => {
    const pin = pins.find((p) => p.id === selectedPinId);
    if (!pin || !size || !viewport.w) return;
    setView((v) => {
      const s = toScreen(pin.x, pin.y, v, size.w, size.h);
      const inside = s.x > 0 && s.y > 0 && s.x < viewport.w && s.y < viewport.h;
      return inside ? v : { ...v, x: v.x + viewport.w / 2 - s.x, y: v.y + viewport.h / 2 - s.y };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes
  }, [selectedPinId]);

  const selected = pins.find((p) => p.id === selectedPinId);

  return (
    <div
      ref={viewportRef}
      className={cn("relative h-full w-full overflow-hidden rounded-md border bg-muted/40 select-none", addMode || fogTool ? "cursor-crosshair" : "cursor-grab")}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className="absolute left-0 top-0 max-w-none pointer-events-none"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          setSize({ w, h });
          fit(w, h);
        }}
      />

      {size && renderOverlay?.({ view, size })}

      {size &&
        pins.map((pin) => {
          const pos = dragPin?.id === pin.id ? dragPin : pin;
          const s = toScreen(pos.x, pos.y, view, size.w, size.h);
          const Icon = PIN_ICON_COMPONENTS[pin.icon] ?? MapPin;
          return (
            <div
              key={pin.id}
              data-pin-id={pin.id}
              className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: s.x, top: s.y }}
            >
              <span
                className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md", pin.id === selectedPinId && "ring-2 ring-ring ring-offset-1")}
                style={{ backgroundColor: pin.color }}
                title={pin.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              {pinBadge?.(pin) && <span className="absolute -right-3 -top-2 rounded-full bg-amber-500 px-1 text-[11px] font-bold leading-tight text-black">{pinBadge(pin)}</span>}
              <span className="mt-0.5 max-w-32 truncate rounded bg-background/80 px-1 text-[11px] font-medium leading-tight">{pin.label}</span>
            </div>
          );
        })}

      {size && selected && (() => {
        const s = toScreen(selected.x, selected.y, view, size.w, size.h);
        return (
          <div
            data-map-ui
            className="absolute z-10 cursor-default"
            style={{ left: Math.max(4, Math.min(s.x + 20, viewport.w - POPOVER_WIDTH - 4)), top: Math.max(4, Math.min(s.y - 12, viewport.h - 220)), width: POPOVER_WIDTH }}
          >
            {renderPopover(selected)}
          </div>
        );
      })()}

      <div data-map-ui className="absolute right-2 top-2 z-20 flex flex-col gap-1">
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomCenter(1.25)} aria-label="Przybliż"><ZoomIn className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => zoomCenter(0.8)} aria-label="Oddal"><ZoomOut className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => fit()} aria-label="Dopasuj"><Maximize className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
