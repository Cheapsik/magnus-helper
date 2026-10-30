import { useMemo, useRef, useState, useId } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2, Edit2, Check, Dice5, Pencil, Package, Sword, Shield, Flame, Coins, Minus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { type LootDbItem, type LootRank, lootItemsFileSchema, NO_COINS, useLootConfig, useLootItems } from "@/lib/lootDb";
import { mergeById, readJsonFile } from "@/lib/jsonImport";
import { useCampaignSystem } from "@/lib/cardStore";
import { formatMoney } from "@/lib/currency";
import { MoneyInput } from "@/components/money/MoneyInput";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const RANK_BADGE_STYLES = [
  "border-stone-500/45 bg-stone-950/55 text-stone-100",
  "border-emerald-600/40 bg-emerald-950/45 text-emerald-100",
  "border-sky-600/40 bg-sky-950/45 text-sky-100",
  "border-violet-600/40 bg-violet-950/45 text-violet-100",
  "border-amber-600/45 bg-amber-950/50 text-amber-100",
];

function weightedRandom(ranks: LootRank[]): LootRank | null {
  const total = ranks.reduce((s, r) => s + r.chance, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const r of ranks) {
    roll -= r.chance;
    if (roll <= 0) return r;
  }
  return ranks[ranks.length - 1];
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rankBadgeClass(rankName: string, rankNames: string[]): string {
  const idx = rankNames.indexOf(rankName);
  return RANK_BADGE_STYLES[(idx >= 0 ? idx : 0) % RANK_BADGE_STYLES.length];
}

function shorten(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function pluralItemLabel(n: number): string {
  if (n === 1) return "przedmiot";
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "przedmioty";
  return "przedmiotów";
}

interface GeneratedLoot {
  items: LootDbItem[];
  /** In the smallest denomination. */
  coins: number;
}

type ItemFormState = {
  name: string;
  type: string;
  rankName: string;
  price: number;
  description: string;
  tags: string;
};

function emptyItemForm(defaultRankName: string): ItemFormState {
  return { name: "", type: "", rankName: defaultRankName, price: 0, description: "", tags: "" };
}

function tagsFromItem(item: LootDbItem): string {
  return (item.tags ?? []).join(", ");
}

function tagsToArray(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

const CARRY_CATEGORIES = [
  { id: "weapons", label: "Broń", icon: Sword },
  { id: "armor", label: "Pancerz", icon: Shield },
  { id: "consumables", label: "Zużywalne", icon: Flame },
  { id: "gear", label: "Wyposażenie", icon: Package },
  { id: "coins", label: "Pieniądze", icon: Coins },
];

const VALID_TABS = ["generate", "ranks", "items", "carry"] as const;

export default function LootGeneratorPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && (VALID_TABS as readonly string[]).includes(tabFromUrl)
      ? (tabFromUrl as (typeof VALID_TABS)[number])
      : "generate";

  const { inventory, setInventory } = useApp();
  const [lootConfig, setLootConfig] = useLootConfig();
  const [lootItems, setLootItems] = useLootItems();
  const [system] = useCampaignSystem();
  const currency = system.currency;
  const priceLabel = (price: number) => (price > 0 ? formatMoney(price, currency) : "—");
  const [tab, setTab] = useState<"generate" | "ranks" | "items" | "carry">(initialTab);
  const [result, setResult] = useState<GeneratedLoot | null>(null);

  const [editingRankId, setEditingRankId] = useState<string | null>(null);
  const [newRank, setNewRank] = useState({ name: "", chance: 10 });
  const [addingRank, setAddingRank] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRankName, setFilterRankName] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(() => emptyItemForm(""));
  const [deleteTarget, setDeleteTarget] = useState<LootDbItem | null>(null);
  const typeListId = useId();
  const [activeCarryCategory, setActiveCarryCategory] = useState("all");
  const [newCarryName, setNewCarryName] = useState("");
  const [newCarryCategory, setNewCarryCategory] = useState("gear");

  const rankNames = useMemo(() => lootConfig.ranks.map((r) => r.name), [lootConfig.ranks]);
  const defaultRankName = rankNames[0] ?? "";

  const totalChance = lootConfig.ranks.reduce((s, r) => s + r.chance, 0);

  const uniqueTypes = useMemo(
    () => [...new Set(lootItems.map((i) => i.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl")),
    [lootItems],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lootItems.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterRankName !== "all" && item.rankName !== filterRankName) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [lootItems, search, filterType, filterRankName]);

  const generateLoot = () => {
    const count = randRange(lootConfig.itemCount.min, lootConfig.itemCount.max);
    const items: LootDbItem[] = [];
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const rank = weightedRandom(lootConfig.ranks);
        if (!rank) break;
        const pool = lootItems.filter((it) => it.rankName === rank.name);
        if (pool.length > 0) {
          items.push(pool[Math.floor(Math.random() * pool.length)]);
          break;
        }
        attempts++;
      }
    }
    const coins = currency.reduce((sum, denomination) => {
      const range = lootConfig.coinRanges[denomination.id] ?? NO_COINS;
      const low = Math.min(range.min, range.max);
      const high = Math.max(range.min, range.max);
      return sum + randRange(low, high) * denomination.rate;
    }, 0);
    setResult({ items, coins });
  };

  const updateRank = (id: string, patch: Partial<LootRank>) => {
    const prevRank = lootConfig.ranks.find((r) => r.id === id);
    if (prevRank && patch.name !== undefined && patch.name !== prevRank.name) {
      const oldName = prevRank.name;
      const newName = patch.name;
      setLootItems((items) => items.map((it) => (it.rankName === oldName ? { ...it, rankName: newName } : it)));
    }
    setLootConfig((prev) => ({
      ...prev,
      ranks: prev.ranks.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const deleteRank = (id: string) => {
    const rank = lootConfig.ranks.find((r) => r.id === id);
    const name = rank?.name;
    setLootConfig((prev) => ({ ...prev, ranks: prev.ranks.filter((r) => r.id !== id) }));
    if (name) {
      setLootItems((prev) => prev.filter((i) => i.rankName !== name));
    }
  };

  const addRank = () => {
    if (!newRank.name.trim()) return;
    setLootConfig((prev) => ({ ...prev, ranks: [...prev.ranks, { ...newRank, id: crypto.randomUUID() }] }));
    setNewRank({ name: "", chance: 10 });
    setAddingRank(false);
  };

  const importFileRef = useRef<HTMLInputElement>(null);
  const importItems = async (file: File) => {
    try {
      const items = await readJsonFile(file, lootItemsFileSchema);
      setLootItems((prev) => mergeById(prev, items));
      // An item whose rank the generator doesn't know never drops; say so instead of failing silently.
      const unknownRanks = [...new Set(items.map((i) => i.rankName))].filter((name) => !lootConfig.ranks.some((r) => r.name === name));
      toast.success(
        `Zaimportowano przedmioty: ${items.length}`,
        unknownRanks.length ? { description: `Rangi spoza ustawień: ${unknownRanks.join(", ")}. Dodaj je, żeby te przedmioty wypadały w losowaniu.` } : undefined,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zaimportować pliku");
    }
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setItemForm(emptyItemForm(defaultRankName));
    setModalOpen(true);
  };

  const openEditItem = (item: LootDbItem) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      type: item.type,
      rankName: item.rankName,
      price: item.price,
      description: item.description,
      tags: tagsFromItem(item),
    });
    setModalOpen(true);
  };

  const saveItem = () => {
    const name = itemForm.name.trim();
    const type = itemForm.type.trim();
    const rankName = itemForm.rankName.trim();
    if (!name || !type || !rankName) return;
    const tags = tagsToArray(itemForm.tags);

    if (editingItemId) {
      setLootItems((prev) =>
        prev.map((i) =>
          i.id === editingItemId
            ? {
                ...i,
                name,
                type,
                rankName,
                price: Math.max(0, itemForm.price),
                description: itemForm.description.trim(),
                tags,
              }
            : i,
        ),
      );
    } else {
      const newItem: LootDbItem = {
        id: crypto.randomUUID(),
        name,
        type,
        rankName,
        price: Math.max(0, itemForm.price),
        description: itemForm.description.trim(),
        tags,
      };
      setLootItems((prev) => [...prev, newItem]);
    }
    setModalOpen(false);
    setEditingItemId(null);
  };

  const confirmDeleteItem = () => {
    if (!deleteTarget) return;
    setLootItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const canSaveItem = itemForm.name.trim() && itemForm.type.trim() && itemForm.rankName.trim();

  const filteredCarry =
    activeCarryCategory === "all" ? inventory : inventory.filter((i) => i.category === activeCarryCategory);

  const updateCarryQuantity = (id: string, delta: number) =>
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)),
    );

  const removeCarryItem = (id: string) => setInventory((prev) => prev.filter((i) => i.id !== id));

  const addCarryItem = () => {
    const name = newCarryName.trim();
    if (!name) return;
    setInventory((prev) => [...prev, { id: crypto.randomUUID(), name, category: newCarryCategory, quantity: 1 }]);
    setNewCarryName("");
  };

  const getCarryCategoryIcon = (cat: string) => CARRY_CATEGORIES.find((c) => c.id === cat)?.icon ?? Package;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["generate", "ranks", "items", "carry"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="text-xs flex-1 min-w-[4.25rem]" onClick={() => setTab(t)}>
            {t === "generate" ? "Generuj" : t === "ranks" ? "Rangi" : t === "items" ? "Przedmioty" : "Ekwipunek"}
          </Button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">
            Baza przedmiotów: <span className="font-semibold text-foreground">{lootItems.length}</span> pozycji — edycja
            w zakładce <span className="text-foreground font-medium">Przedmioty</span>.
          </p>

          <Card>
            <CardContent className="p-3 space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Ilość przedmiotów</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Min</label>
                  <NumberInput
                    value={lootConfig.itemCount.min}
                    onChange={(v) => setLootConfig((p) => ({ ...p, itemCount: { ...p.itemCount, min: v } }))}
                    min={0}
                    max={20}
                    className="h-8 text-xs text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Max</label>
                  <NumberInput
                    value={lootConfig.itemCount.max}
                    onChange={(v) => setLootConfig((p) => ({ ...p, itemCount: { ...p.itemCount, max: v } }))}
                    min={0}
                    max={20}
                    className="h-8 text-xs text-center"
                  />
                </div>
              </div>

              <label className="text-xs text-muted-foreground font-medium">Monety (zakresy)</label>
              {currency.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Kampania nie ma waluty, więc łup nie zawiera monet.{" "}
                  <Link to="/settings?tab=waluta" className="font-medium text-primary underline underline-offset-2">
                    Ustaw walutę kampanii
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {currency.map((denomination) => {
                    const range = lootConfig.coinRanges[denomination.id] ?? NO_COINS;
                    const setRange = (patch: Partial<typeof range>) =>
                      setLootConfig((p) => ({
                        ...p,
                        coinRanges: {
                          ...p.coinRanges,
                          [denomination.id]: { ...(p.coinRanges[denomination.id] ?? NO_COINS), ...patch },
                        },
                      }));
                    return (
                      <div key={denomination.id}>
                        <label className="text-[9px] text-muted-foreground">
                          {denomination.name} ({denomination.short})
                        </label>
                        <div className="flex gap-0.5">
                          <NumberInput
                            value={range.min}
                            min={0}
                            onChange={(v) => setRange({ min: v })}
                            className="h-7 text-[10px] text-center"
                            aria-label={`${denomination.name}: od`}
                          />
                          <NumberInput
                            value={range.max}
                            min={0}
                            onChange={(v) => setRange({ max: v })}
                            className="h-7 text-[10px] text-center"
                            aria-label={`${denomination.name}: do`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={generateLoot} className="w-full min-h-12 text-base font-semibold gap-2">
            <Dice5 className="h-5 w-5" /> Generuj łup
          </Button>

          {result && (
            <Card className="border-primary/30 animate-fade-in">
              <CardContent className="p-3 space-y-2">
                <div className="field-label">Wylosowany łup</div>

                {result.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak przedmiotów (pula pusta?)</p>
                ) : (
                  <div className="space-y-1.5">
                    {result.items.map((item, i) => (
                      <div key={`${item.id}-${i}`} className="flex items-start justify-between text-sm px-2 py-1.5 rounded-md bg-muted/50 border">
                        <div className="min-w-0">
                          <span className="font-semibold">{item.name}</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              {item.rankName}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {item.type}
                            </Badge>
                          </div>
                          {item.description ? <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p> : null}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Wartość: {priceLabel(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 text-xs pt-1 border-t border-border/50">
                  {result.coins > 0 ? (
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Coins className="h-3.5 w-3.5" />
                      {formatMoney(result.coins, currency)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Brak monet</span>
                  )}
                </div>

                <Button onClick={generateLoot} variant="secondary" className="w-full text-xs min-h-[--h-control] gap-1">
                  <Dice5 className="h-3 w-3" /> Generuj ponownie
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "ranks" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Suma szans:{" "}
              <span className={cn("font-bold", Math.abs(totalChance - 100) < 0.01 ? "text-success" : "text-destructive")}>
                {totalChance.toFixed(1)}%
              </span>
            </div>
            <Button size="sm" className="text-xs gap-1 min-h-[--h-control] shrink-0" onClick={() => setAddingRank(true)}>
              <Plus className="h-3 w-3" />
              Dodaj rangę
            </Button>
          </div>

          {addingRank && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={newRank.name}
                    onChange={(e) => setNewRank({ ...newRank, name: e.target.value })}
                    placeholder="Nazwa rangi"
                    className="h-8 text-xs"
                  />
                  <NumberInput value={newRank.chance} onChange={(v) => setNewRank({ ...newRank, chance: v })} className="h-8 text-xs text-center" />
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-[--h-control] text-xs flex-1" onClick={addRank}>
                    Dodaj
                  </Button>
                  <Button size="sm" variant="ghost" className="h-[--h-control] text-xs" onClick={() => setAddingRank(false)}>
                    Anuluj
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            {lootConfig.ranks.map((rank) => {
              const isEditing = editingRankId === rank.id;
              return (
                <div key={rank.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border">
                  {isEditing ? (
                    <>
                      <Input
                        value={rank.name}
                        onChange={(e) => updateRank(rank.id, { name: e.target.value })}
                        className="h-[--h-control] text-xs flex-1"
                      />
                      <NumberInput
                        value={rank.chance}
                        onChange={(v) => updateRank(rank.id, { chance: v })}
                        className="h-[--h-control] text-xs w-20 text-center"
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      <Button size="icon" variant="ghost" className="min-h-[--h-control] min-w-[--h-control] shrink-0" onClick={() => setEditingRankId(null)}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium flex-1 min-w-0">{rank.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{rank.chance}%</span>
                      <Button size="icon" variant="ghost" className="min-h-[--h-control] min-w-[--h-control] shrink-0" onClick={() => setEditingRankId(rank.id)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="min-h-[--h-control] min-w-[--h-control] shrink-0 text-muted-foreground"
                        onClick={() => deleteRank(rank.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "items" && (
        <div className="space-y-4">
          {rankNames.length === 0 && (
            <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
              Brak rang w konfiguracji. Dodaj rangi w zakładce <span className="text-foreground font-medium">Rangi</span>.
            </p>
          )}

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label htmlFor="item-search" className="text-xs text-muted-foreground">
                Szukaj
              </Label>
              <Input
                id="item-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nazwa lub opis…"
                className="min-h-[--h-control]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
              <div className="space-y-1 min-w-0 md:w-[140px]">
                <Label className="text-xs text-muted-foreground">Typ</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="min-h-[--h-control]">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {uniqueTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0 md:w-[160px]">
                <Label className="text-xs text-muted-foreground">Ranga</Label>
                <Select value={filterRankName} onValueChange={setFilterRankName}>
                  <SelectTrigger className="min-h-[--h-control]">
                    <SelectValue placeholder="Ranga" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {lootConfig.ranks.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importItems(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => importFileRef.current?.click()}
              className="min-h-[--h-control] gap-1.5 w-full md:w-auto shrink-0"
              title="Dodaje przedmioty z pliku JSON; przedmioty o tym samym id zastępuje"
            >
              <Upload className="h-4 w-4" />
              Importuj JSON
            </Button>
            <Button
              type="button"
              onClick={openAddItem}
              disabled={rankNames.length === 0}
              className="min-h-[--h-control] gap-1.5 w-full md:w-auto shrink-0"
            >
              <Plus className="h-4 w-4" />
              Dodaj przedmiot
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredItems.length}</span> {pluralItemLabel(filteredItems.length)}
          </p>

          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">Nazwa</TableHead>
                  <TableHead className="w-[8%]">Typ</TableHead>
                  <TableHead className="w-[10%]">Ranga</TableHead>
                  <TableHead className="w-[8%] text-right">Cena</TableHead>
                  <TableHead>Cechy / Opis</TableHead>
                  <TableHead className="w-[100px] text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium align-top py-3">{item.name}</TableCell>
                    <TableCell className="align-top py-3 text-xs text-muted-foreground">{item.type}</TableCell>
                    <TableCell className="align-top py-3">
                      <Badge variant="outline" className={cn("text-xs font-normal", rankBadgeClass(item.rankName, rankNames))}>
                        {item.rankName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right align-top py-3 whitespace-nowrap">
                      {priceLabel(item.price)}
                    </TableCell>
                    <TableCell className="align-top py-2 max-w-[340px]">
                      {(item.tags?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {item.tags!.map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border/60">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.description?.trim() ? (
                        <p className="text-xs text-muted-foreground/80 italic">{shorten(item.description, 80)}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right align-top py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[--h-control] min-w-[--h-control]"
                          aria-label={`Edytuj ${item.name}`}
                          onClick={() => openEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[--h-control] min-w-[--h-control] text-destructive hover:text-destructive"
                          aria-label={`Usuń ${item.name}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">Brak wyników.</p>
            )}
          </div>

          <div className="md:hidden space-y-2">
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight">{item.name}</p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1.5 text-[10px] font-normal", rankBadgeClass(item.rankName, rankNames))}
                      >
                        {item.rankName}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span>{item.type}</span>
                    <span className="mx-1.5">|</span>
                    <span>{priceLabel(item.price)}</span>
                  </p>
                  {(item.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags!.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.description?.trim() ? (
                    <p className="text-xs text-muted-foreground/80 italic line-clamp-2">{item.description}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="min-h-[--h-control] flex-1 gap-1.5" onClick={() => openEditItem(item)}>
                      <span aria-hidden>✏️</span> Edytuj
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[--h-control] flex-1 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <span aria-hidden>🗑</span> Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Brak wyników.</p>}
          </div>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItemId ? "Edytuj przedmiot" : "Dodaj przedmiot"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1">
                  <Label htmlFor="f-name">Nazwa *</Label>
                  <Input
                    id="f-name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                    className="min-h-[--h-control]"
                    placeholder="Nazwa przedmiotu"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-type">Typ *</Label>
                  <Input
                    id="f-type"
                    list={typeListId}
                    value={itemForm.type}
                    onChange={(e) => setItemForm((f) => ({ ...f, type: e.target.value }))}
                    className="min-h-[--h-control]"
                    placeholder="np. broń, mikstura"
                  />
                  <datalist id={typeListId}>
                    {uniqueTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label>Ranga *</Label>
                  <Select value={itemForm.rankName} onValueChange={(v) => setItemForm((f) => ({ ...f, rankName: v }))}>
                    <SelectTrigger className="min-h-[--h-control]">
                      <SelectValue placeholder="Wybierz rangę" />
                    </SelectTrigger>
                    <SelectContent>
                      {lootConfig.ranks.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-price">Cena</Label>
                  <MoneyInput
                    id="f-price"
                    value={itemForm.price}
                    onChange={(v) => setItemForm((f) => ({ ...f, price: v }))}
                    currency={currency}
                    inputClassName="min-h-[--h-control]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-tags">Cechy / Tagi</Label>
                  <Input
                    id="f-tags"
                    value={itemForm.tags}
                    onChange={(e) => setItemForm((f) => ({ ...f, tags: e.target.value }))}
                    className="min-h-[--h-control]"
                    placeholder="np. Fast, Obrażenia: SB+2, Zasięg: krótki"
                  />
                  <p className="text-[11px] text-muted-foreground">Oddziel przecinkami. Wyświetlane jako plakietki.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-description">Uwagi (MG)</Label>
                  <Textarea
                    id="f-description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Opcjonalne uwagi dla MG"
                    className="min-h-[64px] resize-y"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="min-h-[--h-control]" onClick={() => setModalOpen(false)}>
                  Anuluj
                </Button>
                <Button type="button" className="min-h-[--h-control]" disabled={!canSaveItem} onClick={saveItem}>
                  Zapisz
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć przedmiot?</AlertDialogTitle>
                <AlertDialogDescription>
                  {`Usunąć '${deleteTarget?.name ?? ""}'?`} Tej operacji nie można cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-[--h-control]">Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  className="min-h-[--h-control] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={confirmDeleteItem}
                >
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {tab === "carry" && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-sm font-semibold text-muted-foreground">Szybki ekwipunek postaci</h2>

          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={activeCarryCategory === "all" ? "default" : "secondary"} className="text-xs" onClick={() => setActiveCarryCategory("all")}>
              Wszystko
            </Button>
            {CARRY_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCarryCategory === cat.id ? "default" : "secondary"}
                className="text-xs gap-1"
                onClick={() => setActiveCarryCategory(cat.id)}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            {filteredCarry.map((item) => {
              const Icon = getCarryCategoryIcon(item.category);
              const isLow = item.maxQuantity ? item.quantity <= Math.floor(item.maxQuantity * 0.25) : item.quantity === 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border bg-card ${isLow ? "border-destructive/30" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`text-sm font-medium truncate ${item.quantity === 0 ? "text-muted-foreground line-through" : ""}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCarryQuantity(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className={`text-sm font-bold min-w-[2ch] text-center ${isLow ? "text-destructive" : ""}`}>
                      {item.quantity}
                      {item.maxQuantity && <span className="text-muted-foreground font-normal">/{item.maxQuantity}</span>}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCarryQuantity(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeCarryItem(item.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredCarry.length === 0 && (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">Brak przedmiotów w tej kategorii</CardContent>
              </Card>
            )}
          </div>

          <section>
            <label className="field-label mb-1.5 block">Dodaj przedmiot</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="text"
                value={newCarryName}
                onChange={(e) => setNewCarryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCarryItem()}
                placeholder="Nazwa…"
                className="flex-1 h-9"
              />
              <select
                value={newCarryCategory}
                onChange={(e) => setNewCarryCategory(e.target.value)}
                className="h-9 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CARRY_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={addCarryItem} className="gap-1 shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
