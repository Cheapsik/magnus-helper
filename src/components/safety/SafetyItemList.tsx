import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addItem } from "@/lib/safety";

/** Editable list of short agreement items (hard lines or veils). */
export function SafetyItemList({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    onChange(addItem(items, draft));
    setDraft("");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak wpisów.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <span className="flex-1 min-w-0 break-words">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Usuń: ${item}`}
                  onClick={() => onChange(items.filter((i) => i !== item))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input aria-label={`Nowy wpis: ${title}`} placeholder="Krótki wpis…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" variant="outline" size="icon" aria-label="Dodaj" disabled={!draft.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
