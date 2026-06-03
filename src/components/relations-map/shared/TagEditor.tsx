import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TagEditor({
  tags,
  onAdd,
  onRemove,
  suggestions,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
  suggestions: string[];
}) {
  const [v, setV] = useState("");
  const unused = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-border bg-secondary/40"
        >
          {t}
          <button type="button" onClick={() => onRemove(t)} className="hover:text-destructive">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-[9px] px-1.5 py-0.5 border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
          >
            + tag
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2 space-y-2">
          <div className="flex gap-1">
            <Input
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder="Nowy tag…"
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && v.trim()) {
                  onAdd(v.trim());
                  setV("");
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                if (v.trim()) {
                  onAdd(v.trim());
                  setV("");
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {unused.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {unused.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onAdd(s)}
                  className="text-[9px] px-1 py-0.5 border border-border hover:border-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function QuickHistoryAdder({ onAdd }: { onAdd: (m: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1 mb-2">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Dodaj wpis do historii…"
        className="h-8 text-xs"
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      />
      <Button
        size="sm"
        className="h-8"
        onClick={() => {
          if (v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
