import { useId } from "react";
import { cn } from "@/lib/utils";

/** A small lit flame in candle gold; still when the system asks for reduced motion (index.css). */
export default function CandleFlame({ className }: { className?: string }) {
  // Per-instance ids: a gradient inside a hidden copy (mobile header on desktop) would blank the visible one.
  const id = useId();
  return (
    <svg viewBox="0 0 16 24" className={cn("h-4 w-3 shrink-0 overflow-visible", className)} aria-hidden>
      <defs>
        <radialGradient id={`${id}glow`} cx="50%" cy="62%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}outer`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(18 85% 50%)" />
          <stop offset="45%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(44 90% 72%)" />
        </linearGradient>
      </defs>
      <ellipse className="candle-glow" cx="8" cy="14" rx="9" ry="11" fill={`url(#${id}glow)`} />
      <rect x="7.5" y="19.5" width="1" height="4" rx="0.5" fill="hsl(28 20% 22%)" />
      <g className="candle-flame">
        <path
          d="M8.6 0.5C9.4 3.5 13.5 7.5 13.2 13.5 13 18.5 10.5 21.5 8 21.5 5.2 21.5 2.8 18.8 2.9 14.8 3 11.5 5 9.6 6.3 7.2 7.2 5.5 7.4 3.4 8.6 0.5Z"
          fill={`url(#${id}outer)`}
        />
        <path
          className="candle-flame-core"
          d="M8.2 9C8.6 11.5 10.6 13.2 10.5 16.2 10.4 18.4 9.3 19.6 8 19.6 6.6 19.6 5.6 18.4 5.7 16.6 5.8 14.2 7.6 12.6 8.2 9Z"
          fill="hsl(48 100% 90%)"
        />
      </g>
    </svg>
  );
}
