import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { newId } from "@/lib/cardSchema";
import type { Condition } from "@/lib/campaignSystem";
import { useCampaignSystem } from "@/lib/cardStore";
import { AddRow } from "@/components/system/FieldEditor";
import { MoveButtons, iconBtn, inputCls } from "@/components/system/controls";

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** The campaign's list of "stany" (CONTEXT.md) offered by the conditions screen and the combat tracker. */
export function ConditionsEditor() {
  const [system, setSystem] = useCampaignSystem();
  const [draft, setDraft] = useState("");
  const conditions = system.conditions;

  const update = (fn: (prev: Condition[]) => Condition[]) =>
    setSystem((prev) => ({ ...prev, conditions: fn(prev.conditions) }));

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    update((prev) => [...prev, { id: newId(), name }]);
    setDraft("");
  };

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-[length:--fs-meta] text-muted-foreground">
        Stany to nazwane efekty, które nakładasz na uczestników walki i karty. Kolejność tutaj to kolejność na liście szybkiego
        dodawania.
      </p>

      {conditions.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Kampania nie ma jeszcze stanów. Dodaj pierwszy, np. „Ogłuszony" albo „Krwawienie".
          </p>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() =>
              update(() =>
                ["Ogłuszony", "Krwawienie", "Zatruty", "Powalony", "Oślepiony", "Przerażony"].map((name) => ({ id: newId(), name })),
              )
            }
          >
            Wstaw przykładowe stany
          </button>
        </div>
      ) : (
        <ul className="space-y-1">
          {conditions.map((condition, index) => (
            <li key={condition.id} className="flex items-center gap-1.5 rounded-md border border-border/70 px-2 py-1">
              <input
                className={cn(inputCls, "flex-1 field-inline")}
                value={condition.name}
                onChange={(e) =>
                  update((prev) => prev.map((c) => (c.id === condition.id ? { ...c, name: e.target.value } : c)))
                }
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    update((prev) => prev.map((c) => (c.id === condition.id ? { ...c, name: "Bez nazwy" } : c)));
                  }
                }}
                aria-label="Nazwa stanu"
              />
              <MoveButtons
                onMove={(direction) =>
                  update((prev) => {
                    const at = prev.findIndex((c) => c.id === condition.id);
                    return at < 0 ? prev : move(prev, at, direction);
                  })
                }
                first={index === 0}
                last={index === conditions.length - 1}
                label={condition.name}
              />
              <button
                type="button"
                className={cn(iconBtn, "hover:text-destructive")}
                onClick={() => update((prev) => prev.filter((c) => c.id !== condition.id))}
                aria-label={`Usuń stan: ${condition.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddRow placeholder="Nazwa nowego stanu" value={draft} onValue={setDraft} onAdd={add} />
    </div>
  );
}
