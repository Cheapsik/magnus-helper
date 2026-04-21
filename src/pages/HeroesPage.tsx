import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ArrowLeft, Plus, Trash2, ScrollText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Hero } from "@/components/character-sheet/types";
import { CharacterSheet } from "@/components/character-sheet/CharacterSheet";
import { createEmptyHero, defaultKampania } from "@/components/character-sheet/factory";

export default function HeroesPage() {
  const [heroes, setHeroes] = useLocalStorage<Hero[]>("rpg_characters", []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeHero = useMemo(() => heroes.find((h) => h.id === activeId) ?? null, [heroes, activeId]);

  const addHero = () => {
    const h = createEmptyHero();
    setHeroes((prev) => [...prev, h]);
    setActiveId(h.id);
  };

  const deleteHero = (id: string) => {
    setHeroes((prev) => prev.filter((h) => h.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateHero = (updated: Hero) => {
    setHeroes((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  if (activeHero) {
    return <HeroSheet hero={activeHero} onBack={() => setActiveId(null)} onSave={updateHero} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Bohaterowie</h1>
        <button
          type="button"
          onClick={addHero}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Dodaj Bohatera
        </button>
      </div>

      {heroes.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="text-sm">Brak postaci. Kliknij „Dodaj Bohatera”, aby utworzyć nową kartę.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heroes.map((h) => (
            <div
              key={h.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveId(h.id);
              }}
              className="group bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setActiveId(h.id)}
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <ScrollText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{h.daneOgolne.imie || "Nowy bohater"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[h.daneOgolne.rasa, h.daneOgolne.obecnaProfesja].filter(Boolean).join(" · ") || "Brak danych"}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Usuń"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć postać?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tej operacji nie można cofnąć. Karta „{h.daneOgolne.imie || "Nowy bohater"}” zostanie trwale usunięta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteHero(h.id)}>Usuń</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HeroSheet({ hero, onBack, onSave }: { hero: Hero; onBack: () => void; onSave: (h: Hero) => void }) {
  const [draft, setDraft] = useState<Hero>(hero);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setDraft({
      ...hero,
      kampania: { ...defaultKampania(), ...hero.kampania },
    });
  }, [hero.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(draft), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="paper-sheet animate-fade-in">
      <div className="paper-topbar">
        <button type="button" onClick={onBack} className="paper-back-btn min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Wróć do listy
        </button>
        <h1 className="paper-title m-0">Karta Postaci: {draft.daneOgolne.imie || "—"}</h1>
      </div>

      <CharacterSheet variant="hero" value={draft} onChange={setDraft} />
    </div>
  );
}
