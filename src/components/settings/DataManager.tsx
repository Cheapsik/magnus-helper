import { useRef, useState } from "react";
import { Download, Upload, Trash2, FileDown, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
import { useCampaignSystem } from "@/lib/cardStore";
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

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DataManager() {
  const { exportData, importData, resetData } = useSettings();
  const [system, setSystem] = useCampaignSystem();
  const fileRef = useRef<HTMLInputElement>(null);
  const rulesFileRef = useRef<HTMLInputElement>(null);

  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingRulesFile, setPendingRulesFile] = useState<File | null>(null);
  const [resetStep, setResetStep] = useState<ResetStep>("closed");
  const [resetInput, setResetInput] = useState("");

  const onImportClick = () => fileRef.current?.click();
  const onRulesImportClick = () => rulesFileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) setPendingImportFile(file);
  };

  const onRulesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) setPendingRulesFile(file);
  };

  const exportRules = () => {
    try {
      const payload = { version: "1.0", kind: "magnus-rules", exportedAt: new Date().toISOString(), system };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_${dateStamp()}.magnus-rules.json`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("System wyeksportowany");
    } catch {
      toast.error("Nie udało się wyeksportować systemu");
    }
  };

  const confirmRulesImport = async () => {
    if (!pendingRulesFile) return;
    const f = pendingRulesFile;
    setPendingRulesFile(null);
    try {
      const parsed = JSON.parse(await f.text());
      if (!parsed?.system || typeof parsed.system !== "object" || parsed.kind !== "magnus-rules") {
        toast.error("To nie jest plik systemu Magnus (.magnus-rules.json)");
        return;
      }
      setSystem(parsed.system);
      toast.success("System zaimportowany");
    } catch {
      toast.error("Nieprawidłowy plik");
    }
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;
    const f = pendingImportFile;
    setPendingImportFile(null);
    try {
      await importData(f);
    } catch {

    }
  };

  const onResetConfirm = () => {
    if (resetInput.trim() !== "RESET") return;
    setResetStep("closed");
    setResetInput("");
    resetData();
  };

  const dataBtn = cn(
    "flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white/[0.02] px-4 py-3 text-sm text-foreground transition-[background,border-color] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
    "hover:border-white/[0.13] hover:bg-muted/80",
  );

  const dangerBtn = cn(
    dataBtn,
    "border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/40",
  );

  return (
    <section className="space-y-4">
      <h2 className="field-label">Dane</h2>

      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-hidden onChange={onFileChange} />
      <input ref={rulesFileRef} type="file" accept=".json,application/json" className="hidden" aria-hidden onChange={onRulesFileChange} />

      <div className="flex flex-col gap-2">
        <button type="button" className={dataBtn} onClick={exportData}>
          <Download className="h-4 w-4" />
          Eksportuj dane
        </button>

        <button type="button" className={dataBtn} onClick={onImportClick}>
          <Upload className="h-4 w-4" />
          Importuj dane
        </button>

        <button type="button" className={dangerBtn} onClick={() => setResetStep("confirm")}>
          <Trash2 className="h-4 w-4" />
          Resetuj wszystkie dane
        </button>
      </div>

      <h2 className="field-label pt-2">System mechaniczny</h2>
      <div className="flex flex-col gap-2">
        <button type="button" className={dataBtn} onClick={exportRules}>
          <FileDown className="h-4 w-4" />
          Eksportuj system
        </button>

        <button type="button" className={dataBtn} onClick={onRulesImportClick}>
          <FileUp className="h-4 w-4" />
          Importuj system
        </button>
      </div>

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

      <Dialog open={!!pendingRulesFile} onOpenChange={(open) => { if (!open) setPendingRulesFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import systemu</DialogTitle>
            <DialogDescription>
              Importowanie systemu nadpisze obecne typy testów, ataków, warunki, walutę i struktury kart. Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRulesFile(null)}>Anuluj</Button>
            <Button onClick={confirmRulesImport}>Importuj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
