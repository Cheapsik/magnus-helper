import { useRef, useState } from "react";
import { Eraser, ExternalLink, ImagePlus, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLAYER_SCREEN, openPlayerScreenWindow, usePlayerScreen, type PlayerScreenState } from "@/lib/playerScreen";
import { setPlayerScreenPaused } from "@/lib/safety";
import { PlayerScreenView } from "./PlayerScreenView";
import { ShowToPlayersButton } from "./ShowToPlayersButton";

const MAX_IMAGE_SIDE = 1600;

/** Downscales an uploaded image to a JPEG data URL small enough for localStorage. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie udało się wczytać obrazu"));
    };
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.src = url;
  });
}

const TOGGLES: {
  key: keyof Pick<PlayerScreenState, "showInitiative" | "hideEnemyResources" | "showClocks" | "showSafety">;
  label: string;
}[] = [
  { key: "showInitiative", label: "Inicjatywa (aktywna walka)" },
  { key: "hideEnemyResources", label: "Ukryj zasoby wrogów" },
  { key: "showClocks", label: "Zegary oznaczone jako widoczne" },
  { key: "showSafety", label: "Ustalenia bezpieczeństwa (granice i zasłony)" },
];

/** GM-side controls for the second-window player screen. */
export function PlayerScreenControls() {
  const [screen, setScreen] = usePlayerScreen();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<PlayerScreenState>) => setScreen((prev) => ({ ...prev, ...patch }));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await readImage(file));
    } catch {
      toast.error("Nie udało się wczytać obrazu");
    }
  };

  const hasDraft = Boolean(title.trim() || text.trim() || image.trim());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={openPlayerScreenWindow}>
          <ExternalLink className="h-4 w-4 mr-1.5" />
          Otwórz ekran graczy
        </Button>
        <Button type="button" variant="outline" onClick={() => setScreen({ ...DEFAULT_PLAYER_SCREEN, hideEnemyResources: screen.hideEnemyResources })}>
          <Eraser className="h-4 w-4 mr-1.5" />
          Wyczyść ekran
        </Button>
        <Button
          type="button"
          variant={screen.paused ? "default" : "destructive"}
          onClick={() => setPlayerScreenPaused(!screen.paused)}
        >
          {screen.paused ? <Play className="h-4 w-4 mr-1.5" /> : <Pause className="h-4 w-4 mr-1.5" />}
          {screen.paused ? "Wznów ekran" : "Przerwa (karta X)"}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ps-blank">Pusty ekran (logo)</Label>
          <Switch id="ps-blank" checked={screen.blank} onCheckedChange={(v) => update({ blank: v })} />
        </div>
        {TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`ps-${key}`}>{label}</Label>
            <Switch
              id={`ps-${key}`}
              checked={screen[key]}
              // Turning on any content leaves blank mode, so the GM sees the effect at once.
              onCheckedChange={(v) => update(key === "hideEnemyResources" ? { [key]: v } : { [key]: v, blank: v ? false : screen.blank })}
            />
          </div>
        ))}
        {screen.handout && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">
              Materiał na ekranie: <span className="text-foreground">{screen.handout.title || "bez tytułu"}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => update({ handout: null })}>
              Zdejmij
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ps-title">Materiał dla graczy</Label>
        <Input id="ps-title" placeholder="Tytuł" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Treść (list, opis, zagadka…)" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2">
          <Input
            aria-label="Adres obrazu"
            placeholder="Adres obrazu (https://…) lub wgraj plik"
            value={image.startsWith("data:") ? "(wgrany obraz)" : image}
            onChange={(e) => setImage(e.target.value)}
          />
          <Button type="button" variant="outline" size="icon" aria-label="Wgraj obraz" onClick={() => fileInput.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <ShowToPlayersButton
          title={title.trim()}
          text={text.trim()}
          image={image.trim() || undefined}
          disabled={!hasDraft}
          variant="default"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ps-preview">Podgląd jako gracz</Label>
          <Switch id="ps-preview" checked={preview} onCheckedChange={setPreview} />
        </div>
        {preview && (
          <div className="aspect-video rounded-lg overflow-hidden border">
            <PlayerScreenView compact />
          </div>
        )}
      </div>
    </div>
  );
}
