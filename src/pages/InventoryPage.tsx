import { useState } from "react";
import { Package, Sword, Shield, Flame, Coins, Plus, Minus, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { id: "weapons", label: "Broń", icon: Sword },
  { id: "armor", label: "Pancerz", icon: Shield },
  { id: "consumables", label: "Zużywalne", icon: Flame },
  { id: "gear", label: "Wyposażenie", icon: Package },
  { id: "coins", label: "Pieniądze", icon: Coins },
];

export default function InventoryPage() {
  const { inventory, setInventory } = useApp();
  const [activeCategory, setActiveCategory] = useState("all");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("gear");

  const filtered = activeCategory === "all" ? inventory : inventory.filter((i) => i.category === activeCategory);

  const updateQuantity = (id: string, delta: number) =>
    setInventory((prev) => prev.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));

  const removeItem = (id: string) => setInventory((prev) => prev.filter((i) => i.id !== id));

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setInventory((prev) => [...prev, { id: crypto.randomUUID(), name, category: newItemCategory, quantity: 1 }]);
    setNewItemName("");
  };

  const getCategoryIcon = (cat: string) => CATEGORIES.find((c) => c.id === cat)?.icon ?? Package;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-app-brand text-lg font-bold">Szybki ekwipunek</h1>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={activeCategory === "all" ? "default" : "secondary"} className="text-xs" onClick={() => setActiveCategory("all")}>Wszystko</Button>
        {CATEGORIES.map((cat) => (
          <Button key={cat.id} size="sm" variant={activeCategory === cat.id ? "default" : "secondary"} className="text-xs gap-1" onClick={() => setActiveCategory(cat.id)}>
            <cat.icon className="h-3 w-3" />{cat.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.map((item) => {
          const Icon = getCategoryIcon(item.category);
          const isLow = item.maxQuantity ? item.quantity <= Math.floor(item.maxQuantity * 0.25) : item.quantity === 0;
          return (
            <div key={item.id} className={`flex items-center justify-between px-3 py-2 rounded-md border bg-card ${isLow ? "border-destructive/30" : ""}`}>
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className={`text-sm font-medium truncate ${item.quantity === 0 ? "text-muted-foreground line-through" : ""}`}>{item.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                <span className={`text-sm font-bold min-w-[2ch] text-center ${isLow ? "text-destructive" : ""}`}>
                  {item.quantity}{item.maxQuantity && <span className="text-muted-foreground font-normal">/{item.maxQuantity}</span>}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => removeItem(item.id)}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Brak przedmiotów w tej kategorii</CardContent></Card>
        )}
      </div>

      <section>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Dodaj przedmiot</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Nazwa…"
            className="flex-1 h-9 px-3 text-sm rounded-md border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="h-9 px-2 text-xs rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <Button size="sm" onClick={addItem} className="gap-1"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </section>
    </div>
  );
}
