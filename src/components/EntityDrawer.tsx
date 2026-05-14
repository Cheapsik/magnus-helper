import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Swords, Edit2, Trash2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SavedNpc } from "@/context/AppContext";
import { getNpcCombatStats } from "@/components/character-sheet/npcAccessors";
import { StatAbbrWithTooltip } from "@/components/game/StatAbbrWithTooltip";

export type EntityKind = "monster" | "npc" | "hero" | "quest" | "item";

interface DrawerMonsterAttack {
  id: string;
  nazwa: string;
  sila?: string;
  zasieg?: string;
  cechy?: string;
}

interface DrawerMonsterAbility {
  id: string;
  nazwa: string;
  opis?: string;
}

interface DrawerMonster {
  id: string;
  nazwa: string;
  typ?: string;
  opis?: string;
  cechyGlowne?: Partial<Record<"ww" | "us" | "k" | "odp" | "zr" | "int" | "sw" | "ogd", number>>;
  cechyDrugorzedne?: Partial<Record<"a" | "zyw" | "s" | "wt", number>>;
  ataki?: DrawerMonsterAttack[];
  zdolnosci?: DrawerMonsterAbility[];
  tagi?: string[];
}

interface DrawerHero {
  id: string;
  imie?: string;
  rasa?: string;
  profesja?: string;
  plec?: string;
}

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

interface DrawerCtx {
  openEntity: (ref: EntityRef) => void;
  close: () => void;
}

const Ctx = createContext<DrawerCtx | null>(null);

export function useEntityDrawer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEntityDrawer must be used within EntityDrawerProvider");
  return c;
}

/* ── Internal data lookups ── */

function useMonsterById(id: string | null) {
  const [store] = useLocalStorage<{ potwory: DrawerMonster[] }>("rpg_bestiary", { potwory: [] });
  return useMemo(() => (id ? store.potwory.find((m) => m.id === id) ?? null : null), [store, id]);
}

function useHeroById(id: string | null) {
  const [store] = useLocalStorage<{ heroes: DrawerHero[] }>("rpg_heroes", { heroes: [] });
  return useMemo(() => (id ? store.heroes.find((h) => h.id === id) ?? null : null), [store, id]);
}

/* ── Per-kind body renderers ── */

