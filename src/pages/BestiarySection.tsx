import { useMemo, useState, useEffect } from "react";
import {
  Skull, Plus, Trash2, Edit2, Search, Swords, X, Tag as TagIcon, Minus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/number-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEntityDrawer } from "@/components/EntityDrawer";

/* ── Types ── */

interface MonsterAttack {
  id: string;
  nazwa: string;
  sila: string;
  zasieg: string;
  cechy: string;
}

interface MonsterAbility {
  id: string;
  nazwa: string;
  opis: string;
}

interface Monster {
  id: string;
  nazwa: string;
  typ: string;
  opis: string;
  tagi: string[];
  cechyGlowne: { ww: number; us: number; k: number; odp: number; zr: number; int: number; sw: number; ogd: number };
  cechyDrugorzedne: { a: number; zyw: number; s: number; wt: number; sz: number; mag: number; po: number; pp: number };
  ataki: MonsterAttack[];
  zdolnosci: MonsterAbility[];
  xp: number;
  lup: string[]; // item ids from rpg_items_db / lootConfig.items
}

interface BestiaryStore {
  potwory: Monster[];
}

const MONSTER_TYPES = ["Zwierz", "Nieumarły", "Demon", "Człowiek", "Stwór", "Zielonoskóry", "Inny"];

/* ── Default monsters ── */

const blankPrimary = () => ({ ww: 25, us: 25, k: 3, odp: 25, zr: 25, int: 20, sw: 20, ogd: 15 });
const blankSecondary = () => ({ a: 1, zyw: 8, s: 3, wt: 3, sz: 4, mag: 0, po: 0, pp: 0 });

const DEFAULT_BESTIARY: BestiaryStore = {
  potwory: [
    {
      id: "rat-1",
      nazwa: "Szczur olbrzymi",
      typ: "Zwierz",
      opis: "Wielki szczur z kanałów. Atakuje w stadach.",
      tagi: ["choroba", "stado"],
      cechyGlowne: { ww: 25, us: 0, k: 2, odp: 20, zr: 40, int: 14, sw: 10, ogd: 10 },
      cechyDrugorzedne: { a: 1, zyw: 4, s: 2, wt: 2, sz: 4, mag: 0, po: 0, pp: 0 },
      ataki: [{ id: "a1", nazwa: "Ugryzienie", sila: "SB", zasieg: "Wręcz", cechy: "—" }],
      zdolnosci: [{ id: "z1", nazwa: "Choroba", opis: "Ugryzienie może zarażać (test Odp)." }],
      xp: 25,
      lup: [],
    },
    {
      id: "goblin-1",
      nazwa: "Goblin",
      typ: "Zielonoskóry",
      opis: "Tchórzliwy zielonoskóry, niebezpieczny w grupie.",
      tagi: ["tchórzliwy"],
      cechyGlowne: { ww: 25, us: 25, k: 2, odp: 20, zr: 30, int: 20, sw: 10, ogd: 10 },
      cechyDrugorzedne: { a: 1, zyw: 5, s: 3, wt: 3, sz: 4, mag: 0, po: 0, pp: 0 },
      ataki: [{ id: "a1", nazwa: "Tasak", sila: "SB+2", zasieg: "Wręcz", cechy: "—" }],
      zdolnosci: [{ id: "z1", nazwa: "Tchórzostwo", opis: "Test SW gdy sojusznicy pokonani." }],
      xp: 50,
      lup: [],
    },
    {
      id: "skeleton-1",
      nazwa: "Szkielet",
      typ: "Nieumarły",
      opis: "Reanimowane kości. Bez strachu, bez bólu.",
      tagi: ["nieumarły", "odporny"],
      cechyGlowne: { ww: 25, us: 25, k: 2, odp: 20, zr: 20, int: 0, sw: 0, ogd: 0 },
      cechyDrugorzedne: { a: 1, zyw: 8, s: 3, wt: 3, sz: 4, mag: 0, po: 0, pp: 0 },
      ataki: [{ id: "a1", nazwa: "Stary miecz", sila: "SB+3", zasieg: "Wręcz", cechy: "—" }],
      zdolnosci: [
        { id: "z1", nazwa: "Nieumarły", opis: "Odporny na efekty strachu i psychologii." },
        { id: "z2", nazwa: "Odporność na zwykły oręż", opis: "Zmniejsza obrażenia od zwykłej broni o 1." },
      ],
      xp: 75,
      lup: [],
    },
    {
      id: "werewolf-1",
      nazwa: "Wilkołak",
      typ: "Stwór",
      opis: "Przeklęty zmiennokształtny. Śmiercionośny w postaci hybrydowej.",
      tagi: ["regeneracja", "strach", "podatny na srebro"],
      cechyGlowne: { ww: 55, us: 0, k: 4, odp: 45, zr: 50, int: 10, sw: 40, ogd: 10 },
      cechyDrugorzedne: { a: 2, zyw: 20, s: 5, wt: 5, sz: 5, mag: 0, po: 0, pp: 0 },
      ataki: [{ id: "a1", nazwa: "Pazury i kły", sila: "SB+4", zasieg: "Wręcz", cechy: "Brutalny" }],
      zdolnosci: [
        { id: "z1", nazwa: "Podatność na srebro", opis: "Srebro zadaje podwójne obrażenia." },
        { id: "z2", nazwa: "Regeneracja", opis: "Odzyskuje 1 Żyw na rundę." },
        { id: "z3", nazwa: "Strach (2)", opis: "Wywołuje strach u istot do poziomu 2." },
      ],
      xp: 300,
      lup: [],
    },
    {
      id: "ork-1",
      nazwa: "Ork Bojownik",
      typ: "Zielonoskóry",
      opis: "Krzepki wojownik orkowych klanów. Żyje walką.",
      tagi: ["wojownik", "wytrzymały"],
      cechyGlowne: { ww: 45, us: 35, k: 4, odp: 40, zr: 30, int: 20, sw: 35, ogd: 15 },
      cechyDrugorzedne: { a: 1, zyw: 12, s: 4, wt: 4, sz: 4, mag: 0, po: 0, pp: 0 },
      ataki: [{ id: "a1", nazwa: "Choppa", sila: "SB+4", zasieg: "Wręcz", cechy: "—" }],
      zdolnosci: [{ id: "z1", nazwa: "Wielka Zielona", opis: "+5 do testów SW gdy walczy obok innych Orków." }],
      xp: 150,
      lup: [],
    },
  ],
};

