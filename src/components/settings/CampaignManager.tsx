import { useState } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaigns } from "@/context/CampaignContext";
import type { Campaign } from "@/lib/campaignStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Decyzja 1: pełne zarządzanie cyklem życia kampanii żyje w Ustawieniach. */
export default function CampaignManager() {
  const { campaigns, activeCampaignId, createCampaign, renameCampaign, archiveCampaign, unarchiveCampaign, deleteCampaign, switchCampaign } =
    useCampaigns();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<Campaign | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const active = campaigns.filter((c) => !c.archivedAt);
  const archived = campaigns.filter((c) => c.archivedAt);

  const rowBtn = cn(
    "p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-white/[0.06]",
  );

  const submitCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCampaign(trimmed);
    setNewName("");
    setCreating(false);
  };

  const submitRename = () => {
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameCampaign(renaming.id, trimmed);
    setRenaming(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteInput.trim() !== deleteTarget.name) return;
    deleteCampaign(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteInput("");
  };

  const renderRow = (campaign: Campaign) => {
    const isActive = campaign.id === activeCampaignId;
    return (
      <li
        key={campaign.id}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-white/[0.02] px-3 py-2.5",
          isActive && "border-primary/40 bg-primary/[0.06]",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            <span className="text-sm text-foreground truncate">{campaign.name}</span>
          </div>
          {isActive && <span className="text-[11px] text-muted-foreground">Aktywna</span>}
        </div>
        {!isActive && !campaign.archivedAt && (
          <Button size="sm" variant="ghost" onClick={() => switchCampaign(campaign.id)}>
            Przełącz
          </Button>
        )}
        <button
          type="button"
          className={rowBtn}
          aria-label="Zmień nazwę"
          onClick={() => {
            setRenaming(campaign);
            setRenameValue(campaign.name);
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {campaign.archivedAt ? (
          <button
            type="button"
            className={rowBtn}
            aria-label="Przywróć z archiwum"
            onClick={() => unarchiveCampaign(campaign.id)}
          >
            <ArchiveRestore className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className={rowBtn}
            aria-label="Archiwizuj"
            onClick={() => archiveCampaign(campaign.id)}
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          className={cn(rowBtn, "hover:text-destructive")}
          aria-label="Usuń"
          onClick={() => {
            setDeleteTarget(campaign);
            setDeleteInput("");
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">Kampanie</h2>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nowa kampania
        </Button>
      </div>

      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">Nie masz jeszcze żadnej kampanii — utwórz pierwszą.</p>
      )}

      {active.length > 0 && <ul className="space-y-2">{active.map(renderRow)}</ul>}

      {archived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/60">
            Zarchiwizowane
          </h3>
          <ul className="space-y-2">{archived.map(renderRow)}</ul>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa kampania</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nazwa kampanii"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Anuluj
            </Button>
            <Button onClick={submitCreate} disabled={!newName.trim()}>
              Utwórz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień nazwę kampanii</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Anuluj
            </Button>
            <Button onClick={submitRename} disabled={!renameValue.trim()}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć kampanię „{deleteTarget?.name}”?</DialogTitle>
            <DialogDescription>
              Usunięte zostaną wszystkie dane tej kampanii (bohaterowie, NPC, notatki, questy i pozostałe). Tej
              operacji nie można cofnąć. Wpisz nazwę kampanii, aby potwierdzić.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={deleteInput}
            placeholder={deleteTarget?.name}
            onChange={(e) => setDeleteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmDelete();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" disabled={deleteInput.trim() !== deleteTarget?.name} onClick={confirmDelete}>
              Usuń kampanię
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
