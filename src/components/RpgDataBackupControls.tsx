import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportRpgStorageToFile, applyRpgStorageImport } from "@/lib/rpgStorageBackup";
import { cn } from "@/lib/utils";

const headerBtnClass = cn(
  "flex flex-col items-center justify-center gap-0.5 min-w-[3.25rem] px-1.5 py-1 rounded-md border border-border bg-card/60",
  "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
);

export default function RpgDataBackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

  const runExport = () => {
    setExportConfirmOpen(false);
    exportRpgStorageToFile();
  };

  const openFilePickerAfterImportConfirm = () => {
    setImportConfirmOpen(false);
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = applyRpgStorageImport(parsed);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        window.location.reload();
      } catch {
        toast.error("Niepoprawny plik JSON.");
      }
    };
    reader.onerror = () => toast.error("Nie udało się odczytać pliku.");
    reader.readAsText(file, "UTF-8");
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        onChange={handleFileChange}
      />

      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eksport danych</AlertDialogTitle>
            <AlertDialogDescription>
              Wyeksportować dane z tej przeglądarki? Zostanie pobrany plik JSON z kopią zapisanych danych aplikacji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={runExport}>Eksportuj</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import danych</AlertDialogTitle>
            <AlertDialogDescription>Chcesz zaimportować dane z pliku? Akcja nadpisze aktualne dane.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={openFilePickerAfterImportConfirm}>Importuj</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          className={headerBtnClass}
          onClick={() => setExportConfirmOpen(true)}
          aria-label="Eksport — pobierz kopię danych"
        >
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-medium leading-none tracking-tight">Eksport</span>
        </button>
        <button
          type="button"
          className={headerBtnClass}
          onClick={() => setImportConfirmOpen(true)}
          aria-label="Import — wczytaj kopię z pliku"
        >
          <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span className="text-[10px] font-medium leading-none tracking-tight">Import</span>
        </button>
      </div>
    </>
  );
}
