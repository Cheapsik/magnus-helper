import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/components/command-palette/searchUtils";

interface MentionDropdownProps {
  isOpen: boolean;
  items: SearchResultItem[];
  activeIndex: number;
  onSelect: (item: SearchResultItem) => void;
}

export function MentionDropdown({ isOpen, items, activeIndex, onSelect }: MentionDropdownProps) {
  if (!isOpen) return null;
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
      {items.length === 0 ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Brak wynikow</div>
      ) : (
        items.map((item, index) => (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(item);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
              index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent",
            )}
          >
            <span>{item.icon}</span>
            <span className="truncate">{item.title}</span>
            <span className="ml-auto text-[10px] uppercase text-muted-foreground">{item.typeLabel}</span>
          </button>
        ))
      )}
    </div>
  );
}
