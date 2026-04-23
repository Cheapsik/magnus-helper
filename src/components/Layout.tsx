import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Home, Dice5, Target, BookOpen, MoreHorizontal, Sun, Moon,
  Swords, User, BarChart3, Activity, Package, StickyNote, Wrench, Users, Timer, MessageSquare, Store,
  Music,
  ClipboardList,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import RpgDataBackupControls from "@/components/RpgDataBackupControls";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useDrawer } from "@/context/DrawerContext";

const faviconSrc = `${import.meta.env.BASE_URL}favicon.png`;

const NAV_TABS = [
  { path: "/", label: "Start", icon: Home },
  { path: "/dice", label: "Kości", icon: Dice5 },
  { path: "/tests", label: "Testy", icon: Target },
  { path: "/codex", label: "Kodeks", icon: BookOpen },
];

const MORE_LINKS = [
  { path: "/combat", label: "Tracker walki", icon: Swords },
  { path: "/conditions", label: "Stany", icon: Activity },
  { path: "/inventory", label: "Ekwipunek i łup", icon: Package },
  { path: "/shop", label: "Sklep", icon: Store },
  { path: "/character", label: "Postać", icon: User },
  { path: "/notes", label: "Notatki", icon: StickyNote },
  { path: "/simulations", label: "Symulacje", icon: BarChart3 },
  { path: "/npcs", label: "NPC", icon: Users },
  { path: "/timers", label: "Timery", icon: Timer },
  { path: "/rumors", label: "Plotki", icon: MessageSquare },
  { path: "/ambient", label: "Soundboard", icon: Music },
  { path: "/quests", label: "Wątki", icon: ClipboardList },
  { path: "/gm-toolbox", label: "Skrzynka MG", icon: Wrench },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { open: openCommandPalette, isOpen: isCommandPaletteOpen } = useCommandPalette();
  const { isOpen: isDrawerOpen } = useDrawer();
  const [moreOpen, setMoreOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCommandPalette]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isMoreActive = MORE_LINKS.some((l) => isActive(l.path));

  const isQuestsFullWidth =
    location.pathname === "/quests" || location.pathname.startsWith("/quests/");

  const isWideSheet =
    location.pathname === "/npcs" || location.pathname.startsWith("/npcs/");

  const isDesktop = windowWidth >= 768;
  const shouldPushLayout = isDrawerOpen && windowWidth >= 1200;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div
          className={cn(
            "flex items-center justify-between px-4 h-12 w-full",
            !isQuestsFullWidth && isWideSheet && "max-w-none",
            !isQuestsFullWidth && !isWideSheet && "max-w-4xl mx-auto",
          )}
        >
          <Link to="/" className="flex items-center gap-2">
            <img
              src={faviconSrc}
              alt=""
              width={28}
              height={28}
              decoding="async"
              className="h-7 w-7 shrink-0 rounded-sm object-cover"
              aria-hidden
            />
            <span className="font-semibold text-sm tracking-wide text-foreground">Magnus Helper</span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {isDesktop && (
              <button
                type="button"
                onClick={openCommandPalette}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-foreground",
                )}
                aria-label="Szukaj"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Szukaj...</span>
                <span className="hidden md:inline">⌘K</span>
              </button>
            )}
            <RpgDataBackupControls />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Przełącz motyw"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "flex-1 w-full px-4 pt-4 pb-4",
          shouldPushLayout && "pr-[440px] transition-[padding] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isQuestsFullWidth && "max-w-none",
          !isQuestsFullWidth && isWideSheet && "max-w-none",
          !isQuestsFullWidth && !isWideSheet && "max-w-4xl mx-auto",
        )}
      >
        {children}
      </main>

      <div
        aria-hidden
        className="pointer-events-none w-full shrink-0 select-none"
        style={{
          height: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-w-[56px]",
                isActive(tab.path) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={openCommandPalette}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-w-[56px]",
              isCommandPaletteOpen ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Szukaj"
          >
            <Search className="h-5 w-5" />
            <span>Szukaj</span>
          </button>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-w-[56px]",
                isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                <MoreHorizontal className="h-5 w-5" />
                <span>Więcej</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
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
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors",
                      isActive(link.path) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                    )}
                  >
                    <link.icon className="h-4.5 w-4.5" />
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
