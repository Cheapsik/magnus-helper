import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type DrawerEntityType = "npc" | "monster" | "item" | "quest" | "hero" | "rumorTemplate" | "shopSnapshot" | "quickAction";

export interface DrawerStackItem {
  type: DrawerEntityType;
  id: string;
  name?: string;
  data?: unknown;
}

interface DrawerContextValue {
  isOpen: boolean;
  stack: DrawerStackItem[];
  openDrawer: (type: DrawerEntityType, id: string, name?: string, data?: unknown) => void;
  closeDrawer: () => void;
  goBack: () => void;
  canGoBack: boolean;
  activeItem: DrawerStackItem | null;
}

const MAX_STACK_SIZE = 3;
const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrawerStackItem[]>([]);

  const openDrawer = useCallback((type: DrawerEntityType, id: string, name?: string, data?: unknown) => {
    setStack((prev) => {
      const nextItem: DrawerStackItem = { type, id, name, data };
      const withItem = [...prev, nextItem];
      if (withItem.length <= MAX_STACK_SIZE) {
        return withItem;
      }
      return withItem.slice(withItem.length - MAX_STACK_SIZE);
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setStack([]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : []));
  }, []);

  const value = useMemo<DrawerContextValue>(
    () => ({
      isOpen: stack.length > 0,
      stack,
      openDrawer,
      closeDrawer,
      goBack,
      canGoBack: stack.length > 1,
      activeItem: stack.at(-1) ?? null,
    }),
    [closeDrawer, goBack, openDrawer, stack],
  );

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within DrawerProvider");
  }
  return context;
}
