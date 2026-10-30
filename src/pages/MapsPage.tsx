import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, MapPinPlus, MonitorUp, MonitorX, Pencil, Search, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDrawer } from "@/context/DrawerContext";
import { useAuth } from "@/context/AuthContext";
import { useCampaigns } from "@/context/CampaignContext";
import { getImage, deleteImage, IMAGE_ACCEPT, isImageFile, putImage } from "@/lib/imageStore";
import { MAPS_KEY, newMap, newPin, removeMap, updatePin, type CampaignMap, type MapPin } from "@/lib/maps";
import { MapCanvas, PIN_ICON_COMPONENTS } from "@/components/maps/MapCanvas";
import { linkKey, PinEditorDialog, PinPopover, useLinkTargets, type LinkTarget } from "@/components/maps/PinPanels";
import { useMapImage } from "@/components/maps/useMapImage";
import { showMapToPlayers, usePlayerScreen } from "@/lib/playerScreen";
import { shareMapAsMaterial } from "@/lib/sharedCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { confirmDialog, promptDialog } from "@/components/ui/dialogs";

function MapThumb({ map, onOpen, onRename, onDelete }: { map: CampaignMap; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const url = useMapImage(map.id);
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onOpen} className="block aspect-video w-full bg-muted">
        {url ? <img src={url} alt={map.name} className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">Brak obrazu</span>}
      </button>
      <CardContent className="flex items-center gap-1 p-2">
        <button type="button" onClick={onOpen} className="flex-1 truncate text-left text-sm font-medium">{map.name}</button>
        <span className="text-xs text-muted-foreground">{map.pins.length}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRename} aria-label="Zmień nazwę"><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} aria-label="Usuń mapę"><Trash2 className="h-3.5 w-3.5" /></Button>
      </CardContent>
    </Card>
  );
}

