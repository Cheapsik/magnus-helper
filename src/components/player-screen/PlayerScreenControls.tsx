import { useRef, useState } from "react";
import { Eraser, ExternalLink, ImagePlus, Pause, Play } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MAPS_KEY, type CampaignMap } from "@/lib/maps";
import { showMapToPlayers } from "@/lib/playerScreen";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLAYER_SCREEN, openPlayerScreenWindow, usePlayerScreen, type PlayerScreenState } from "@/lib/playerScreen";
import { setPlayerScreenPaused } from "@/lib/safety";
import { shrinkImage } from "@/lib/images";
import { PlayerScreenView } from "./PlayerScreenView";
import { PlayerVisibilitySettings } from "./PlayerVisibilitySettings";
import { ShowToPlayersButton } from "./ShowToPlayersButton";

const MAX_IMAGE_SIDE = 1600;

/** Downscales an uploaded image to a JPEG data URL small enough for localStorage. */
const readImage = async (file: File) => (await shrinkImage(file, MAX_IMAGE_SIDE)).toDataURL("image/jpeg", 0.85);

const TOGGLES: {
  key: keyof Pick<PlayerScreenState, "showInitiative" | "hideEnemyResources" | "showClocks" | "showSafety">;
  label: string;
}[] = [
  { key: "showInitiative", label: "Inicjatywa (aktywna walka)" },
  { key: "hideEnemyResources", label: "Ukryj zasoby wrogów" },
  { key: "showClocks", label: "Koła postępu oznaczone jako widoczne" },
  { key: "showSafety", label: "Ustalenia bezpieczeństwa (granice i zasłony)" },
];

/** GM-side controls for the second-window player screen. */
export function PlayerScreenControls() {
  const [screen, setScreen] = usePlayerScreen();
  const [maps] = useLocalStorage<CampaignMap[]>(MAPS_KEY, []);
  const shownMap = maps.find((m) => m.id === screen.mapId);
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
        {shownMap && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">
              Mapa na ekranie: <span className="text-foreground">{shownMap.name}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => showMapToPlayers(null)}>
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

      <div className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Panel gracza</h3>
        <PlayerVisibilitySettings />
      </div>
    </div>
  );
}
