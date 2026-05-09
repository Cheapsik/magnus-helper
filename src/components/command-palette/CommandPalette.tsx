import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useDrawer } from "@/context/DrawerContext";
import type { DrawerEntityType } from "@/context/DrawerContext";
import { buildSearchIndex, searchIndex, type SearchResultItem } from "@/components/command-palette/searchUtils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { CommandResultPreviewModal } from "@/components/command-palette/CommandResultPreviewModal";
import type { EntityPreviewType } from "@/components/global-drawer/DrawerContent";

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
    <CommandItem
      value={`${item.type}-${item.id}-${item.title}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
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
    </CommandItem>
  );
}

export function CommandPalette() {
  const { isOpen, close, recentItems, addToRecent } = useCommandPalette();
  const { openDrawer } = useDrawer();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchResultItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<{ type: EntityPreviewType; id: string; title: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    setIndex(buildSearchIndex());
  }, [isOpen]);

  const groups = useMemo(() => searchIndex(index, query), [index, query]);
  const hasQuery = query.trim().length > 0;
  const showEmptyState = hasQuery && groups.length === 0;

  const isPreviewType = (type: DrawerEntityType): type is EntityPreviewType =>
    type === "npc" || type === "monster" || type === "item" || type === "quest" || type === "hero";

  const getTargetRoute = (type: DrawerEntityType) => {
    switch (type) {
      case "npc":
        return "/npcs";
      case "monster":
        return "/combat";
      case "item":
        return "/inventory";
      case "quest":
        return "/quests";
      case "hero":
        return "/character";
      case "rumorTemplate":
        return "/rumors";
      case "shopSnapshot":
        return "/shop";
      default:
        return null;
    }
  };

  const handleSelectResult = (item: { type: DrawerEntityType; id: string; title: string }) => {
    const targetRoute = getTargetRoute(item.type);
    if (!isPreviewType(item.type)) {
      if (targetRoute) {
        navigate(targetRoute);
      }
      close();
      return;
    }
    setSelectedResult({ type: item.type, id: item.id, title: item.title });
    close();
  };

  if (typeof document === "undefined") {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogPortal>
          <DialogOverlay className="z-[9998] bg-black/60" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-[15%] z-[9999] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-background shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4 data-[state=closed]:zoom-out-95 motion-reduce:transition-none"
          >
            <DialogPrimitive.Title className="sr-only">Wyszukiwarka</DialogPrimitive.Title>
            <Command loop shouldFilter={false} className="w-full">
              <CommandInput autoFocus value={query} onValueChange={setQuery} placeholder="Szukaj NPC, przedmiotow, watkow, potworow..." />
              <CommandList className="max-h-[65vh] overflow-y-auto p-2">
                <CommandEmpty className="hidden" />
                {!hasQuery ? (
                  <>
                    <CommandGroup heading="Ostatnio otwierane">
                      {recentItems.slice(0, 5).map((item) => (
                        <CommandItem
                          key={`${item.type}-${item.id}`}
                          value={`recent-${item.type}-${item.id}`}
                          onSelect={() => handleSelectResult({ type: item.type, id: item.id, title: item.name })}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">↺</span>
                          <span className="truncate">{item.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Szybkie akcje">
                      {QUICK_ACTIONS.map((action) => (
                        <CommandItem
                          key={action.id}
                          value={`quick-${action.id}`}
                          onSelect={() => {
                            openDrawer(action.drawerType, action.id, action.label);
                            close();
                          }}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                        >
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                ) : (
                  groups.map((group) => (
                    <CommandGroup key={group.key} heading={`${group.label} · ${group.total} wyniki`}>
                      {group.items.map((item) => (
                        <ResultRow
                          key={`${item.type}-${item.id}`}
                          item={item}
                          query={query}
                          onSelect={() => {
                            addToRecent({ id: item.id, type: item.type, name: item.title });
                            handleSelectResult({ type: item.type, id: item.id, title: item.title });
                          }}
                        />
                      ))}
                      {group.total > 5 ? <div className="px-3 py-1 text-xs text-muted-foreground">Pokaz wiecej →</div> : null}
                    </CommandGroup>
                  ))
                )}
                {showEmptyState ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <div className="mb-2 text-2xl">🔍</div>
                    Nic nie znaleziono dla "{query}".
                  </div>
                ) : null}
              </CommandList>
            </Command>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <CommandResultPreviewModal
        isOpen={selectedResult !== null}
        type={selectedResult?.type ?? null}
        id={selectedResult?.id ?? ""}
        title={selectedResult?.title ?? ""}
        onClose={() => setSelectedResult(null)}
        onOpenFullPage={() => {
          if (!selectedResult) {
            return;
          }
          const route = getTargetRoute(selectedResult.type);
          if (route) {
            navigate(route);
          }
          setSelectedResult(null);
        }}
      />
    </>
  );
}
