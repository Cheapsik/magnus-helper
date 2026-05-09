import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Home, Dice5, Target, BookOpen, MoreHorizontal, Sun, Moon, Search,
  Swords, User, BarChart3, Activity, Package, StickyNote, Wrench, Users, Gem, Timer, MessageSquare, Music, Network, ScrollText,
  Drama, KeyRound, MapPin,
  type LucideIcon,
} from "lucide-react";
import { useScene } from "@/context/SceneContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMode, isVisibleInMode } from "@/context/ModeContext";
import RpgDataBackupControls from "@/components/RpgDataBackupControls";
import StatusBar from "@/components/StatusBar";
import Logo from "./Logo";

const NAV_TABS = [
  { path: "/", label: "Start", icon: Home },
  { path: "/dice", label: "Kości", icon: Dice5 },
  { path: "/tests", label: "Testy", icon: Target },
  { path: "/codex", label: "Kodeks", icon: BookOpen },
];

const SIDEBAR_GROUPS: { label: string; items: { path: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Główne",
    items: [
      { path: "/", label: "Start", icon: Home },
      { path: "/dice", label: "Kości", icon: Dice5 },
      { path: "/tests", label: "Testy", icon: Target },
      { path: "/codex", label: "Kodeks", icon: BookOpen },
    ],
  },
  {
    label: "Sesja",
    items: [
      { path: "/combat", label: "Tracker walki", icon: Swords },
      { path: "/scena", label: "Scena", icon: MapPin },
      { path: "/quests", label: "Wątki", icon: Network },
      { path: "/conditions", label: "Stany", icon: Activity },
      { path: "/timers", label: "Timery", icon: Timer },
      { path: "/notes", label: "Notatki", icon: StickyNote },
    ],
  },
  {
    label: "Postacie",
    items: [
      { path: "/heroes", label: "Bohaterowie", icon: ScrollText },
      { path: "/character", label: "Postać", icon: User },
      { path: "/npcs", label: "NPC", icon: Users },
      { path: "/inventory", label: "Ekwipunek", icon: Package },
    ],
  },
  {
    label: "MG",
    items: [
      { path: "/gm-toolbox", label: "Skrzynka MG", icon: Wrench },
      { path: "/loot", label: "Generator łupu", icon: Gem },
      { path: "/rumors", label: "Plotki", icon: MessageSquare },
      { path: "/ambient", label: "Ambient", icon: Music },
      { path: "/simulations", label: "Symulacje", icon: BarChart3 },
    ],
  },
];

const MORE_LINKS = SIDEBAR_GROUPS.flatMap((g) => g.items).filter(
  (l) => !NAV_TABS.some((n) => n.path === l.path)
);

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const palette = useCommandPalette();
  const { mode, setMode } = useMode();
  const { activeScene } = useScene();

  const visibleGroups = SIDEBAR_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => isVisibleInMode(it.path, mode)) }))
    .filter((g) => g.items.length > 0);
  const visibleTabs = NAV_TABS.filter((t) => isVisibleInMode(t.path, mode));
  const visibleMore = MORE_LINKS.filter((l) => isVisibleInMode(l.path, mode));

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isMoreActive = visibleMore.some((l) => isActive(l.path));
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 px-5 h-14 border-b border-border">
          <Logo />
          <span className="font-display text-lg tracking-wide text-foreground">Magnus</span>
        </Link>

        <nav className="flex-1 px-2 py-3 space-y-4 animate-fade-in" key={mode}>
          {visibleGroups.map((g) => (
            <div key={g.label}>
              <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/35 font-sans font-semibold">
                {g.label}
              </div>
              <ul className="space-y-px">
                {g.items.map((it) => {
                  const active = isActive(it.path);
                  return (
                    <li key={it.path}>
                      <Link
                        to={it.path}
                        className={cn(
                          "group flex items-center gap-2.5 pl-3 pr-2 py-2 text-sm transition-colors border-l-2",
                          active
                            ? "border-primary text-primary bg-white/[0.04]"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                        )}
                      >
                        <it.icon className={cn("h-4 w-4", active ? "text-primary" : (it.path === "/scena" && activeScene ? "text-primary" : "text-muted-foreground group-hover:text-foreground"))} />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{it.label}</span>
                          {it.path === "/scena" && activeScene && (
                            <span className="block text-[10px] text-muted-foreground/70 truncate">{activeScene.name}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mode toggle */}
        <div className="border-t border-border px-2 py-2">
          <div className="grid grid-cols-2 gap-1 border border-border bg-background/40 p-1">
            <button
              onClick={() => setMode("player")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors",
                mode === "player" ? "bg-white/[0.06] text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title="Tryb Gracza"
            >
              <Drama className="h-3.5 w-3.5" /> Gracz
            </button>
            <button
              onClick={() => setMode("gm")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors",
                mode === "gm" ? "bg-white/[0.06] text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              title="Tryb Mistrza Gry"
            >
              <KeyRound className="h-3.5 w-3.5" /> MG
            </button>
          </div>
        </div>

      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 h-12">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
              <span className="font-display text-base tracking-wide text-foreground">Magnus</span>
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={palette.open}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Szukaj"
              >
                <Search className="h-4 w-4" />
              </button>
              <RpgDataBackupControls />
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Przełącz motyw"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Desktop top bar (search) */}
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
            <RpgDataBackupControls />
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Przełącz motyw"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto w-full">
          <div
            className={cn(
              "px-4 md:px-6 py-4 pb-20 md:pb-4",
              location.pathname.startsWith("/quests") || location.pathname.startsWith("/heroes") || location.pathname.startsWith("/rumors")
                ? "max-w-none"
                : "max-w-6xl mx-auto",
            )}
          >
            {children}
          </div>
        </main>
        <StatusBar />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {visibleTabs.map((tab) => (
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
                <SheetTitle className="font-display text-foreground">Więcej narzędzi</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 py-4">
                {visibleMore.map((link) => (
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