function MonsterBody({ id, onClose }: { id: string; onClose: () => void }) {
  const m = useMonsterById(id);
  const { setCombatants } = useApp();
  const navigate = useNavigate();
  const [notes, setNotes] = useLocalStorage<Record<string, string>>("rpg_drawer_notes_monster", {});

  if (!m) return <p className="text-sm text-muted-foreground p-4">Nie znaleziono potwora.</p>;

  const sendToCombat = () => {
    setCombatants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: m.nazwa,
        initiative: 0,
        ww: m.cechyGlowne?.ww ?? 25,
        us: m.cechyGlowne?.us ?? 0,
        sb: Math.floor((m.cechyGlowne?.k ?? 3)),
        hp: { current: m.cechyDrugorzedne?.zyw ?? 5, max: m.cechyDrugorzedne?.zyw ?? 5 },
        armor: 0,
        toughness: Math.floor((m.cechyGlowne?.odp ?? 25) / 10),
        statuses: [],
        notes: `${m.typ}${m.ataki?.[0] ? ` · ${m.ataki[0].nazwa}` : ""}`,
        isEnemy: true,
      },
    ]);
    toast.success(`Dodano ${m.nazwa} do walki`);
    onClose();
    navigate("/combat");
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/40 text-primary">
          {m.typ}
        </Badge>
        <h2 className="text-3xl mt-2 leading-tight text-foreground">{m.nazwa}</h2>
        {m.opis && <p className="text-sm text-muted-foreground mt-2 italic">{m.opis}</p>}
      </div>

      <div className="gold-divider" />

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Cechy główne</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            ["WW", m.cechyGlowne?.ww], ["US", m.cechyGlowne?.us], ["K", m.cechyGlowne?.k], ["Odp", m.cechyGlowne?.odp],
            ["Zr", m.cechyGlowne?.zr], ["Int", m.cechyGlowne?.int], ["SW", m.cechyGlowne?.sw], ["Ogd", m.cechyGlowne?.ogd],
          ] as const).map(([l, v]) => (
            <div key={l} className="border border-border bg-secondary/30 py-1.5">
              <div className="text-[9px] uppercase text-muted-foreground tracking-wider">
                <StatAbbrWithTooltip abbr={l} className="text-[9px] uppercase text-muted-foreground tracking-wider">{l}</StatAbbrWithTooltip>
              </div>
              <div className="text-lg text-foreground">{v ?? "—"}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Cechy drugorzędne</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            ["A", m.cechyDrugorzedne?.a], ["Żyw", m.cechyDrugorzedne?.zyw],
            ["S", m.cechyDrugorzedne?.s], ["Wt", m.cechyDrugorzedne?.wt],
          ] as const).map(([l, v]) => (
            <div key={l} className="border border-border bg-secondary/30 py-1.5">
              <div className="text-[9px] uppercase text-muted-foreground tracking-wider">
                <StatAbbrWithTooltip abbr={l} className="text-[9px] uppercase text-muted-foreground tracking-wider">{l}</StatAbbrWithTooltip>
              </div>
              <div className="text-lg text-foreground">{v ?? "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {m.ataki?.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Ataki</h3>
          <ul className="space-y-1.5">
            {m.ataki.map((a) => (
              <li key={a.id} className="text-sm border-l-2 border-primary/60 pl-2">
                <span className="font-medium text-foreground">{a.nazwa}</span>
                <span className="text-muted-foreground"> — {a.sila}, {a.zasieg}{a.cechy && a.cechy !== "—" ? ` · ${a.cechy}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {m.zdolnosci?.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Zdolności</h3>
          <ul className="space-y-1.5">
            {m.zdolnosci.map((z) => (
              <li key={z.id} className="text-sm">
                <span className="font-medium text-foreground">{z.nazwa}.</span>
                <span className="text-muted-foreground"> {z.opis}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {m.tagi?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.tagi.map((t: string) => (
            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
          ))}
        </div>
      )}

      <div className="gold-divider" />

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">Notatka MG</h3>
        <Textarea
          value={notes[id] ?? ""}
          onChange={(e) => setNotes({ ...notes, [id]: e.target.value })}
          placeholder="Taktyka, fabuła, hooks…"
          className="min-h-[100px] text-sm"
        />
      </section>

      <Button onClick={sendToCombat} size="lg" className="w-full gap-2 text-base">
        <Swords className="h-5 w-5" /> Wyślij do Walki
      </Button>
    </div>
  );
}

function HeroBody({ id, onClose }: { id: string; onClose: () => void }) {
  const h = useHeroById(id);
  const navigate = useNavigate();
  if (!h) return <p className="text-sm text-muted-foreground p-4">Nie znaleziono postaci.</p>;
  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/40 text-primary">
          {h.profesja || h.rasa || "Bohater"}
        </Badge>
        <h2 className="text-3xl mt-2 leading-tight text-foreground">{h.imie || "Bez imienia"}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {[h.rasa, h.profesja, h.plec].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="gold-divider" />
      <Button
        onClick={() => { navigate("/heroes"); onClose(); }}
        className="w-full gap-2 text-base"
        size="lg"
      >
        <Edit2 className="h-4 w-4" /> Otwórz pełną kartę
      </Button>
    </div>
  );
}

function getNpcName(npc: SavedNpc) {
  return npc.daneOgolne.imie || "NPC";
}

function getNpcOccupation(npc: SavedNpc) {
  return npc.daneOgolne.obecnaProfesja || npc.daneOgolne.poprzedniaProfesja || "";
}

function NpcBody({ id, onClose }: { id: string; onClose: () => void }) {
  const { savedNpcs, setCombatants } = useApp();
  const navigate = useNavigate();
  const npc = savedNpcs.find((n) => n.id === id);
  if (!npc) return <p className="text-sm text-muted-foreground p-4">Nie znaleziono NPC.</p>;
  const name = getNpcName(npc);
  const occupation = getNpcOccupation(npc);
  const stats = getNpcCombatStats(npc);
  const send = () => {
    setCombatants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        initiative: stats.initiative,
        ww: stats.ww,
        us: stats.us,
        sb: stats.sb,
        hp: { current: stats.hp, max: Math.max(1, stats.hpMax) },
        armor: stats.armor,
        toughness: stats.toughness,
        statuses: [],
        notes: [occupation, npc.notatkiMG, stats.notes].filter(Boolean).join(" · ") || stats.weapon,
        isEnemy: true,
      },
    ]);
    toast.success(`Dodano ${name} do walki`);
    onClose(); navigate("/combat");
  };
  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-primary/40 text-primary">NPC</Badge>
        <h2 className="text-3xl mt-2 leading-tight text-foreground">{name}</h2>
        <p className="text-sm text-muted-foreground italic">{occupation}</p>
      </div>
      {npc.opisOgolny && <p className="text-sm text-muted-foreground">{npc.opisOgolny}</p>}
      {npc.notatkiMG && (
        <p className="text-sm border-l-2 border-primary/60 pl-2 text-foreground/90">{npc.notatkiMG}</p>
      )}
      <div className="gold-divider" />
      <Button onClick={send} size="lg" className="w-full gap-2 text-base">
        <Swords className="h-5 w-5" /> Wyślij do Walki
      </Button>
    </div>
  );
}

function GenericBody({ kind, id, onClose }: { kind: EntityKind; id: string; onClose: () => void }) {
  return (
    <div className="p-5 text-sm text-muted-foreground">
      Brak podglądu dla typu „{kind}" (id: {id}).
    </div>
  );
}

/* ── Provider ── */

export function EntityDrawerProvider({ children }: { children: ReactNode }) {
  const [ref, setRef] = useState<EntityRef | null>(null);

  const openEntity = useCallback((r: EntityRef) => setRef(r), []);
  const close = useCallback(() => setRef(null), []);

  const value = useMemo(() => ({ openEntity, close }), [openEntity, close]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={!!ref} onOpenChange={(o) => !o && close()}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-[420px] p-0 overflow-y-auto",
            "border-l border-primary/30 bg-card"
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Szczegóły</SheetTitle>
          </SheetHeader>
          {ref?.kind === "monster" && <MonsterBody id={ref.id} onClose={close} />}
          {ref?.kind === "hero" && <HeroBody id={ref.id} onClose={close} />}
          {ref?.kind === "npc" && <NpcBody id={ref.id} onClose={close} />}
          {ref && !["monster", "hero", "npc"].includes(ref.kind) && (
            <GenericBody kind={ref.kind} id={ref.id} onClose={close} />
          )}
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}
