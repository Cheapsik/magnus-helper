import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Home, Dice5, Target, BookOpen, Swords, User, Activity, Package, StickyNote, Wrench,
  Users, Gem, Timer, MessageSquare, Music, Network, ScrollText, Skull, BarChart3, MapPin,
} from "lucide-react";
import { useEntityDrawer } from "./EntityDrawer";
import type { SavedNpc } from "@/context/AppContext";

interface PaletteMonster {
  id: string;
  nazwa: string;
  typ?: string;
  tagi?: string[];
}

interface PaletteHero {
  id: string;
  imie?: string;
  rasa?: string;
  profesja?: string;
}

interface PaletteCtx {
  open: () => void;
}
const Ctx = createContext<PaletteCtx | null>(null);
export function useCommandPalette() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCommandPalette outside provider");
  return c;
}

const ROUTES = [
  { path: "/", label: "Start", icon: Home },
  { path: "/dice", label: "Rzut kośćmi", icon: Dice5 },
  { path: "/tests", label: "Testy", icon: Target },
  { path: "/codex", label: "Kodeks", icon: BookOpen },
  { path: "/combat", label: "Tracker walki", icon: Swords },
  { path: "/scena", label: "Scena", icon: MapPin },
  { path: "/quests", label: "Wątki", icon: Network },
  { path: "/heroes", label: "Bohaterowie", icon: ScrollText },
  { path: "/conditions", label: "Stany", icon: Activity },
  { path: "/inventory", label: "Ekwipunek", icon: Package },
  { path: "/character", label: "Postać", icon: User },
  { path: "/notes", label: "Notatki", icon: StickyNote },
  { path: "/simulations", label: "Symulacje", icon: BarChart3 },
  { path: "/npcs", label: "NPC", icon: Users },
  { path: "/loot", label: "Generator łupu", icon: Gem },
  { path: "/timers", label: "Timery", icon: Timer },
  { path: "/rumors", label: "Plotki", icon: MessageSquare },
  { path: "/ambient", label: "Ambient", icon: Music },
  { path: "/gm-toolbox", label: "Skrzynka MG", icon: Wrench },
];

function getSavedNpcName(npc: SavedNpc) {
  return npc.daneOgolne.imie || "NPC";
}

function getSavedNpcOccupation(npc: SavedNpc) {
  return npc.daneOgolne.obecnaProfesja || npc.daneOgolne.poprzedniaProfesja || "";
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { openEntity } = useEntityDrawer();
  const { savedNpcs, sessionNotes, inventory } = useApp();
  const [bestiary] = useLocalStorage<{ potwory: PaletteMonster[] }>("rpg_bestiary", { potwory: [] });
  const [heroStore] = useLocalStorage<{ heroes: PaletteHero[] }>("rpg_heroes", { heroes: [] });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  const go = useCallback((path: string) => { navigate(path); setOpen(false); }, [navigate]);
  const openE = useCallback((kind: "monster" | "npc" | "hero", id: string) => { openEntity({ kind, id }); setOpen(false); }, [openEntity]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Szukaj wszędzie — strony, potwory, NPC, bohaterowie, notatki…" />
        <CommandList>
          <CommandEmpty>Brak wyników.</CommandEmpty>

          <CommandGroup heading="Nawigacja">
            {ROUTES.map((r) => (
              <CommandItem key={r.path} value={`route ${r.label}`} onSelect={() => go(r.path)}>
                <r.icon className="mr-2 h-4 w-4 text-primary" />
                <span>{r.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {bestiary.potwory.length > 0 && (
            <CommandGroup heading="Bestiarum">
              {bestiary.potwory.map((m) => (
                <CommandItem key={m.id} value={`monster ${m.nazwa} ${m.typ} ${(m.tagi || []).join(" ")}`}
                  onSelect={() => openE("monster", m.id)}>
                  <Skull className="mr-2 h-4 w-4 text-primary" />
                  <span>{m.nazwa}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{m.typ}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {heroStore.heroes.length > 0 && (
            <CommandGroup heading="Bohaterowie">
              {heroStore.heroes.map((h) => (
                <CommandItem key={h.id} value={`hero ${h.imie} ${h.rasa} ${h.profesja}`}
                  onSelect={() => openE("hero", h.id)}>
                  <ScrollText className="mr-2 h-4 w-4 text-primary" />
                  <span>{h.imie || "Bez imienia"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{h.profesja}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {savedNpcs.length > 0 && (
            <CommandGroup heading="NPC">
              {savedNpcs.map((n) => (
                <CommandItem key={n.id} value={`npc ${getSavedNpcName(n)} ${getSavedNpcOccupation(n)}`}
                  onSelect={() => openE("npc", n.id)}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <span>{getSavedNpcName(n)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{getSavedNpcOccupation(n)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {sessionNotes.length > 0 && (
            <CommandGroup heading="Notatki">
              {sessionNotes.slice(0, 20).map((n) => (
                <CommandItem key={n.id} value={`note ${n.text}`}
                  onSelect={() => go("/notes")}>
                  <StickyNote className="mr-2 h-4 w-4 text-primary" />
                  <span className="truncate">{n.text}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {inventory.length > 0 && (
            <CommandGroup heading="Ekwipunek">
              {inventory.slice(0, 20).map((i) => (
                <CommandItem key={i.id} value={`item ${i.name} ${i.category}`}
                  onSelect={() => go("/inventory")}>
                  <Package className="mr-2 h-4 w-4 text-primary" />
                  <span>{i.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">×{i.quantity}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </Ctx.Provider>
  );
}
