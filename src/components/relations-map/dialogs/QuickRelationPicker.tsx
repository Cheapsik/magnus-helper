import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { typeColor } from "../colors";
import { BUILTIN_TYPES } from "../constants";

interface QuickRelationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  targetName: string;
  customTypes: string[];
  onPick: (relationType: string) => void;
}

export function QuickRelationPicker({
  open,
  onOpenChange,
  sourceName,
  targetName,
  customTypes,
  onPick,
}: QuickRelationPickerProps) {
  const allTypes = [
    ...BUILTIN_TYPES,
    ...customTypes.filter((t) => !(BUILTIN_TYPES as readonly string[]).includes(t)),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Nowa relacja</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">
          {sourceName} → {targetName}
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
          {allTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="text-left text-xs px-2 py-2 border border-border hover:border-primary bg-card/60 transition-colors truncate"
              style={{ borderLeftWidth: 3, borderLeftColor: typeColor(t) }}
            >
              {t}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
