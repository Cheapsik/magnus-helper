import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { newId } from "@/lib/cardSchema";
import { Button } from "@/components/ui/button";
import { iconBtn, inputCls } from "@/components/system/controls";
import { useProgressionConfig, type ProgressionTier } from "@/lib/progression";

/** GM editor: XP threshold and reward for each level (level 1 is the start, so tiers begin at 2). */
export function ProgressionSettings() {
  const [config, setConfig] = useProgressionConfig();
  const tiers = [...config.tiers].sort((a, b) => a.level - b.level);

  const patch = (id: string, p: Partial<ProgressionTier>) =>
    setConfig({ tiers: config.tiers.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const add = () =>
    setConfig({
      tiers: [...config.tiers, { id: newId(), level: (tiers.at(-1)?.level ?? 1) + 1, xp: (tiers.at(-1)?.xp ?? 0) + 100, reward: "" }],
    });

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-[length:--fs-meta] text-muted-foreground">
        Każdy poziom ma próg PD (łącznie) i nagrodę, np. „+1 do dowolnej cechy” albo „nowa umiejętność”. Bohaterowie startują na poziomie 1.
        Kolumny: poziom, próg PD, nagroda.
      </p>
      {tiers.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Brak progów. Dodaj pierwszy poziom.
        </p>
      )}
      <ul className="space-y-1">
        {tiers.map((t) => (
          <li key={t.id} className="flex items-center gap-1.5 rounded-md border border-border/70 px-2 py-1">
            <input type="number" min={2} className={cn(inputCls, "w-16")} value={t.level} aria-label="Poziom"
              onChange={(e) => patch(t.id, { level: Math.max(2, Number(e.target.value) || 2) })} />
            <input type="number" min={0} className={cn(inputCls, "w-24")} value={t.xp} aria-label="Próg PD"
              onChange={(e) => patch(t.id, { xp: Math.max(0, Number(e.target.value) || 0) })} />
            <input className={cn(inputCls, "flex-1")} value={t.reward} placeholder="Nagroda, np. +1 do dowolnej cechy" aria-label="Nagroda"
              onChange={(e) => patch(t.id, { reward: e.target.value })} />
            <button type="button" className={cn(iconBtn, "hover:text-destructive")} aria-label={`Usuń poziom ${t.level}`}
              onClick={() => setConfig({ tiers: config.tiers.filter((x) => x.id !== t.id) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Dodaj poziom
      </Button>
    </div>
  );
}
