import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DrawerEntityType } from "@/context/DrawerContext";

const RECENT_ITEMS_KEY = "rpg_recent_items";
const MAX_RECENT_ITEMS = 10;

export interface RecentItem {
  id: string;
  type: DrawerEntityType;
  name: string;
  updatedAt: number;
}

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  recentItems: RecentItem[];
  addToRecent: (item: Omit<RecentItem, "updatedAt">) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function readRecentItems(): RecentItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_ITEMS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.type === "string")
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, MAX_RECENT_ITEMS);
  } catch {
    return [];
  }
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setRecentItems(readRecentItems());
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addToRecent = useCallback((item: Omit<RecentItem, "updatedAt">) => {
    setRecentItems((prev) => {
      const now = Date.now();
      const withoutDuplicate = prev.filter((entry) => !(entry.id === item.id && entry.type === item.type));
      const next = [{ ...item, updatedAt: now }, ...withoutDuplicate].slice(0, MAX_RECENT_ITEMS);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      isOpen,
      open,
      close,
      recentItems,
      addToRecent,
    }),
    [addToRecent, close, isOpen, open, recentItems],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}
