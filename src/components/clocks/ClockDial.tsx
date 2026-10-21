import { segmentPath, type Clock } from "@/lib/clocks";
import { cn } from "@/lib/utils";

const R = 50;

export function ClockDial({ clock, size, className }: { clock: Clock; size: number; className?: string }) {
  const done = clock.filled >= clock.segments;
  return (
    <svg
      viewBox={`-2 -2 ${2 * R + 4} ${2 * R + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${clock.name || "Zegar"}: ${clock.filled} z ${clock.segments}${done ? ", pełny" : ""}`}
      className={cn("shrink-0", className)}
    >
      {Array.from({ length: clock.segments }, (_, i) => (
        <path
          key={i}
          d={segmentPath(i, clock.segments, R)}
          className={cn(
            "stroke-background",
            i < clock.filled ? (done ? "fill-destructive" : "fill-primary") : "fill-muted",
          )}
          strokeWidth={2}
        />
      ))}
      <circle cx={R} cy={R} r={R} className="fill-none stroke-border" strokeWidth={2} />
    </svg>
  );
}
