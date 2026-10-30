import { useEffect, useRef } from "react";
import { FOG_GRID } from "@/lib/mapFog";
import type { MapView } from "@/lib/maps";

interface FogOverlayProps {
  cells: string;
  /** Omit both to fill the parent (player screen). */
  size?: { w: number; h: number };
  view?: MapView;
  /** Players see solid fog; the GM sees through it. */
  opaque: boolean;
}

/** A GRID x GRID canvas stretched over the image; the browser's smoothing softens the edges. */
export function FogOverlay({ cells, size, view, opaque }: FogOverlayProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, FOG_GRID, FOG_GRID);
    ctx.fillStyle = "#0a0a0a";
    for (let i = 0; i < cells.length; i++) if (cells[i] !== "1") ctx.fillRect(i % FOG_GRID, Math.floor(i / FOG_GRID), 1, 1);
  }, [cells]);
  return (
    <canvas
      ref={ref}
      width={FOG_GRID}
      height={FOG_GRID}
      className="pointer-events-none absolute left-0 top-0 max-w-none"
      style={{
        width: size?.w ?? "100%",
        height: size?.h ?? "100%",
        opacity: opaque ? 1 : 0.55,
        transform: view ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})` : undefined,
        transformOrigin: "0 0",
      }}
    />
  );
}