export default function MapsPage() {
  const [maps, setMaps] = useLocalStorage<CampaignMap[]>(MAPS_KEY, []);
  const [stack, setStack] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [screen] = usePlayerScreen();
  const { activeCampaign } = useCampaigns();
  const { user } = useAuth();

  const [addMode, setAddMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { openDrawer } = useDrawer();
  const navigate = useNavigate();
  const targets = useLinkTargets(maps);
  const targetsByKey = useMemo(() => new Map(targets.map((t) => [linkKey(t), t])), [targets]);

  const current = maps.find((m) => m.id === stack.at(-1));
  const imageUrl = useMapImage(current?.id);

  const openMap = (id: string) => {
    setStack((s) => [...s, id]);
    setSelectedPinId(null);
    setAddMode(false);
  };
  const goBack = () => {
    setStack((s) => s.slice(0, -1));
    setSelectedPinId(null);
    setAddMode(false);
  };

  const createMap = async (file: File) => {
    if (!isImageFile(file)) { toast.error("Obsługiwane formaty: png, jpg, webp, gif"); return; }
    const map = newMap(newName.trim() || file.name.replace(/\.[^.]+$/, ""));
    setBusy(true);
    try {
      await putImage(map.id, file);
    } catch {
      toast.error("Nie udało się zapisać obrazu (brak miejsca w przeglądarce?)");
      return;
    } finally {
      setBusy(false);
    }
    setMaps((prev) => [...prev, map]);
    setNewName("");
  };

  const renameMap = async (map: CampaignMap) => {
    const name = (await promptDialog("Nowa nazwa mapy", { defaultValue: map.name }))?.trim();
    if (name) setMaps((prev) => prev.map((m) => (m.id === map.id ? { ...m, name } : m)));
  };

  const deleteMap = async (map: CampaignMap) => {
    if (!(await confirmDialog(`Usunąć mapę „${map.name}” razem z jej pinezkami?`, { confirmLabel: "Usuń", destructive: true }))) return;
    setMaps((prev) => removeMap(prev, map.id));
    setStack((s) => s.filter((id) => id !== map.id));
    deleteImage(map.id).catch(() => {});
  };

  const setPins = (fn: (pins: MapPin[]) => MapPin[]) =>
    current && setMaps((prev) => prev.map((m) => (m.id === current.id ? { ...m, pins: fn(m.pins) } : m)));

  const patchPin = (pinId: string, patch: Partial<MapPin>) => current && setMaps((prev) => updatePin(prev, current.id, pinId, patch));

  const openLink = (link: LinkTarget) => {
    if (link.kind === "map") openMap(link.id);
    else if (link.kind === "faction") navigate("/factions");
    else openDrawer(link.kind, link.id, link.name);
  };

  const handleShareWithPlayers = async () => {
    if (!current) return;
    if (!activeCampaign) { toast.error("Brak aktywnej kampanii"); return; }
    if (!user) {
      toast.error("Aby udostępniać graczom, zaloguj się przez zakładkę Materiały");
      return;
    }
    setSharing(true);
    try {
      const blob = await getImage(current.id);
      if (!blob) { toast.error("Nie znaleziono obrazu mapy w pamięci przeglądarki"); return; }
      await shareMapAsMaterial(activeCampaign.id, activeCampaign.name, current.name, blob);
      toast.success(`Mapa „${current.name}" udostępniona — pojawi się u graczy`);
    } catch (e) {
      console.error("[Magnus] shareMap error:", e);
      toast.error(e instanceof Error ? e.message : "Coś poszło nie tak");
    } finally {
      setSharing(false);
    }
  };

  if (!current) {
    return (
      <div className="space-y-5 animate-fade-in">
        <section className="space-y-1.5">
          <label className="field-label block">Mapy ({maps.length})</label>
          {maps.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Brak map. Wgraj własny obraz mapy, by dodać pinezki.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {maps.map((m) => (
                <MapThumb key={m.id} map={m} onOpen={() => openMap(m.id)} onRename={() => renameMap(m)} onDelete={() => deleteMap(m)} />
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nazwa nowej mapy (opcjonalnie)…" className="h-9 flex-1" />
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void createMap(f);
              }}
            />
            <Button size="sm" className="gap-1" disabled={busy} onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" />Wgraj mapę
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const listed = current.pins.filter((p) => !q || p.label.toLowerCase().includes(q) || p.note.toLowerCase().includes(q));
  const editingPin = current.pins.find((p) => p.id === editingPinId) ?? null;
  const parent = maps.find((m) => m.id === stack.at(-2));

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[420px] flex-col gap-2 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" className="gap-1" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />{parent ? parent.name : "Mapy"}
        </Button>
        <h2 className="flex-1 truncate font-semibold">{current.name}</h2>
        <Button size="sm" variant={addMode ? "default" : "outline"} className="gap-1" onClick={() => setAddMode((v) => !v)}>
          <MapPinPlus className="h-3.5 w-3.5" />{addMode ? "Kliknij na mapie…" : "Dodaj pinezkę"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={sharing}
          onClick={() => void handleShareWithPlayers()}
          aria-label="Udostępnij mapę graczom (chmura)"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          Udostępnij graczom
        </Button>
        {screen.mapId === current.id ? (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1"
            onClick={() => {
              showMapToPlayers(null);
              toast.success("Mapa zdjęta z ekranu graczy");
            }}
            aria-label="Zdejmij mapę z lokalnego ekranu graczy"
          >
            <MonitorX className="h-3.5 w-3.5" />Zdejmij z ekranu
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              if (showMapToPlayers(current.id)) toast.success("Mapa pokazana na ekranie graczy");
              else toast.error("Nie udało się zapisać — za mało miejsca");
            }}
            aria-label="Pokaż mapę na lokalnym ekranie graczy"
          >
            <MonitorUp className="h-3.5 w-3.5" />Ekran graczy
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => renameMap(current)} aria-label="Zmień nazwę"><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMap(current)} aria-label="Usuń mapę"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <div className="min-h-[300px] flex-1">
          {imageUrl ? (
            <MapCanvas
              key={current.id}
              imageUrl={imageUrl}
              pins={current.pins}
              addMode={addMode}
              selectedPinId={selectedPinId}
              onSelect={setSelectedPinId}
              onAddPin={(x, y) => {
                const pin = newPin(x, y);
                setPins((pins) => [...pins, pin]);
                setAddMode(false);
                setSelectedPinId(pin.id);
                setEditingPinId(pin.id);
              }}
              onMovePin={(id, x, y) => patchPin(id, { x, y })}
              renderPopover={(pin) => (
                <PinPopover
                  pin={pin}
                  targets={targetsByKey}
                  onOpenLink={openLink}
                  onEdit={() => setEditingPinId(pin.id)}
                  onDelete={async () => {
                    if (!(await confirmDialog(`Usunąć pinezkę „${pin.label}”?`, { confirmLabel: "Usuń", destructive: true }))) return;
                    setPins((pins) => pins.filter((p) => p.id !== pin.id));
                    setSelectedPinId(null);
                  }}
                  onClose={() => setSelectedPinId(null)}
                />
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border text-sm text-muted-foreground">Wczytywanie obrazu…</div>
          )}
        </div>

        <aside className="flex max-h-60 flex-col gap-1.5 md:max-h-none md:w-64">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj pinezek…" className="h-8 pl-7 text-sm" />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {listed.length === 0 && <p className="p-2 text-xs text-muted-foreground">{current.pins.length ? "Brak wyników" : "Brak pinezek"}</p>}
            {listed.map((p) => {
              const Icon = PIN_ICON_COMPONENTS[p.icon];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPinId(p.id)}
                  className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent", p.id === selectedPinId && "bg-accent")}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: p.color }}>
                    {Icon && <Icon className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <PinEditorDialog
        pin={editingPin}
        mapId={current.id}
        targets={targets}
        onSave={(patch) => editingPin && patchPin(editingPin.id, patch)}
        onClose={() => setEditingPinId(null)}
      />
    </div>
  );
}
