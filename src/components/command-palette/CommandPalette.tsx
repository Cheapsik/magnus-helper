import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useDrawer } from "@/context/DrawerContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildSearchIndex, searchIndex, type SearchResultItem } from "@/components/command-palette/searchUtils";

const QUICK_ACTIONS = [
  { id: "new-npc", icon: "⚔️", label: "Nowy NPC", drawerType: "quickAction" as const },
  { id: "new-monster", icon: "💀", label: "Nowy Potwor", drawerType: "quickAction" as const },
  { id: "new-quest", icon: "📌", label: "Nowy Watek", drawerType: "quickAction" as const },
  { id: "generate-loot", icon: "🎲", label: "Generuj lup", drawerType: "quickAction" as const },
];

function ResultRow({
  item,
  query,
  onSelect,
}: {
  item: SearchResultItem;
  query: string;
  onSelect: () => void;
}) {
  const title = item.title || "Bez nazwy";
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const highlightIndex = lowerQuery ? lowerTitle.indexOf(lowerQuery) : -1;

  return (
    <Command.Item
      value={`${item.type}-${item.id}-${item.title}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
    >
      <span>{item.icon}</span>
      <div className="min-w-0 flex-1">
        {highlightIndex >= 0 ? (
          <p className="truncate">
            {title.slice(0, highlightIndex)}
            <span className="font-semibold text-primary">
              {title.slice(highlightIndex, highlightIndex + query.length)}
            </span>
            {title.slice(highlightIndex + query.length)}
          </p>
        ) : (
          <p className="truncate font-semibold">{title}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{item.description || item.typeLabel}</p>
      </div>
      <span className="rounded bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
        {item.typeLabel}
      </span>
    </Command.Item>
  );
}

export function CommandPalette() {
  const { isOpen, close, recentItems, addToRecent } = useCommandPalette();
  const { openDrawer } = useDrawer();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchResultItem[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen) return;
    setIndex(buildSearchIndex());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  const groups = useMemo(() => searchIndex(index, query), [index, query]);
  const hasQuery = query.trim().length > 0;
  const showEmptyState = hasQuery && groups.length === 0;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const body = (
    <div className="fixed inset-0 z-[9999]">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={close} aria-label="Zamknij wyszukiwarke" />
      <div
        className={
          isMobile
            ? "absolute inset-0 bg-background p-3"
            : "absolute left-1/2 top-20 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border bg-background shadow-2xl"
        }
      >
        <Command loop className="w-full">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Szukaj NPC, przedmiotow, watkow, potworow..."
            />
            {isMobile ? (
              <button type="button" className="text-sm text-muted-foreground" onClick={close}>
                Anuluj
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Esc</span>
            )}
          </div>
          <Command.List className="max-h-[65vh] overflow-y-auto p-2">
            {!hasQuery ? (
              <>
                <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ostatnio otwierane
                </div>
                {recentItems.slice(0, 5).map((item) => (
                  <Command.Item
                    key={`${item.type}-${item.id}`}
                    value={`recent-${item.type}-${item.id}`}
                    onSelect={() => {
                      openDrawer(item.type, item.id, item.name);
                      close();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                  >
                    <span className="text-muted-foreground">↺</span>
                    <span className="truncate">{item.name}</span>
                  </Command.Item>
                ))}
                <div className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Szybkie akcje
                </div>
                {QUICK_ACTIONS.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`quick-${action.id}`}
                    onSelect={() => {
                      openDrawer(action.drawerType, action.id, action.label);
                      close();
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </Command.Item>
                ))}
              </>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="pb-2">
                  <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label} · {group.total} wyniki
                  </div>
                  {group.items.map((item) => (
                    <ResultRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      query={query}
                      onSelect={() => {
                        openDrawer(item.type, item.id, item.title);
                        addToRecent({ id: item.id, type: item.type, name: item.title });
                        close();
                      }}
                    />
                  ))}
                  {group.total > 5 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground">Pokaz wiecej →</div>
                  ) : null}
                </div>
              ))
            )}
            {showEmptyState ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <div className="mb-2 text-2xl">🔍</div>
                Nic nie znaleziono dla "{query}".
              </div>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
