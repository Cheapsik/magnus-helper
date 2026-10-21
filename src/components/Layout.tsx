import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Dice5, Target, BookOpen, MoreHorizontal, Search,
  Swords, Activity, Package, StickyNote, Wrench, Users, Gem, Timer, MessageSquare, Music, Network, ScrollText,
  MapPin, Skull, SlidersHorizontal, Settings as SettingsIcon, LogOut,
  type LucideIcon,
  Waypoints, Lightbulb, PieChart, Flag, Shuffle, CalendarDays, LayoutDashboard, BookMarked, Map as MapIcon, Route, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useScene } from "@/context/SceneContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { usePageHeaderSlots } from "@/context/PageHeaderContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import StatusBar from "@/components/StatusBar";
import CampaignSwitcher from "@/components/CampaignSwitcher";
import Logo from "./Logo";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_WIDTH_STORAGE_KEY = "magnus_sidebar_width";

const clampSidebarWidth = (w: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(w)));

const EXTRA_TITLES: Record<string, string> = {
  "/settings": "Ustawienia",
  "/shop": "Sklep",
};

const NAV_TABS = [
  { path: "/", label: "Start", icon: Home },
  { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
  { path: "/tests", label: "Testy", icon: Target },
  { path: "/codex", label: "Baza wiedzy", icon: BookOpen },
];

const SIDEBAR_GROUPS: { label: string; items: { path: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Główne",
    items: [
      { path: "/", label: "Start", icon: Home },
      { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
      { path: "/tests", label: "Testy", icon: Target },
      { path: "/codex", label: "Baza wiedzy", icon: BookOpen },
    ],
  },
  {
    label: "Sesja",
    items: [
      { path: "/gm-screen", label: "Ekran MG", icon: LayoutDashboard },
      { path: "/prep", label: "Przygotowanie sesji", icon: Lightbulb },
      { path: "/combat", label: "Tracker walki", icon: Swords },
      { path: "/scena", label: "Scena", icon: MapPin },
      { path: "/quests", label: "Wątki", icon: Network },
      { path: "/conditions", label: "Stany", icon: Activity },
      { path: "/clocks", label: "Zegary", icon: PieChart },
      { path: "/calendar", label: "Kalendarz", icon: CalendarDays },
      { path: "/timers", label: "Timery", icon: Timer },
      { path: "/notes", label: "Notatki", icon: StickyNote },
      { path: "/chronicle", label: "Kronika", icon: BookMarked },
    ],
  },
  {
    label: "Postacie",
    items: [
      { path: "/heroes", label: "Bohaterowie", icon: ScrollText },
      { path: "/npcs", label: "NPC", icon: Users },
      { path: "/monsters", label: "Potwory", icon: Skull },
      { path: "/inventory", label: "Ekwipunek", icon: Package },
    ],
  },
  {
    label: "MG",
    items: [
      { path: "/gm-toolbox", label: "Skrzynka MG", icon: Wrench },
      { path: "/settings?tab=karty", label: "System kampanii", icon: SlidersHorizontal },
      { path: "/maps", label: "Mapy", icon: MapIcon },
      { path: "/relations", label: "Mapa relacji", icon: Waypoints },
      { path: "/factions", label: "Frakcje", icon: Flag },
      { path: "/tables", label: "Tabele losowe", icon: Shuffle },
      { path: "/travel", label: "Podróże", icon: Route },
      { path: "/safety", label: "Bezpieczeństwo", icon: ShieldCheck },
      { path: "/loot", label: "Generator łupu", icon: Gem },
      { path: "/rumors", label: "Plotki", icon: MessageSquare },
      { path: "/ambient", label: "Ambient", icon: Music },
    ],
  },
];

const MORE_LINKS = SIDEBAR_GROUPS.flatMap((g) => g.items).filter(
  (l) => !NAV_TABS.some((n) => n.path === l.path)
);

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const palette = useCommandPalette();
  const { activeScene } = useScene();
  const { signOut } = useAuth();

  const [storedWidth, setStoredWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_STORAGE_KEY,
    SIDEBAR_DEFAULT_WIDTH,
    { global: true },
  );
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => clampSidebarWidth(storedWidth));
  const [isResizing, setIsResizing] = useState(false);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setSidebarWidth(clampSidebarWidth(storedWidth));
  }, [storedWidth]);

  const beginResize = useCallback((clientX: number) => {
    dragStateRef.current = { startX: clientX, startWidth: sidebarWidth };
    setIsResizing(true);
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = e.clientX - dragStateRef.current.startX;
      setSidebarWidth(clampSidebarWidth(dragStateRef.current.startWidth + delta));
    };
    const onUp = () => {
      setIsResizing(false);
      dragStateRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) return;
    if (sidebarWidth === storedWidth) return;
    setStoredWidth(sidebarWidth);
  }, [isResizing, sidebarWidth, storedWidth, setStoredWidth]);

  const onResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const STEP = e.shiftKey ? 32 : 8;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(w - STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(w + STEP));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSidebarWidth(SIDEBAR_MIN_WIDTH);
    } else if (e.key === "End") {
      e.preventDefault();
      setSidebarWidth(SIDEBAR_MAX_WIDTH);
    }
  };

  const resetSidebarWidth = () => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);


  const isActive = (path: string) => {
    const [pathname, query] = path.split("?");
    if (query) return location.pathname === pathname && location.search === `?${query}`;
    return pathname === "/" ? location.pathname === "/" : location.pathname.startsWith(pathname);
  };

  const isMoreActive = MORE_LINKS.some((l) => isActive(l.path));
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const isDicePage = location.pathname === "/dice";
  const pageTitle =
    SIDEBAR_GROUPS.flatMap((group) => group.items).find((item) => item.path === location.pathname)
      ?.label ??
    EXTRA_TITLES[location.pathname] ??
    "Magnus";

  return (
    <div className="h-screen flex overflow-hidden">
      <aside
        className="hidden md:flex flex-col shrink-0 overflow-hidden border-r border-border bg-sidebar sticky top-0 h-screen"
        style={{ width: sidebarWidth }}
      >
        <Link
          to="/"
          className="flex h-16 min-w-0 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4"
        >
          <Logo className="h-6 w-6" />
          <span className="font-app-brand min-w-0 truncate text-[1.0625rem] leading-none text-foreground">
            Magnus
          </span>
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <nav className="px-2 py-2 animate-fade-in">
          {SIDEBAR_GROUPS.map((g, groupIndex) => (
            <div key={g.label} className={groupIndex > 0 ? "mt-1 border-t border-sidebar-border/60 pt-1" : undefined}>
              <ul>
                {g.items.map((it) => {
                  const active = isActive(it.path);
                  return (
                    <li key={it.path}>
                      <Link
                        to={it.path}
                        title={g.label}
                        className={cn(
                          "group relative flex h-[--h-row] items-center gap-2.5 rounded-[--radius] pl-3 pr-2.5 text-[length:--fs-sm] transition-colors",
                          "before:absolute before:left-0 before:top-1/2 before:h-3.5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:transition-colors",
                          active
                            ? "bg-sidebar-accent text-foreground before:bg-primary"
                            : "text-muted-foreground before:bg-transparent hover:bg-sidebar-accent/50 hover:text-foreground",
                        )}
                      >
                        <it.icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            active
                              ? "text-foreground"
                              : it.path === "/scena" && activeScene
                                ? "text-primary"
                                : "text-muted-foreground/70 group-hover:text-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        {it.path === "/scena" && activeScene && (
                          <span className="max-w-[45%] truncate text-[length:--fs-meta] text-muted-foreground/70">
                            {activeScene.name}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Zmień szerokość paska bocznego"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            beginResize(e.clientX);
          }}
          onDoubleClick={resetSidebarWidth}
          onKeyDown={onResizeKeyDown}
          title="Przeciągnij, aby zmienić szerokość. Dwuklik = reset."
          className={cn(
            "group absolute top-0 right-0 h-full w-1.5 -mr-[3px] z-20",
            "cursor-col-resize select-none",
            "focus:outline-none",
          )}
        >
          <span
            className={cn(
              "block h-full w-px mx-auto transition-colors",
              isResizing ? "bg-primary" : "bg-transparent group-hover:bg-primary/50 group-focus-visible:bg-primary/60",
            )}
            aria-hidden
          />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="grid grid-cols-3 items-center h-12 px-2 gap-1">
            <div className="min-w-0" aria-hidden />
            <Link
              to="/"
              className="flex items-center gap-2 min-w-0 max-w-full justify-center"
            >
              <Logo className="h-6 w-6 shrink-0" />
              <span className="font-app-brand text-base tracking-wide text-foreground truncate">
                Magnus Helper
              </span>
            </Link>
            <div className="flex items-center justify-end gap-0.5 min-w-0">
              <button
                onClick={palette.open}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Szukaj"
              >
                <Search className="h-4 w-4" />
              </button>
              <CampaignSwitcher className="!px-2" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/settings"
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Ustawienia"
                  >
                    <SettingsIcon className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ustawienia</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="p-2 text-destructive hover:text-destructive/80 transition-colors"
                    aria-label="Wyloguj się"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Wyloguj się</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <header className="hidden md:flex shrink-0 h-14 border-b border-border bg-background/80 backdrop-blur-md items-center justify-between px-6 gap-3">
          <button
            onClick={palette.open}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border bg-transparent hover:bg-white/5 hover:text-foreground transition-colors min-w-[280px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Szukaj wszędzie…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 border border-border bg-secondary/40 font-sans tracking-tight">
              {isMac ? "⌘" : "Ctrl"}K
            </kbd>
          </button>
          <div className="flex items-center gap-2">
            <CampaignSwitcher />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Ustawienia"
                >
                  <SettingsIcon className="h-[18px] w-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Ustawienia</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="p-2 text-destructive hover:text-destructive/80 transition-colors"
                  aria-label="Wyloguj się"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Wyloguj się</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main
          className={cn(
            "w-full min-w-0 flex-1",
            isDicePage ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          <div
            className={cn(
              "w-full max-w-none min-w-0",
              isDicePage
                ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0 pb-20 md:pb-0"
                : "px-5 pb-20 md:px-8 md:pb-6",
            )}
          >
            {isDicePage ? children : <PageFrame title={pageTitle}>{children}</PageFrame>}
          </div>
        </main>
        <StatusBar />
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors min-w-[56px] border-t-2 -mt-px",
                isActive(tab.path) ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          ))}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors min-w-[56px] border-t-2 -mt-px",
                isMoreActive ? "text-primary border-primary" : "text-muted-foreground hover:text-foreground border-transparent"
              )}>
                <MoreHorizontal className="h-5 w-5" />
                <span>Więcej</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="border-t border-primary/30">
              <SheetHeader>
                <SheetTitle className="text-foreground">Więcej narzędzi</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 py-4">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 transition-colors border-l-2",
                      isActive(link.path)
                        ? "border-primary text-primary bg-white/[0.03]"
                        : "border-transparent text-foreground hover:bg-white/[0.04]"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

/**
 * Every page is framed the same way: room above the title, the page's own
 * state on one line, then a single hairline. That rule is the only full-width
 * line on a page — the horizon its content hangs from.
 */
function PageFrame({ title, children }: { title: string; children: ReactNode }) {
  const { actions, meta } = usePageHeaderSlots();
  const shownMeta = meta.filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <header className="pb-4 pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <h1 className="text-[length:--fs-title] font-semibold leading-none tracking-[-0.02em]">
            {title}
          </h1>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
        {shownMeta.length > 0 && (
          <div className="meta-row mt-2.5">
            {shownMeta.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
      </header>
      <hr className="border-t border-border" />
      <div className="pt-6">{children}</div>
    </div>
  );
}
