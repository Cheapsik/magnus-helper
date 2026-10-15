import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type PageHeaderSlots = { actions: ReactNode; meta: ReactNode[] };

type PageHeaderContextValue = PageHeaderSlots & {
  setSlots: (slots: PageHeaderSlots) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

const EMPTY: PageHeaderSlots = { actions: null, meta: [] };

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<PageHeaderSlots>(EMPTY);
  const value = useMemo(() => ({ ...slots, setSlots }), [slots]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderSlots(): PageHeaderSlots {
  return useContext(PageHeaderContext) ?? EMPTY;
}

/**
 * Lets a page hand its actions and state line to the shared masthead, so every
 * page is framed identically instead of building its own heading.
 *
 * Pass a `deps` array exactly as you would to useEffect — the slots are rebuilt
 * when it changes and cleared when the page unmounts.
 */
export function usePageHeader(slots: Partial<PageHeaderSlots>, deps: unknown[] = []) {
  const ctx = useContext(PageHeaderContext);
  const setSlots = ctx?.setSlots;

  useEffect(() => {
    if (!setSlots) return;
    setSlots({ actions: slots.actions ?? null, meta: slots.meta ?? [] });
    return () => setSlots(EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlots, ...deps]);
}