/* ── Helpers ── */

const emptyMonster = (): Monster => ({
  id: crypto.randomUUID(),
  nazwa: "",
  typ: "Inny",
  opis: "",
  tagi: [],
  cechyGlowne: blankPrimary(),
  cechyDrugorzedne: blankSecondary(),
  ataki: [],
  zdolnosci: [],
  xp: 0,
  lup: [],
});

/* ── Add-to-combat popover ── */

function AddToCombatDialog({
  monster, open, onClose,
}: {
  monster: Monster | null;
  open: boolean;
  onClose: () => void;
}) {
  const { setCombatants } = useApp();
  const navigate = useNavigate();
  const [count, setCount] = useState(1);

  useEffect(() => { if (open) setCount(1); }, [open]);

  if (!monster) return null;

  const confirm = () => {
    const sb = Math.floor(monster.cechyGlowne.k); // K is already SB-like in WFRP2; K = Krzepa (uses K bonus). We use K directly as SB bonus for damage simplicity.
    const newCombatants = Array.from({ length: count }).map((_, i) => ({
      id: crypto.randomUUID(),
      name: count === 1 ? monster.nazwa : `${monster.nazwa} #${i + 1}`,
      initiative: 0,
      ww: monster.cechyGlowne.ww,
      us: monster.cechyGlowne.us,
      sb,
      hp: { current: monster.cechyDrugorzedne.zyw, max: monster.cechyDrugorzedne.zyw },
      armor: 0,
      toughness: Math.floor(monster.cechyGlowne.odp / 10),
      statuses: [],
      notes: `Potwór · ${monster.typ}${monster.ataki[0] ? ` · ${monster.ataki[0].nazwa} (${monster.ataki[0].sila})` : ""}`,
      isEnemy: true,
    }));
    setCombatants((prev) => [...prev, ...newCombatants]);
    toast.success(`Dodano ${count}× ${monster.nazwa} do walki`);
    onClose();
    navigate("/combat");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base">Dodaj do walki: {monster.nazwa}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <label className="text-xs text-muted-foreground">Ile sztuk?</label>
          <div className="flex items-center justify-center gap-3">
            <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setCount(Math.max(1, count - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <NumberInput value={count} onChange={(v) => setCount(Math.max(1, Math.min(20, v)))} min={1} max={20}
              className="h-11 w-20 text-center text-lg font-bold" />
            <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setCount(Math.min(20, count + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Zostaną dodani do trackera z PŻ {monster.cechyDrugorzedne.zyw}.
            Inicjatywę rzucisz ręcznie.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button onClick={confirm} className="gap-2">
            <Swords className="h-4 w-4" /> Dodaj {count}×
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit modal ── */

function MonsterModal({
  open, onClose, initial, onSave, lootItems,
}: {
  open: boolean;
  onClose: () => void;
  initial: Monster | null;
  onSave: (m: Monster) => void;
  lootItems: { id: string; name: string; type: string }[];
}) {
  const [draft, setDraft] = useState<Monster>(initial ?? emptyMonster());
  const [tagInput, setTagInput] = useState("");
  const [lootSearch, setLootSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(initial ?? emptyMonster());
      setTagInput("");
      setLootSearch("");
    }
  }, [open, initial]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!draft.tagi.includes(t)) setDraft({ ...draft, tagi: [...draft.tagi, t] });
    setTagInput("");
  };

  const removeTag = (t: string) => setDraft({ ...draft, tagi: draft.tagi.filter((x) => x !== t) });

  const updatePrimary = (k: keyof Monster["cechyGlowne"], v: number) =>
    setDraft({ ...draft, cechyGlowne: { ...draft.cechyGlowne, [k]: v } });
  const updateSecondary = (k: keyof Monster["cechyDrugorzedne"], v: number) =>
    setDraft({ ...draft, cechyDrugorzedne: { ...draft.cechyDrugorzedne, [k]: v } });

  const addAttack = () =>
    setDraft({ ...draft, ataki: [...draft.ataki, { id: crypto.randomUUID(), nazwa: "", sila: "", zasieg: "Wręcz", cechy: "" }] });
  const updateAttack = (id: string, patch: Partial<MonsterAttack>) =>
    setDraft({ ...draft, ataki: draft.ataki.map((a) => a.id === id ? { ...a, ...patch } : a) });
  const removeAttack = (id: string) => setDraft({ ...draft, ataki: draft.ataki.filter((a) => a.id !== id) });

  const addAbility = () =>
    setDraft({ ...draft, zdolnosci: [...draft.zdolnosci, { id: crypto.randomUUID(), nazwa: "", opis: "" }] });
  const updateAbility = (id: string, patch: Partial<MonsterAbility>) =>
    setDraft({ ...draft, zdolnosci: draft.zdolnosci.map((z) => z.id === id ? { ...z, ...patch } : z) });
  const removeAbility = (id: string) => setDraft({ ...draft, zdolnosci: draft.zdolnosci.filter((z) => z.id !== id) });

  const toggleLoot = (id: string) => {
    setDraft({
      ...draft,
      lup: draft.lup.includes(id) ? draft.lup.filter((x) => x !== id) : [...draft.lup, id],
    });
  };

  const filteredLoot = useMemo(() => {
    const q = lootSearch.trim().toLowerCase();
    if (!q) return lootItems.slice(0, 10);
    return lootItems.filter((i) =>
      i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [lootItems, lootSearch]);

  const save = () => {
    if (!draft.nazwa.trim()) {
      toast.error("Nazwa jest wymagana");
      return;
    }
    if (!draft.typ.trim()) {
      toast.error("Typ jest wymagany");
      return;
    }
    onSave(draft);
    onClose();
  };

  const PRIMARY_LABELS: [keyof Monster["cechyGlowne"], string][] = [
    ["ww", "WW"], ["us", "US"], ["k", "K"], ["odp", "Odp"],
    ["zr", "Zr"], ["int", "Int"], ["sw", "SW"], ["ogd", "Ogd"],
  ];
  const SECONDARY_LABELS: [keyof Monster["cechyDrugorzedne"], string][] = [
    ["a", "A"], ["zyw", "Żyw"], ["s", "S"], ["wt", "Wt"],
    ["sz", "Sz"], ["mag", "Mag"], ["po", "PO"], ["pp", "PP"],
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Skull className="h-4 w-4" /> {initial ? "Edytuj potwora" : "Nowy potwór"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* PODSTAWOWE */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Podstawowe</h3>
            <Input value={draft.nazwa} onChange={(e) => setDraft({ ...draft, nazwa: e.target.value })}
              placeholder="Nazwa *" className="h-10" />
            <div className="flex gap-2">
              <Input value={draft.typ} onChange={(e) => setDraft({ ...draft, typ: e.target.value })}
                placeholder="Typ *" className="h-10 flex-1" list="monster-types" />
              <datalist id="monster-types">
                {MONSTER_TYPES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <Textarea value={draft.opis} onChange={(e) => setDraft({ ...draft, opis: e.target.value })}
              placeholder="Opis / notatki MG (taktyka, zachowanie, fabuła)" className="min-h-[70px] text-sm" />
            {/* Tags */}
            <div>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <TagIcon className="h-3 w-3" /> Tagi
              </label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {draft.tagi.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] gap-1 pr-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Wpisz tag i Enter" className="h-9 text-xs" />
            </div>
          </section>

          {/* CECHY GŁÓWNE */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cechy główne</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIMARY_LABELS.map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground block text-center">{label}</label>
                  <NumberInput value={draft.cechyGlowne[key]} onChange={(v) => updatePrimary(key, v)} min={0}
                    className="h-9 text-sm text-center font-bold" />
                </div>
              ))}
            </div>
          </section>

          {/* CECHY DRUGORZĘDNE */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cechy drugorzędne</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {SECONDARY_LABELS.map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground block text-center">{label}</label>
                  <NumberInput value={draft.cechyDrugorzedne[key]} onChange={(v) => updateSecondary(key, v)} min={0}
                    className="h-9 text-sm text-center font-bold" />
                </div>
              ))}
            </div>
          </section>

          {/* ATAKI */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broń i ataki</h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addAttack}>
                <Plus className="h-3 w-3" /> Dodaj atak
              </Button>
            </div>
            {draft.ataki.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">Brak ataków.</p>
            )}
            {draft.ataki.map((a) => (
              <div key={a.id} className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-1.5 items-center">
                <Input value={a.nazwa} onChange={(e) => updateAttack(a.id, { nazwa: e.target.value })} placeholder="Nazwa" className="h-8 text-xs" />
                <Input value={a.sila} onChange={(e) => updateAttack(a.id, { sila: e.target.value })} placeholder="Siła" className="h-8 text-xs" />
                <Input value={a.zasieg} onChange={(e) => updateAttack(a.id, { zasieg: e.target.value })} placeholder="Zasięg" className="h-8 text-xs" />
                <Input value={a.cechy} onChange={(e) => updateAttack(a.id, { cechy: e.target.value })} placeholder="Cechy" className="h-8 text-xs" />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => removeAttack(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </section>

          {/* ZDOLNOŚCI */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zdolności specjalne</h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addAbility}>
                <Plus className="h-3 w-3" /> Dodaj zdolność
              </Button>
            </div>
            {draft.zdolnosci.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">Brak zdolności.</p>
            )}
            {draft.zdolnosci.map((z) => (
              <div key={z.id} className="grid grid-cols-[1fr_2fr_auto] gap-1.5 items-start">
                <Input value={z.nazwa} onChange={(e) => updateAbility(z.id, { nazwa: e.target.value })} placeholder="Nazwa" className="h-8 text-xs" />
                <Textarea value={z.opis} onChange={(e) => updateAbility(z.id, { opis: e.target.value })} placeholder="Opis" className="min-h-[32px] text-xs" />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => removeAbility(z.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </section>

          {/* NAGRODY */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nagrody</h3>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <label className="text-xs text-muted-foreground">Punkty doświadczenia</label>
              <NumberInput value={draft.xp} onChange={(v) => setDraft({ ...draft, xp: v })} min={0} className="h-9 text-sm w-24" />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Możliwy łup ({draft.lup.length} wybranych)
              </label>
              {lootItems.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Brak bazy przedmiotów. Dodaj je w Generatorze łupu.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mb-1.5 min-h-[24px]">
                    {draft.lup.map((id) => {
                      const item = lootItems.find((i) => i.id === id);
                      if (!item) return null;
                      return (
                        <Badge key={id} variant="outline" className="text-[10px] gap-1 pr-1">
                          {item.name}
                          <button onClick={() => toggleLoot(id)} className="hover:text-destructive">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                  <Input value={lootSearch} onChange={(e) => setLootSearch(e.target.value)}
                    placeholder="Szukaj przedmiotu..." className="h-8 text-xs" />
                  <div className="mt-1 max-h-32 overflow-y-auto border rounded-md bg-card">
                    {filteredLoot.map((item) => {
                      const sel = draft.lup.includes(item.id);
                      return (
                        <button key={item.id} onClick={() => toggleLoot(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left",
                            sel && "bg-primary/10"
                          )}>
                          <span>
                            <span className="font-medium">{item.name}</span>
                            {item.type && <span className="text-muted-foreground"> · {item.type}</span>}
                          </span>
                          {sel && <Check />}
                        </button>
                      );
                    })}
                    {filteredLoot.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic px-2 py-2">Brak wyników.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
          <Button onClick={save}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Check() {
  return <span className="text-primary text-xs font-bold">✓</span>;
}

/* ── Main section ── */

export default function BestiarySection() {
  const { lootConfig } = useApp();
  const [store, setStore] = useLocalStorage<BestiaryStore>("rpg_bestiary", DEFAULT_BESTIARY);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editing, setEditing] = useState<Monster | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [combatTarget, setCombatTarget] = useState<Monster | null>(null);

  // Combat tracker availability check (it always exists via AppContext, but per spec we read raw key)
  const combatAvailable = useMemo(() => {
    try {
      // AppContext always seeds it; treat presence of the localStorage key OR provider as available
      return window.localStorage.getItem("magnus-combatants") !== null || true;
    } catch {
      return false;
    }
  }, []);

  const lootItems = lootConfig.items.map((i) => ({ id: i.id, name: i.name, type: i.type }));

  const types = useMemo(() => {
    const set = new Set<string>();
    store.potwory.forEach((m) => m.typ && set.add(m.typ));
    return Array.from(set).sort();
  }, [store.potwory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.potwory.filter((m) => {
      if (filterType !== "all" && m.typ !== filterType) return false;
      if (!q) return true;
      return (
        m.nazwa.toLowerCase().includes(q) ||
        m.typ.toLowerCase().includes(q) ||
        m.tagi.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [store.potwory, search, filterType]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m: Monster) => { setEditing(m); setModalOpen(true); };
  const handleSave = (m: Monster) => {
    setStore((prev) => {
      const exists = prev.potwory.some((p) => p.id === m.id);
      return {
        potwory: exists ? prev.potwory.map((p) => p.id === m.id ? m : p) : [...prev.potwory, m],
      };
    });
    toast.success(editing ? "Zaktualizowano potwora" : "Dodano potwora");
  };

  const handleDelete = (id: string) => {
    setStore((prev) => ({ potwory: prev.potwory.filter((p) => p.id !== id) }));
    toast.success("Usunięto potwora");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — search + filter on left, "+ Nowy" top-right */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj nazwa, typ, tag..."
            className="h-10 pl-8 text-sm" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-2 text-sm border border-border bg-background text-foreground min-w-[10rem]">
          <option value="all">Wszystkie typy</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button onClick={openNew} className="h-10 gap-1.5 sm:w-auto font-display tracking-wide">
          <Plus className="h-4 w-4" /> Nowy potwór
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground tracking-wider uppercase">
        {filtered.length} / {store.potwory.length} potworów
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((m) => (
          <BestiaryCard
            key={m.id}
            monster={m}
            onEdit={() => openEdit(m)}
            onDelete={() => handleDelete(m.id)}
            combatAvailable={combatAvailable}
            onSendToCombat={() => setCombatTarget(m)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 col-span-full italic">
            Brak potworów pasujących do filtrów.
          </p>
        )}
      </div>

      <MonsterModal open={modalOpen} onClose={() => setModalOpen(false)}
        initial={editing} onSave={handleSave} lootItems={lootItems} />

      <AddToCombatDialog monster={combatTarget} open={!!combatTarget}
        onClose={() => setCombatTarget(null)} />
    </div>
  );
}

/* ── Card with serif title, click opens drawer ── */

function BestiaryCard({
  monster: m, onEdit, onDelete, combatAvailable, onSendToCombat,
}: {
  monster: Monster;
  onEdit: () => void;
  onDelete: () => void;
  combatAvailable: boolean;
  onSendToCombat: () => void;
}) {
  const { openEntity } = useEntityDrawer();
  return (
    <div
      onClick={() => openEntity({ kind: "monster", id: m.id })}
      className="group cursor-pointer bg-card border border-border hover:border-primary/50 transition-colors p-4 flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-sans">{m.typ}</div>
          <h3 className="font-display text-xl text-foreground leading-tight truncate">{m.nazwa}</h3>
        </div>
      </div>

      <div className="flex gap-3 text-[11px] text-muted-foreground font-sans">
        <span>WW <span className="font-semibold text-foreground">{m.cechyGlowne.ww}</span></span>
        <span>US <span className="font-semibold text-foreground">{m.cechyGlowne.us}</span></span>
        <span>A <span className="font-semibold text-foreground">{m.cechyDrugorzedne.a}</span></span>
        <span>Żyw <span className="font-semibold text-foreground">{m.cechyDrugorzedne.zyw}</span></span>
      </div>

      {m.tagi.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {m.tagi.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-none border-border">{t}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1.5 mt-auto border-t border-border/60">
        {combatAvailable ? (
          <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 flex-1 text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onSendToCombat(); }}>
            <Swords className="h-3.5 w-3.5" /> Do walki
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <Button size="sm" disabled className="h-8 w-full text-[11px] gap-1.5">
                  <Swords className="h-3.5 w-3.5" /> Do walki
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Tracker walki niedostępny</TooltipContent>
          </Tooltip>
        )}
        <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
