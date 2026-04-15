import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Home, Dice5, Target, BookOpen, MoreHorizontal, Sun, Moon,
  Swords, User, BarChart3, Activity, Package, StickyNote, Wrench, Users, Gem, Timer, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Logo from "@/components/Logo";

const NAV_TABS = [
  { path: "/", label: "Start", icon: Home },
  { path: "/dice", label: "Kości", icon: Dice5 },
  { path: "/tests", label: "Testy", icon: Target },
  { path: "/codex", label: "Kodeks", icon: BookOpen },
];

const MORE_LINKS = [
  { path: "/combat", label: "Tracker walki", icon: Swords },
  
  { path: "/conditions", label: "Stany", icon: Activity },
  { path: "/inventory", label: "Ekwipunek", icon: Package },
  { path: "/character", label: "Postać", icon: User },
  { path: "/notes", label: "Notatki", icon: StickyNote },
  { path: "/simulations", label: "Symulacje", icon: BarChart3 },
  { path: "/npcs", label: "NPC", icon: Users },
  { path: "/loot", label: "Generator łupu", icon: Gem },
  { path: "/timers", label: "Timery", icon: Timer },
  { path: "/rumors", label: "Plotki", icon: MessageSquare },
  { path: "/gm-toolbox", label: "Skrzynka MG", icon: Wrench },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isMoreActive = MORE_LINKS.some((l) => isActive(l.path));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-12 max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold text-sm tracking-wide text-foreground">Magnus Helper</span>
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Przełącz motyw"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 max-w-4xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-pb">
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
