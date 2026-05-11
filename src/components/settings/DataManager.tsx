import { useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
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

type ResetStep = "closed" | "confirm" | "type-reset";

export default function DataManager() {
  const { exportData, importData, resetData } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [resetStep, setResetStep] = useState<ResetStep>("closed");
  const [resetInput, setResetInput] = useState("");

  const onImportClick = () => fileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) setPendingImportFile(file);
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;
    const f = pendingImportFile;
    setPendingImportFile(null);
    try {
      await importData(f);
    } catch {
      /* toast obsłużony w contextcie */
    }
  };

  const onResetConfirm = () => {
    if (resetInput.trim() !== "RESET") return;
    setResetStep("closed");
    setResetInput("");
    resetData();
  };

  const ghostBtn = cn(
    "w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm",
    "border border-border bg-transparent text-foreground",
    "hover:bg-white/[0.04] hover:border-primary/60 transition-colors",
  );

  return (
    <section className="space-y-3">
      <h2 className="font-display text-base tracking-wide text-foreground">Dane</h2>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        onChange={onFileChange}
      />

      <div className="space-y-2">
        <button type="button" className={ghostBtn} onClick={exportData}>
          <Download className="h-4 w-4" />
          Eksportuj dane
        </button>

        <button type="button" className={ghostBtn} onClick={onImportClick}>
          <Upload className="h-4 w-4" />
          Importuj dane
        </button>

        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm transition-colors",
            "border bg-transparent",
          )}
          style={{
            color: "var(--accent-red)",
            borderColor: "var(--accent-red)",
          }}
          onClick={() => setResetStep("confirm")}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 26, 26, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <Trash2 className="h-4 w-4" />
          Resetuj wszystkie dane
        </button>
      </div>

      {/* Import confirm */}
      <Dialog
        open={!!pendingImportFile}
        onOpenChange={(open) => {
          if (!open) setPendingImportFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import danych</DialogTitle>
            <DialogDescription>
              Importowanie danych nadpisze wszystkie obecne dane aplikacji. Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImportFile(null)}>
              Anuluj
            </Button>
            <Button onClick={confirmImport}>Importuj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset — krok 1 */}
      <Dialog
        open={resetStep === "confirm"}
        onOpenChange={(open) => {
          if (!open) {
            setResetStep("closed");
            setResetInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć wszystkie dane?</DialogTitle>
            <DialogDescription>
              Bestiarium, NPC, Wątki, Sceny, Notatki — wszystko zostanie usunięte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetStep("closed")}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setResetInput("");
                setResetStep("type-reset");
              }}
            >
              Tak, usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset — krok 2 (wpisz RESET) */}
      <Dialog
        open={resetStep === "type-reset"}
        onOpenChange={(open) => {
          if (!open) {
            setResetStep("closed");
            setResetInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wpisz RESET aby potwierdzić</DialogTitle>
            <DialogDescription>
              Ostatni krok. Po potwierdzeniu wszystkie dane aplikacji zostaną nieodwracalnie usunięte.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={resetInput}
            placeholder="RESET"
            onChange={(e) => setResetInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resetInput.trim() === "RESET") onResetConfirm();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetStep("closed");
                setResetInput("");
              }}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              disabled={resetInput.trim() !== "RESET"}
              onClick={onResetConfirm}
            >
              Potwierdź
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
