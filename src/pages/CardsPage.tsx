import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Dices, FolderPlus, Plus, ScrollText, Swords, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { usePageHeader } from "@/context/PageHeaderContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CardRenderer } from "@/components/card/CardRenderer";
import { useCardType, useCards } from "@/lib/cardStore";
import {
  type Card,
  type CardKind,
  type CardTypeDef,
  CARD_KIND_LABELS,
  cardSubtitle,
  cardTitle,
  createEmptyCard,
  getCardCombatStats,
  newId,
} from "@/lib/cardSchema";
import { cardToCombatant } from "@/lib/cardRoster";
import { generateCard } from "@/lib/cardGenerator";

type CardGroup = { id: string; name: string; collapsed: boolean };

const NEW_CARD_NAME: Record<CardKind, string> = { hero: "Nowy bohater", npc: "Nowy NPC", monster: "Nowy potwór" };
const ADD_LABEL: Record<CardKind, string> = { hero: "Dodaj bohatera", npc: "Dodaj NPC", monster: "Dodaj potwora" };
const EMPTY_TEXT: Record<CardKind, string> = {
  hero: "Brak bohaterów w tej kampanii.",
  npc: "Brak NPC w tej kampanii.",
  monster: "Brak potworów w tej kampanii.",
};

/** The card list for one card kind: groups, add, open, send to combat. */
export default function CardsPage({ kind }: { kind: CardKind }) {
  const { setCombatants } = useApp();
  const cardType = useCardType(kind);
  const [cards, setCards] = useCards(kind);
  const [groups, setGroups] = useLocalStorage<CardGroup[]>(`rpg_card_groups_${kind}`, []);
  const [params, setParams] = useSearchParams();
  const activeId = params.get("id");
  const activeCard = useMemo(() => cards.find((card) => card.id === activeId) ?? null, [cards, activeId]);

  const open = (id: string | null) => setParams(id ? { id } : {}, { replace: false });

  const addCard = () => {
    const card = createEmptyCard(kind, cardType);
    setCards((prev) => [...prev, card]);
    open(card.id);
  };

  /** Fills every field that has a random rule; the GM sets those rules in the structure editor. */
  const rollCard = () => {
    const card = generateCard(kind, cardType, `Losowa karta (${CARD_KIND_LABELS[kind]})`);
    setCards((prev) => [...prev, card]);
    open(card.id);
    toast.success("Wylosowano kartę", { description: "Pola bez reguły losowania pozostały puste." });
  };

  const saveCard = (updated: Card) => setCards((prev) => prev.map((card) => (card.id === updated.id ? updated : card)));
  const deleteCard = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    if (activeId === id) open(null);
  };

  const addToCombat = (card: Card) => {
    const combatant = cardToCombatant(card, cardType, kind !== "hero");
    setCombatants((prev) => [...prev, combatant]);
    toast.success(`Dodano ${combatant.name} do walki`);
  };

  usePageHeader(
    {
      actions: activeCard ? null : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setGroups((prev) => [...prev, { id: newId(), name: "Nowa grupa", collapsed: false }])}
          >
            <FolderPlus className="h-3.5 w-3.5" /> Grupa
          </Button>
          <Button variant="outline" onClick={rollCard} title="Wypełnia pola, które mają regułę losowania">
            <Dices className="h-3.5 w-3.5" /> Losuj
          </Button>
          <Button onClick={addCard}>
            <Plus className="h-3.5 w-3.5" /> {ADD_LABEL[kind]}
          </Button>
        </div>
      ),
      meta: activeCard ? [] : [`${cards.length} ${cards.length === 1 ? "karta" : "kart"}`],
    },
    [activeCard, cards.length, kind],
  );

  if (activeCard) {
    return (
      <CardSheet
        key={activeCard.id}
        card={activeCard}
        cardType={cardType}
        groups={groups}
        onBack={() => open(null)}
        onSave={saveCard}
        onAddToCombat={() => addToCombat(activeCard)}
      />
    );
  }

  const groupIds = new Set(groups.map((group) => group.id));
  const ungrouped = cards.filter((card) => !card.groupId || !groupIds.has(card.groupId));
  const moveToGroup = (cardId: string, groupId: string | undefined) =>
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, groupId } : card)));

  const renderList = (list: Card[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((card) => (
        <CardListItem
          key={card.id}
          card={card}
          cardType={cardType}
          groups={groups}
          fallbackName={NEW_CARD_NAME[kind]}
          onOpen={() => open(card.id)}
          onCombat={() => addToCombat(card)}
          onDelete={() => deleteCard(card.id)}
          onMove={(groupId) => moveToGroup(card.id, groupId)}
        />
      ))}
    </div>
  );

  if (cards.length === 0 && groups.length === 0) {
    return (
      <div className="animate-fade-in rounded-lg border-2 border-dashed border-border p-10 text-center text-muted-foreground">
        <ScrollText className="mx-auto mb-3 h-10 w-10 opacity-60" />
        <p className="text-sm">{EMPTY_TEXT[kind]}</p>
        <p className="mt-1 text-xs">
          Układ karty zmienisz w{" "}
          <Link to="/settings?tab=karty" className="underline hover:text-foreground">
            Systemie kampanii
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {groups.map((group) => {
        const inGroup = cards.filter((card) => card.groupId === group.id);
        return (
          <section key={group.id} className="rounded-lg border border-border">
            <header className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, collapsed: !g.collapsed } : g)))
                }
                className="text-muted-foreground hover:text-foreground"
                aria-label={group.collapsed ? "Rozwiń grupę" : "Zwiń grupę"}
                aria-expanded={!group.collapsed}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", group.collapsed && "-rotate-90")} />
              </button>
              <input
                value={group.name}
                onChange={(e) =>
                  setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)))
                }
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-medium hover:border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Nazwa grupy"
              />
              <span className="text-xs text-muted-foreground">{inGroup.length}</span>
              <button
                type="button"
                onClick={() => {
                  setCards((prev) => prev.map((card) => (card.groupId === group.id ? { ...card, groupId: undefined } : card)));
                  setGroups((prev) => prev.filter((g) => g.id !== group.id));
                }}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Usuń grupę ${group.name} (karty zostają)`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </header>
            {!group.collapsed && (
              <div className="border-t border-border p-3">
                {inGroup.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Pusta grupa. Przenieś tu karty z menu na karcie.</p>
                ) : (
                  renderList(inGroup)
                )}
              </div>
            )}
          </section>
        );
      })}
      {ungrouped.length > 0 && renderList(ungrouped)}
    </div>
  );
}

function CardListItem({
  card,
  cardType,
  groups,
  fallbackName,
  onOpen,
  onCombat,
  onDelete,
  onMove,
}: {
  card: Card;
  cardType: CardTypeDef;
  groups: CardGroup[];
  fallbackName: string;
  onOpen: () => void;
  onCombat: () => void;
  onDelete: () => void;
  onMove: (groupId: string | undefined) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const name = cardTitle(card, fallbackName);
  const subtitle = cardSubtitle(cardType, card);
  const resource = getCardCombatStats(cardType, card.values).resource;

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
      onClick={onOpen}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
        {card.portrait ? <img src={card.portrait} alt="" className="h-full w-full object-cover" /> : <ScrollText className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {[subtitle, resource ? `${resource.current}/${resource.max}` : ""].filter(Boolean).join(" · ") || "Brak danych"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {groups.length > 0 && (
          <select
            value={card.groupId ?? ""}
            onChange={(e) => onMove(e.target.value || undefined)}
            className="h-8 max-w-[7rem] rounded-md border border-input bg-background px-1 text-xs"
            aria-label="Grupa"
          >
            <option value="">Bez grupy</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" variant="secondary" className="h-8 gap-1 px-2 text-xs" onClick={onCombat}>
          <Swords className="h-3 w-3" /> Walka
        </Button>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Usuń kartę ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć kartę „{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. Powiązania z notatkami, wątkami i mapą relacji przestaną działać.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardSheet({
  card,
  cardType,
  groups,
  onBack,
  onSave,
  onAddToCombat,
}: {
  card: Card;
  cardType: CardTypeDef;
  groups: CardGroup[];
  onBack: () => void;
  onSave: (card: Card) => void;
  onAddToCombat: () => void;
}) {
  const [draft, setDraft] = useState<Card>(card);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(() => {
    if (draft === card) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onSave(draft), 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the sheet must not drop the last keystrokes still waiting on the debounce.
  useEffect(() => () => onSave(latest.current), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-fade-in">
      <div className="paper-topbar">
        <button onClick={onBack} className="paper-back-btn">
          <ArrowLeft className="h-4 w-4" /> Wróć do listy
        </button>
        <h1 className="paper-title">{cardTitle(draft, `Nowa karta: ${CARD_KIND_LABELS[card.kind]}`)}</h1>
        <div className="flex items-center gap-2">
          {groups.length > 0 && (
            <select
              value={draft.groupId ?? ""}
              onChange={(e) => setDraft({ ...draft, groupId: e.target.value || undefined })}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Grupa"
            >
              <option value="">Bez grupy</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
          <Button size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={onAddToCombat}>
            <Swords className="h-3 w-3" /> Dodaj do walki
          </Button>
        </div>
      </div>
      <div className="paper-sheet">
        <CardRenderer cardType={cardType} card={draft} onChange={setDraft} />
      </div>
    </div>
  );
}
