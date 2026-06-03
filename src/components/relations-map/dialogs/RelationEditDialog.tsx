import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { EdgeForm } from "../shared/EdgeForm";
import type { EdgeDraft } from "../types";

export function RelationEditDialog({
  open,
  onOpenChange,
  title,
  draft,
  setDraft,
  allTypes,
  onSave,
  onDelete,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  draft: EdgeDraft;
  setDraft: React.Dispatch<React.SetStateAction<EdgeDraft>>;
  allTypes: string[];
  onSave: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <EdgeForm draft={draft} setDraft={setDraft} allTypes={allTypes} />
        <DialogFooter className="gap-2">
          {canDelete && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Usuń
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={onSave}
            disabled={draft.customType !== null && !draft.customType?.trim()}
          >
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
