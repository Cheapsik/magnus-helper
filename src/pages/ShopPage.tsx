import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  Settings2,
  Trash2,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  Dice5,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import type { LootRank } from "@/context/AppContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import {
  generateShopAssortment,
  rollPriceForManualItem,
  formatPriceInGold,
} from "@/lib/shopGenerator";
import type { ShopConfigStored, ShopSnapshot, ShopStockLine, ShopTypeEntry } from "@/lib/shopTypes";
import { normalizeShopConfig } from "@/lib/shopTypes";
import type { LootDbItem } from "@/lib/lootDb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RANK_BADGE_STYLES = [
  "border-stone-500/45 bg-stone-950/55 text-stone-100",
  "border-emerald-600/40 bg-emerald-950/45 text-emerald-100",
  "border-sky-600/40 bg-sky-950/45 text-sky-100",
  "border-violet-600/40 bg-violet-950/45 text-violet-100",
  "border-amber-600/45 bg-amber-950/50 text-amber-100",
];

function rankBadgeClass(rankName: string, rankNames: string[]): string {
  const idx = rankNames.indexOf(rankName);
  return RANK_BADGE_STYLES[(idx >= 0 ? idx : 0) % RANK_BADGE_STYLES.length];
}

export default function ShopPage() {
  const { lootItems, lootConfig } = useApp();
  const [shopRaw, setShopRaw] = useLocalStorage<ShopConfigStored | null>("rpg_shop_config", null);
  const [history, setHistory] = useLocalStorage<ShopSnapshot[]>("rpg_shop_history", []);

  const shopConfig = useMemo(
    () => normalizeShopConfig(shopRaw, lootConfig.ranks),
    [shopRaw, lootConfig.ranks],
  );

  const updateConfig = useCallback(
    (fn: (c: ShopConfigStored) => ShopConfigStored) => {
      setShopRaw((prev) => fn(normalizeShopConfig(prev, lootConfig.ranks)));
    },
    [lootConfig.ranks, setShopRaw],
  );

  const rankNames = useMemo(() => lootConfig.ranks.map((r) => r.name), [lootConfig.ranks]);

  const uniqueTypes = useMemo(
    () => [...new Set(lootItems.map((i) => i.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl")),
    [lootItems],
  );

  const selectedShopType = useMemo(
    () => shopConfig.shopTypes.find((t) => t.id === shopConfig.selectedShopTypeId) ?? shopConfig.shopTypes[0] ?? null,
    [shopConfig.shopTypes, shopConfig.selectedShopTypeId],
  );

  const [shopTitle, setShopTitle] = useState("");
  const [stockLines, setStockLines] = useState<ShopStockLine[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [draftType, setDraftType] = useState<ShopTypeEntry | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState("");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState("");

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");

  const totalCopper = useMemo(() => stockLines.reduce((s, l) => s + l.priceCopper, 0), [stockLines]);

  const handleGenerate = () => {
    const res = generateShopAssortment({
      lootItems,
      ranks: lootConfig.ranks,
      shopType: selectedShopType,
      wealth: shopConfig.wealthLevel,
      count: shopConfig.itemCount,
      shopConfig,
    });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setStockLines(res.lines);
    toast.success("Wygenerowano asortyment");
  };

  const openSaveFlow = () => {
    if (stockLines.length === 0) {
      toast.error("Brak pozycji do zapisania");
      return;
    }
    if (!shopTitle.trim()) {
      setSaveNameDraft("");
      setSaveDialogOpen(true);
      return;
    }
    pushSnapshot(shopTitle.trim());
  };

  const pushSnapshot = (snapshotName: string) => {
    const snap: ShopSnapshot = {
      id: crypto.randomUUID(),
      snapshotName: snapshotName.trim() || "Sklep",
      savedAt: Date.now(),
      shopTitle: shopTitle.trim(),
      lines: stockLines.map((l) => ({ ...l })),
    };
    setHistory((prev) => [snap, ...prev].slice(0, 20));
    setSaveDialogOpen(false);
    toast.success("Zapisano sklep");
  };

  const loadSnapshot = (snap: ShopSnapshot) => {
    setShopTitle(snap.shopTitle);
    setStockLines(snap.lines.map((l) => ({ ...l })));
    toast.success("Wczytano snapshot");
  };

  const deleteSnapshot = (id: string) => {
    setHistory((prev) => prev.filter((s) => s.id !== id));
  };

  const startEditPrice = (line: ShopStockLine) => {
    setEditingPriceId(line.lineId);
    setPriceDraft(String(line.priceCopper));
  };

  const commitPrice = (lineId: string) => {
    const v = Math.max(0, Math.round(Number(priceDraft) || 0));
    setStockLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, priceCopper: v } : l)));
    setEditingPriceId(null);
  };

  const removeLine = (lineId: string) => {
    setStockLines((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const addManualItem = (item: LootDbItem) => {
    const priceCopper = rollPriceForManualItem(item, lootConfig.ranks, shopConfig);
    setStockLines((prev) => [
      ...prev,
      {
        lineId: crypto.randomUUID(),
        sourceItemId: item.id,
        name: item.name,
        type: item.type,
        rankName: item.rankName,
        description: item.description,
        priceCopper,
      },
    ]);
    setManualOpen(false);
    setManualSearch("");
  };

  const openNewTypeDraft = () => {
    setDraftType({ id: crypto.randomUUID(), name: "", preferredTypes: [] });
  };

  const openEditTypeDraft = (t: ShopTypeEntry) => {
    setDraftType({ ...t, preferredTypes: [...t.preferredTypes] });
  };

  const saveDraftType = () => {
    if (!draftType || !draftType.name.trim()) return;
    updateConfig((c) => {
      const exists = c.shopTypes.some((x) => x.id === draftType.id);
      const shopTypes = exists
        ? c.shopTypes.map((x) => (x.id === draftType.id ? { ...draftType, name: draftType.name.trim() } : x))
        : [...c.shopTypes, { ...draftType, name: draftType.name.trim() }];
      return { ...c, shopTypes, selectedShopTypeId: c.selectedShopTypeId ?? shopTypes[0]?.id ?? null };
    });
    setDraftType(null);
  };

  const deleteType = (id: string) => {
    updateConfig((c) => {
      let shopTypes = c.shopTypes.filter((x) => x.id !== id);
      if (shopTypes.length === 0) shopTypes = normalizeShopConfig(null, lootConfig.ranks).shopTypes;
      let selectedShopTypeId = c.selectedShopTypeId;
      if (selectedShopTypeId === id) selectedShopTypeId = shopTypes[0]?.id ?? null;
      return { ...c, shopTypes, selectedShopTypeId };
    });
  };

  const togglePreferredOnDraft = (type: string, on: boolean) => {
    if (!draftType) return;
    setDraftType((d) => {
      if (!d) return d;
      const set = new Set(d.preferredTypes);
      if (on) set.add(type);
      else set.delete(type);
      return { ...d, preferredTypes: [...set] };
    });
  };

  const filteredManualItems = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    return lootItems.filter((it) => {
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.type.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q)
      );
    });
  }, [lootItems, manualSearch]);

  const configPanel = (
    <Card className="border-border/80">
      <CardContent className="p-3 md:p-4 space-y-4">
        <div className="text-sm font-semibold">Ustawienia generowania</div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Typ sklepu</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={shopConfig.selectedShopTypeId ?? ""}
              onValueChange={(v) => updateConfig((c) => ({ ...c, selectedShopTypeId: v }))}
            >
              <SelectTrigger className="min-h-11 flex-1">
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                {shopConfig.shopTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 gap-1"
              onClick={() => {
                setDraftType(null);
                setTypesModalOpen(true);
              }}
            >
              <Settings2 className="h-4 w-4" />
              ⚙ Zarządzaj typami sklepów
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Poziom zamożności</Label>
          <RadioGroup
            value={shopConfig.wealthLevel}
            onValueChange={(v) =>
              updateConfig((c) => ({
                ...c,
                wealthLevel: v as ShopConfigStored["wealthLevel"],
              }))
            }
            className="grid gap-2"
          >
            {(
              [
                { id: "poor", label: "Biedny", hint: "💰" },
                { id: "average", label: "Przeciętny", hint: "💰💰" },
                { id: "rich", label: "Bogaty", hint: "💰💰💰" },
              ] as const
            ).map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer min-h-11",
                  shopConfig.wealthLevel === o.id ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <RadioGroupItem value={o.id} id={`w-${o.id}`} className="min-h-[1rem] min-w-[1rem]" />
                <span className="text-sm">
                  {o.hint} {o.label}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Liczba pozycji w asortymencie: {shopConfig.itemCount}
          </Label>
          <Slider
            value={[shopConfig.itemCount]}
            min={1}
            max={20}
            step={1}
            onValueChange={(v) => updateConfig((c) => ({ ...c, itemCount: v[0] ?? 8 }))}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Waluta (nazwy jednostek)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground">Złoto</span>
              <Input
                className="min-h-11 mt-0.5"
                value={shopConfig.currency.goldLabel}
                onChange={(e) =>
                  updateConfig((c) => ({
                    ...c,
                    currency: { ...c.currency, goldLabel: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Srebro</span>
              <Input
                className="min-h-11 mt-0.5"
                value={shopConfig.currency.silverLabel}
                onChange={(e) =>
                  updateConfig((c) => ({
                    ...c,
                    currency: { ...c.currency, silverLabel: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Miedź</span>
              <Input
                className="min-h-11 mt-0.5"
                value={shopConfig.currency.copperLabel}
                onChange={(e) =>
                  updateConfig((c) => ({
                    ...c,
                    currency: { ...c.currency, copperLabel: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">1 zł = ? sz</Label>
              <NumberInput
                className="min-h-11 mt-0.5"
                value={shopConfig.currency.silverPerGold}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    currency: { ...c.currency, silverPerGold: Math.max(1, v) },
                  }))
                }
                min={1}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">1 sz = ? mk</Label>
              <NumberInput
                className="min-h-11 mt-0.5"
                value={shopConfig.currency.copperPerSilver}
                onChange={(v) =>
                  updateConfig((c) => ({
                    ...c,
                    currency: { ...c.currency, copperPerSilver: Math.max(1, v) },
                  }))
                }
                min={1}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Zakres cen per ranga (mk)</Label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Jeśli przedmiot ma cenę bazową &gt; 0, losowane jest 0,8–1,2× wartości (w mk). Przy cenie 0 używany jest zakres poniżej.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {lootConfig.ranks.map((r: LootRank) => {
              const range = shopConfig.rankPriceRanges[r.id] ?? { min: 5, max: 30 };
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 font-medium truncate" title={r.name}>
                    {r.name}
                  </span>
                  <span className="text-muted-foreground">min</span>
                  <NumberInput
                    className="h-9 w-20"
                    value={range.min}
                    onChange={(v) =>
                      updateConfig((c) => {
                        const cur = c.rankPriceRanges[r.id] ?? { min: 5, max: 30 };
                        return {
                          ...c,
                          rankPriceRanges: { ...c.rankPriceRanges, [r.id]: { ...cur, min: v } },
                        };
                      })
                    }
                    min={0}
                  />
                  <span className="text-muted-foreground">max</span>
                  <NumberInput
                    className="h-9 w-20"
                    value={range.max}
                    onChange={(v) =>
                      updateConfig((c) => {
                        const cur = c.rankPriceRanges[r.id] ?? { min: 5, max: 30 };
                        return {
                          ...c,
                          rankPriceRanges: { ...c.rankPriceRanges, [r.id]: { ...cur, max: v } },
                        };
                      })
                    }
                    min={0}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const historyPanel = (
    <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
      <Card className="border-border/80">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3 md:p-4 text-left min-h-11 hover:bg-muted/40 rounded-t-lg"
          >
            <span className="text-sm font-semibold">Historia sklepów</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", historyOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3 md:px-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Brak zapisanych sklepów.</p>
            ) : (
              history.map((snap) => (
                <div
                  key={snap.id}
                  className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{snap.snapshotName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(snap.savedAt).toLocaleString("pl-PL")} · {snap.lines.length} poz.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11 gap-1"
                      onClick={() => loadSnapshot(snap)}
                    >
                      <FolderOpen className="h-4 w-4" />
                      📂 Wczytaj
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 gap-1 text-destructive"
                      onClick={() => deleteSnapshot(snap.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      🗑 Usuń
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  const assortmentToolbar = (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Nazwa sklepu..."
        value={shopTitle}
        onChange={(e) => setShopTitle(e.target.value)}
        className="min-h-11 text-base"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" className="min-h-12 flex-1 gap-2 text-base font-semibold" onClick={handleGenerate}>
          <Dice5 className="h-5 w-5" />
          🎲 Generuj asortyment
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 gap-2 shrink-0 sm:px-6"
          onClick={openSaveFlow}
          disabled={stockLines.length === 0}
        >
          <Save className="h-5 w-5" />
          💾 Zapisz sklep
        </Button>
      </div>
    </div>
  );

  const desktopTable = (
    <div className="hidden md:block rounded-md border border-border/80 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Nazwa</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Ranga</TableHead>
            <TableHead>Cena</TableHead>
            <TableHead>Opis</TableHead>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockLines.map((line, idx) => (
            <TableRow key={line.lineId}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell className="font-medium">{line.name}</TableCell>
              <TableCell>{line.type}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-[10px]", rankBadgeClass(line.rankName, rankNames))}>
                  {line.rankName}
                </Badge>
              </TableCell>
              <TableCell>
                {editingPriceId === line.lineId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-9 w-24"
                      type="number"
                      min={0}
                      value={priceDraft}
                      onChange={(e) => setPriceDraft(e.target.value)}
                      onBlur={() => commitPrice(line.lineId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitPrice(line.lineId);
                        if (e.key === "Escape") setEditingPriceId(null);
                      }}
                      autoFocus
                    />
                    <Button type="button" size="icon" variant="ghost" className="min-h-11 min-w-11" onClick={() => commitPrice(line.lineId)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="font-semibold tabular-nums">
                    {line.priceCopper} {shopConfig.currency.copperLabel}
                  </span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate" title={line.description}>
                {line.description || "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="min-h-11 min-w-11"
                    aria-label="Edytuj cenę"
                    onClick={() => startEditPrice(line)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="min-h-11 min-w-11 text-destructive"
                    aria-label="Usuń"
                    onClick={() => removeLine(line.lineId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const mobileCards = (
    <div className="md:hidden space-y-3">
      {stockLines.map((line) => (
        <Card key={line.lineId} className="border-border/80">
          <CardContent className="p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-bold leading-tight">{line.name}</span>
              <Badge variant="outline" className={cn("text-[10px] shrink-0", rankBadgeClass(line.rankName, rankNames))}>
                {line.rankName}
              </Badge>
            </div>
            <div className="text-sm flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-muted-foreground">{line.type}</span>
              {editingPriceId === line.lineId ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min={0}
                    className="h-11 max-w-[120px]"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                  />
                  <Button type="button" size="icon" variant="secondary" className="min-h-11 min-w-11" onClick={() => commitPrice(line.lineId)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="min-h-11 min-w-11" onClick={() => setEditingPriceId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="font-semibold text-primary">
                  {line.priceCopper} {shopConfig.currency.copperLabel}
                </span>
              )}
            </div>
            {line.description ? <p className="text-xs text-muted-foreground">{line.description}</p> : null}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="min-h-11 flex-1 gap-1" onClick={() => startEditPrice(line)}>
                <Pencil className="h-4 w-4" />
                Edytuj cenę
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1 gap-1 text-destructive"
                onClick={() => removeLine(line.lineId)}
              >
                <Trash2 className="h-4 w-4" />
                Usuń
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const assortmentBody =
    stockLines.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center border border-dashed rounded-lg border-border/80 bg-muted/10">
        <Store className="h-14 w-14 text-muted-foreground opacity-60" />
        <p className="text-sm text-muted-foreground max-w-xs">Skonfiguruj sklep i kliknij Generuj asortyment</p>
      </div>
    ) : (
      <>
        {desktopTable}
        {mobileCards}
      </>
    );

  const assortmentFooter = (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
      <Button type="button" variant="outline" className="min-h-11 gap-2 w-full sm:w-auto" onClick={() => setManualOpen(true)}>
        <Plus className="h-4 w-4" />
        Dodaj ręcznie
      </Button>
      <p className="text-sm font-medium text-center sm:text-right">
        Łączna wartość asortymentu:{" "}
        <span className="text-primary tabular-nums">{formatPriceInGold(totalCopper, shopConfig.currency)}</span>
      </p>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl mx-auto">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Store className="h-5 w-5 shrink-0" />
        Sklep
      </h1>

      {lootItems.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Baza przedmiotów jest pusta</AlertTitle>
          <AlertDescription>
            Dodaj przedmioty w zakładce{" "}
            <Link to="/inventory?tab=items" className="font-medium text-primary underline underline-offset-2">
              Przedmioty
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 md:grid md:grid-cols-[35fr_65fr] md:grid-rows-[auto_1fr] md:gap-4 md:items-start">
        <div className="order-1 md:col-start-1 md:row-start-1">{configPanel}</div>

        <div className="order-2 md:col-start-2 md:row-span-2 flex flex-col gap-4 min-h-[320px]">
          <Card className="border-border/80 flex-1 flex flex-col">
            <CardContent className="p-3 md:p-4 flex flex-col gap-4 flex-1">
              {assortmentToolbar}
              <div className="flex-1 min-h-0">{assortmentBody}</div>
              {assortmentFooter}
            </CardContent>
          </Card>
        </div>

        <div className="order-3 md:col-start-1 md:row-start-2">{historyPanel}</div>
      </div>

      <Dialog open={typesModalOpen} onOpenChange={setTypesModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Typy sklepów</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh] pr-3">
            <div className="space-y-2">
              {shopConfig.shopTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.preferredTypes.length ? t.preferredTypes.join(", ") : "Wszystkie typy"}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => openEditTypeDraft(t)}>
                      Edytuj
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11 text-destructive"
                      onClick={() => deleteType(t.id)}
                      disabled={shopConfig.shopTypes.length <= 1}
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button type="button" variant="outline" className="min-h-11 gap-1" onClick={openNewTypeDraft}>
            <Plus className="h-4 w-4" />
            Dodaj typ sklepu
          </Button>

          {draftType ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-muted/20 p-3">
              <div className="space-y-1">
                <Label className="text-xs">Nazwa</Label>
                <Input className="min-h-11" value={draftType.name} onChange={(e) => setDraftType({ ...draftType, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Preferowane typy (puste = wszystkie)</Label>
                <ScrollArea className="h-40 rounded-md border p-2">
                  <div className="space-y-2">
                    {uniqueTypes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Brak typów w bazie — dodaj przedmioty.</p>
                    ) : (
                      uniqueTypes.map((tp) => (
                        <label key={tp} className="flex items-center gap-2 text-sm min-h-11">
                          <Checkbox
                            checked={draftType.preferredTypes.includes(tp)}
                            onCheckedChange={(ch) => togglePreferredOnDraft(tp, ch === true)}
                          />
                          <span>{tp}</span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex gap-2">
                <Button type="button" className="min-h-11 flex-1" onClick={saveDraftType}>
                  Zapisz typ
                </Button>
                <Button type="button" variant="ghost" className="min-h-11" onClick={() => setDraftType(null)}>
                  Anuluj
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setTypesModalOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj przedmiot z bazy</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Szukaj..."
            className="min-h-11"
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
          />
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 space-y-1">
              {filteredManualItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="w-full text-left rounded-md px-3 py-2 min-h-11 hover:bg-accent text-sm"
                  onClick={() => addManualItem(it)}
                >
                  <span className="font-medium">{it.name}</span>
                  <span className="text-muted-foreground text-xs"> · {it.type}</span>
                </button>
              ))}
              {filteredManualItems.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">Brak wyników.</p>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nazwa snapshotu</DialogTitle>
          </DialogHeader>
          <Input
            className="min-h-11"
            placeholder="np. Zbrojownia w Westfall — sesja 3"
            value={saveNameDraft}
            onChange={(e) => setSaveNameDraft(e.target.value)}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setSaveDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                const n = saveNameDraft.trim();
                if (!n) {
                  toast.error("Podaj nazwę");
                  return;
                }
                pushSnapshot(n);
              }}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
