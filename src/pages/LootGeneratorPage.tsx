import { useState } from "react";
import { Gem, Plus, Trash2, Edit2, Check, X, Dice5, Filter } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { LootRank, LootItem } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface GeneratedLoot {
  items: (LootItem & { rankName: string })[];
  gold: number;
  silver: number;
  copper: number;
}

export default function LootGeneratorPage() {
  const { lootConfig, setLootConfig } = useApp();
  const [tab, setTab] = useState<"generate" | "ranks" | "items">("generate");
  const [result, setResult] = useState<GeneratedLoot | null>(null);
  const [filterRank, setFilterRank] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Editing states
  const [editingRankId, setEditingRankId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newRank, setNewRank] = useState({ name: "", chance: 10 });
  const [newItem, setNewItem] = useState({ name: "", type: "", rankId: lootConfig.ranks[0]?.id ?? "", description: "" });
  const [addingRank, setAddingRank] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const totalChance = lootConfig.ranks.reduce((s, r) => s + r.chance, 0);
  const itemTypes = [...new Set(lootConfig.items.map((i) => i.type))];

  const generateLoot = () => {
    const count = randRange(lootConfig.itemCount.min, lootConfig.itemCount.max);
    const items: GeneratedLoot["items"] = [];
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const rank = weightedRandom(lootConfig.ranks);
        if (!rank) break;
        const pool = lootConfig.items.filter((it) => it.rankId === rank.id);
        if (pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          items.push({ ...picked, rankName: rank.name });
          break;
        }
        attempts++;
      }
    }
    setResult({
      items,
      gold: randRange(lootConfig.coinRanges.gold.min, lootConfig.coinRanges.gold.max),
      silver: randRange(lootConfig.coinRanges.silver.min, lootConfig.coinRanges.silver.max),
      copper: randRange(lootConfig.coinRanges.copper.min, lootConfig.coinRanges.copper.max),
    });
  };

  const updateRank = (id: string, patch: Partial<LootRank>) => {
    setLootConfig((prev) => ({ ...prev, ranks: prev.ranks.map((r) => r.id === id ? { ...r, ...patch } : r) }));
  };

  const deleteRank = (id: string) => {
    setLootConfig((prev) => ({ ...prev, ranks: prev.ranks.filter((r) => r.id !== id), items: prev.items.filter((i) => i.rankId !== id) }));
  };

  const addRank = () => {
    if (!newRank.name.trim()) return;
    setLootConfig((prev) => ({ ...prev, ranks: [...prev.ranks, { ...newRank, id: crypto.randomUUID() }] }));
    setNewRank({ name: "", chance: 10 });
    setAddingRank(false);
  };

  const updateItem = (id: string, patch: Partial<LootItem>) => {
    setLootConfig((prev) => ({ ...prev, items: prev.items.map((i) => i.id === id ? { ...i, ...patch } : i) }));
  };

  const deleteItem = (id: string) => {
    setLootConfig((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;
    setLootConfig((prev) => ({ ...prev, items: [...prev.items, { ...newItem, id: crypto.randomUUID() }] }));
    setNewItem({ name: "", type: "", rankId: lootConfig.ranks[0]?.id ?? "", description: "" });
    setAddingItem(false);
  };

  const filteredItems = lootConfig.items.filter((i) => {
    if (filterRank !== "all" && i.rankId !== filterRank) return false;
    if (filterType !== "all" && i.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2"><Gem className="h-5 w-5" />Generator łupu</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(["generate", "ranks", "items"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="text-xs flex-1"
            onClick={() => setTab(t)}>
            {t === "generate" ? "Generuj" : t === "ranks" ? "Rangi" : "Przedmioty"}
          </Button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {tab === "generate" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Ilość przedmiotów</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Min</label>
                  <NumberInput value={lootConfig.itemCount.min} onChange={(v) => setLootConfig((p) => ({ ...p, itemCount: { ...p.itemCount, min: v } }))} min={0} max={20} className="h-8 text-xs text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Max</label>
                  <NumberInput value={lootConfig.itemCount.max} onChange={(v) => setLootConfig((p) => ({ ...p, itemCount: { ...p.itemCount, max: v } }))} min={0} max={20} className="h-8 text-xs text-center" />
                </div>
              </div>

              <label className="text-xs text-muted-foreground font-medium">Monety (zakresy)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["gold", "silver", "copper"] as const).map((coin) => (
                  <div key={coin}>
                    <label className="text-[9px] text-muted-foreground">{coin === "gold" ? "Złoto" : coin === "silver" ? "Szylingi" : "Pensy"}</label>
                    <div className="flex gap-0.5">
                      <NumberInput value={lootConfig.coinRanges[coin].min} onChange={(v) => setLootConfig((p) => ({ ...p, coinRanges: { ...p.coinRanges, [coin]: { ...p.coinRanges[coin], min: v } } }))} className="h-7 text-[10px] text-center" />
                      <NumberInput value={lootConfig.coinRanges[coin].max} onChange={(v) => setLootConfig((p) => ({ ...p, coinRanges: { ...p.coinRanges, [coin]: { ...p.coinRanges[coin], max: v } } }))} className="h-7 text-[10px] text-center" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={generateLoot} className="w-full h-12 text-base font-semibold gap-2">
            <Dice5 className="h-5 w-5" /> Generuj łup
          </Button>

          {result && (
            <Card className="border-primary/30 animate-fade-in">
              <CardContent className="p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wylosowany łup</div>

                {result.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak przedmiotów (pula pusta?)</p>
                ) : (
                  <div className="space-y-1.5">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between text-sm px-2 py-1.5 rounded-md bg-muted/50 border">
                        <div className="min-w-0">
                          <span className="font-semibold">{item.name}</span>
                          <div className="flex gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{item.rankName}</Badge>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{item.type}</Badge>
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 text-xs pt-1 border-t border-border/50">
                  {result.gold > 0 && <span className="text-yellow-500 font-semibold">{result.gold} zł</span>}
                  {result.silver > 0 && <span className="text-slate-400 font-semibold">{result.silver} sz</span>}
                  {result.copper > 0 && <span className="text-orange-600 font-semibold">{result.copper} pn</span>}
                  {result.gold === 0 && result.silver === 0 && result.copper === 0 && <span className="text-muted-foreground">Brak monet</span>}
                </div>

                <Button onClick={generateLoot} variant="secondary" className="w-full text-xs h-8 gap-1">
                  <Dice5 className="h-3 w-3" /> Generuj ponownie
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── RANKS TAB ── */}
      {tab === "ranks" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Suma szans: <span className={cn("font-bold", Math.abs(totalChance - 100) < 0.01 ? "text-success" : "text-destructive")}>{totalChance.toFixed(1)}%</span>
            </div>
            <Button size="sm" className="text-xs gap-1 h-7" onClick={() => setAddingRank(true)}><Plus className="h-3 w-3" />Dodaj rangę</Button>
          </div>

          {addingRank && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <Input value={newRank.name} onChange={(e) => setNewRank({ ...newRank, name: e.target.value })} placeholder="Nazwa rangi" className="h-8 text-xs" />
                  <NumberInput value={newRank.chance} onChange={(v) => setNewRank({ ...newRank, chance: v })} className="h-8 text-xs text-center" />
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={addRank}>Dodaj</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingRank(false)}>Anuluj</Button>
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
                      <Input value={rank.name} onChange={(e) => updateRank(rank.id, { name: e.target.value })} className="h-7 text-xs flex-1" />
                      <NumberInput value={rank.chance} onChange={(v) => updateRank(rank.id, { chance: v })} className="h-7 text-xs w-20 text-center" />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingRankId(null)}><Check className="h-3 w-3" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium flex-1">{rank.name}</span>
                      <span className="text-xs text-muted-foreground">{rank.chance}%</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingRankId(rank.id)}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => deleteRank(rank.id)}><Trash2 className="h-3 w-3" /></Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ITEMS TAB ── */}
      {tab === "items" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <select value={filterRank} onChange={(e) => setFilterRank(e.target.value)}
                className="h-7 px-1.5 text-[10px] rounded border bg-card text-foreground">
                <option value="all">Wszystkie rangi</option>
                {lootConfig.ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="h-7 px-1.5 text-[10px] rounded border bg-card text-foreground">
                <option value="all">Wszystkie typy</option>
                {itemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button size="sm" className="text-xs gap-1 h-7" onClick={() => { setNewItem({ name: "", type: "", rankId: lootConfig.ranks[0]?.id ?? "", description: "" }); setAddingItem(true); }}>
              <Plus className="h-3 w-3" />Dodaj
            </Button>
          </div>

          {addingItem && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nazwa przedmiotu" className="h-8 text-xs" />
                <div className="grid grid-cols-2 gap-1.5">
                  <Input value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })} placeholder="Typ (broń, zbroja...)" className="h-8 text-xs" />
                  <select value={newItem.rankId} onChange={(e) => setNewItem({ ...newItem, rankId: e.target.value })}
                    className="h-8 px-2 text-xs rounded border bg-card text-foreground">
                    {lootConfig.ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Opis (opcjonalny)" className="h-8 text-xs" />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={addItem}>Dodaj</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingItem(false)}>Anuluj</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            {filteredItems.map((item) => {
              const rank = lootConfig.ranks.find((r) => r.id === item.rankId);
              const isEditing = editingItemId === item.id;
              return (
                <div key={item.id} className="px-3 py-2 rounded-md bg-card border">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="h-7 text-xs" />
                      <div className="grid grid-cols-2 gap-1">
                        <Input value={item.type} onChange={(e) => updateItem(item.id, { type: e.target.value })} className="h-7 text-xs" placeholder="Typ" />
                        <select value={item.rankId} onChange={(e) => updateItem(item.id, { rankId: e.target.value })}
                          className="h-7 px-1.5 text-xs rounded border bg-card text-foreground">
                          {lootConfig.ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <Input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} className="h-7 text-xs" placeholder="Opis" />
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingItemId(null)}><Check className="h-3 w-3 mr-1" />Gotowe</Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex gap-1 mt-0.5">
                          {rank && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{rank.name}</Badge>}
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{item.type}</Badge>
                        </div>
                        {item.description && <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingItemId(item.id)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => deleteItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Brak przedmiotów.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}