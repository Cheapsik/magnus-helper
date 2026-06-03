import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingPanel({
  title,
  onClose,
  className,
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute z-10 bg-card/95 border border-border backdrop-blur shadow-lg rounded-sm",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/80">
        <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 text-muted-foreground hover:text-primary"
          aria-label={`Zamknij: ${title}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3 max-h-[min(420px,calc(100vh-12rem))] overflow-y-auto">{children}</div>
    </div>
  );
}
