import { useState, useCallback, useEffect } from "react";
import { Plus, Square, Play, Pause, Volume2, AlertTriangle, MoreVertical, ChevronUp, ChevronDown, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAmbient, type SoundItem, type Category } from "@/context/AmbientContext";
import { unlockMobileAudio } from "@/lib/mobileAudioUnlock";
import { EmojiPickerButton } from "@/components/emoji/EmojiPickerButton";

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function AmbientPage() {
  const {
    config, setConfig,
    playing, paused, fading, errors, volumes,
    masterVolume, setMasterVolume,
    toggleSound, stopSoundWithFade, stopAll, changeVolume, killSound,
  } = useAmbient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [form, setForm] = useState({ name: "", emoji: "🔊", url: "", type: "loop" as "loop" | "effect", categoryId: "", newCategory: "", volume: 70 });
  const [showTouchHint, setShowTouchHint] = useState(false);

  const anyPlaying = Object.values(playing).some(Boolean);

  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      setShowTouchHint(true);
    }
  }, []);

  const dismissTouchHint = useCallback(() => setShowTouchHint(false), []);

  const handleToggleSound = useCallback((sound: SoundItem) => {
    unlockMobileAudio();
    dismissTouchHint();
    toggleSound(sound);
  }, [toggleSound, dismissTouchHint]);

  const save = useCallback((fn: (c: typeof config) => typeof config) => {
    setConfig((prev) => fn(prev));
  }, [setConfig]);

  const openAddModal = () => {
    setEditingSound(null);
    setForm({ name: "", emoji: "🔊", url: "", type: "loop", categoryId: config.categories[0]?.id || "", newCategory: "", volume: 70 });
    setModalOpen(true);
  };

  const openEditModal = (sound: SoundItem) => {
    setEditingSound(sound);
    setForm({ name: sound.name, emoji: sound.emoji, url: sound.url, type: sound.type, categoryId: sound.categoryId, newCategory: "", volume: sound.volume });
    setModalOpen(true);
  };

  const saveModal = () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error("Nazwa i URL są wymagane"); return; }
    let catId = form.categoryId;
    let newCat: Category | null = null;
    if (catId === "__new__" && form.newCategory.trim()) {
      newCat = { id: genId(), name: form.newCategory.trim(), collapsed: false, emoji: "📌" };
      catId = newCat.id;
    }
    if (!catId) { toast.error("Wybierz kategorię"); return; }

    save((c) => {
      const cats = newCat ? [...c.categories, newCat] : c.categories;
      if (editingSound) {
        return {
          categories: cats,
          sounds: c.sounds.map((s) => s.id === editingSound.id
            ? { ...s, name: form.name.trim(), emoji: form.emoji || "🔊", url: form.url.trim(), type: form.type, categoryId: catId, volume: form.volume }
            : s),
        };
      } else {
        const ns: SoundItem = { id: genId(), name: form.name.trim(), emoji: form.emoji || "🔊", url: form.url.trim(), type: form.type, categoryId: catId, volume: form.volume };
        return { categories: cats, sounds: [...c.sounds, ns] };
      }
    });
    setModalOpen(false);
  };

  const deleteSound = (id: string) => { killSound(id); save((c) => ({ ...c, sounds: c.sounds.filter((s) => s.id !== id) })); };
  const moveToCategory = (soundId: string, catId: string) => { save((c) => ({ ...c, sounds: c.sounds.map((s) => s.id === soundId ? { ...s, categoryId: catId } : s) })); };
  const toggleCollapse = (catId: string) => { save((c) => ({ ...c, categories: c.categories.map((cat) => cat.id === catId ? { ...cat, collapsed: !cat.collapsed } : cat) })); };
  const renameCategory = (catId: string, name: string) => { save((c) => ({ ...c, categories: c.categories.map((cat) => cat.id === catId ? { ...cat, name } : cat) })); };
  const deleteCategory = (cat: Category) => {
    if (cat.id === "__uncategorized__") return;
    if (!confirm(`Usunąć kategorię '${cat.name}'? Dźwięki zostaną przeniesione do 'Bez kategorii'`)) return;
    save((c) => {
      const cats = c.categories.filter((ct) => ct.id !== cat.id);
      const sounds = c.sounds.map((s) => s.categoryId === cat.id ? { ...s, categoryId: "__uncategorized__" } : s);
      if (sounds.some((s) => s.categoryId === "__uncategorized__") && !cats.some((ct) => ct.id === "__uncategorized__")) {
        cats.push({ id: "__uncategorized__", name: "Bez kategorii", collapsed: false, emoji: "📂" });
      }
      return { categories: cats, sounds };
    });
  };
  const setCategoryEmoji = (catId: string, emoji: string) => {
    save((c) => ({
      ...c,
      categories: c.categories.map((cat) => (cat.id === catId ? { ...cat, emoji } : cat)),
    }));
  };
  const addCategory = () => { save((c) => ({ ...c, categories: [...c.categories, { id: genId(), name: "Nowa kategoria", collapsed: false, emoji: "📌" }] })); };

  const grouped = config.categories.map((cat) => ({ category: cat, sounds: config.sounds.filter((s) => s.categoryId === cat.id) }));
  const uncatSounds = config.sounds.filter((s) => !config.categories.some((c) => c.id === s.categoryId));
  if (uncatSounds.length > 0) {
    const uncatCat = config.categories.find((c) => c.id === "__uncategorized__") || { id: "__uncategorized__", name: "Bez kategorii", collapsed: false, emoji: "📂" };
    if (!grouped.some((g) => g.category.id === "__uncategorized__")) grouped.push({ category: uncatCat, sounds: uncatSounds });
  }

  return (
    <div className="space-y-4 pb-20">
      {showTouchHint && (
        <button
          type="button"
          className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-sm text-foreground"
          onPointerDown={() => { unlockMobileAudio(); dismissTouchHint(); }}
        >
          Dotknij dowolny dźwięk aby go odtworzyć
        </button>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">🎵 Ambient</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={stopAll} className="min-h-[44px]" disabled={!anyPlaying}>
            <Square className="h-4 w-4 mr-1" /> Zatrzymaj wszystko
          </Button>
          <Button size="sm" onClick={openAddModal} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-1" /> Dodaj dźwięk
          </Button>
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3">
        <Volume2 className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Master Volume</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{masterVolume}%</span>
          </div>
          <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={100} step={1} />
        </div>
      </Card>

      {grouped.map(({ category: cat, sounds }) => (
        <section key={cat.id} className="space-y-2">
          <div className="flex items-center gap-2 group">
            <button onClick={() => toggleCollapse(cat.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
              {cat.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <EmojiPickerButton
              emoji={cat.emoji ?? "📌"}
              onPick={(e) => setCategoryEmoji(cat.id, e)}
              className="h-8 min-w-[2rem] shrink-0 text-base"
            />
            <CategoryName name={cat.name} onRename={(n) => renameCategory(cat.id, n)} />
            <Badge variant="secondary" className="text-xs">{sounds.length} dźwięk{sounds.length === 1 ? "" : sounds.length < 5 ? "i" : "ów"}</Badge>
            {cat.id !== "__uncategorized__" && (
              <button onClick={() => deleteCategory(cat)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {!cat.collapsed && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sounds.map((sound) => (
                <SoundTile
                  key={sound.id}
                  sound={sound}
                  isPlaying={!!playing[sound.id]}
                  isPaused={!!paused[sound.id]}
                  isFading={!!fading[sound.id]}
                  hasError={!!errors[sound.id]}
                  volume={volumes[sound.id] ?? sound.volume}
                  onToggle={() => handleToggleSound(sound)}
                  onStop={() => stopSoundWithFade(sound.id)}
                  onVolumeChange={(v) => changeVolume(sound.id, v)}
                  onEdit={() => openEditModal(sound)}
                  onDelete={() => deleteSound(sound.id)}
                  categories={config.categories}
                  onMoveToCategory={(catId) => moveToCategory(sound.id, catId)}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      <Button variant="outline" size="sm" onClick={addCategory} className="min-h-[44px]">
        <Plus className="h-4 w-4 mr-1" /> Dodaj kategorię
      </Button>

      {anyPlaying && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-2 bg-card/95 backdrop-blur-md border-t md:hidden">
          <Button variant="destructive" className="w-full min-h-[44px]" onClick={stopAll}>
            <Square className="h-4 w-4 mr-1" /> Zatrzymaj wszystko
          </Button>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSound ? "Edytuj dźwięk" : "Dodaj dźwięk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nazwa *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nazwa dźwięku" />
            </div>
            <div className="space-y-1">
              <Label>Emoji ikony</Label>
              <div className="flex items-center gap-2">
                <EmojiPickerButton emoji={form.emoji} onPick={(e) => setForm((f) => ({ ...f, emoji: e }))} />
                <span className="text-xs text-muted-foreground">Kliknij aby wybrać</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL lub link YouTube *</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Wklej link YouTube lub bezpośredni URL do pliku mp3/ogg/wav</p>
            </div>
            <div className="space-y-1">
              <Label>Typ odtwarzania</Label>
              <RadioGroup value={form.type} onValueChange={(v: "loop" | "effect") => setForm((f) => ({ ...f, type: v }))} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="loop" id="type-loop" />
                  <Label htmlFor="type-loop">🔁 Pętla (ambient)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="effect" id="type-effect" />
                  <Label htmlFor="type-effect">▶ Efekt (jednorazowy)</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label>Kategoria</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Wybierz kategorię" /></SelectTrigger>
                <SelectContent>
                  {config.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="mr-1.5">{c.emoji ?? "📌"}</span>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">Nowa kategoria...</SelectItem>
                </SelectContent>
              </Select>
              {form.categoryId === "__new__" && (
                <Input className="mt-2" value={form.newCategory} onChange={(e) => setForm((f) => ({ ...f, newCategory: e.target.value }))} placeholder="Nazwa nowej kategorii" />
              )}
            </div>
            <div className="space-y-1">
              <Label>Głośność domyślna: {form.volume}%</Label>
              <Slider value={[form.volume]} onValueChange={([v]) => setForm((f) => ({ ...f, volume: v }))} min={0} max={100} step={1} className="py-2" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="min-h-[44px]">Anuluj</Button>
            <Button onClick={saveModal} className="min-h-[44px]">Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  if (editing) {
    return (
      <Input
        autoFocus value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { onRename(val.trim() || name); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onRename(val.trim() || name); setEditing(false); } }}
        className="h-8 text-sm font-semibold w-40"
      />
    );
  }
  return (
    <button onClick={() => { setVal(name); setEditing(true); }} className="text-sm font-semibold text-foreground hover:underline">
      {name}
    </button>
  );
}

function SoundTile({
  sound, isPlaying, isPaused, isFading, hasError, volume, onToggle, onStop, onVolumeChange, onEdit, onDelete, categories, onMoveToCategory,
}: {
  sound: SoundItem;
  isPlaying: boolean;
  isPaused: boolean;
  isFading: boolean;
  hasError: boolean;
  volume: number;
  onToggle: () => void;
  onStop: () => void;
  onVolumeChange: (v: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  categories: Category[];
  onMoveToCategory: (catId: string) => void;
}) {
  const active = isPlaying || isPaused;
  return (
    <Card className={cn(
      "relative flex flex-col p-3 transition-all",
      isPlaying && "bg-primary/10 ring-1 ring-primary/40 animate-pulse-subtle",
      isPaused && "bg-muted/50 ring-1 ring-muted-foreground/20",
      !active && "hover:shadow-md",
    )}>
      <div className="absolute top-1 right-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Edytuj</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Usuń</DropdownMenuItem>
            {categories.length > 1 && categories.filter((c) => c.id !== sound.categoryId).map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onMoveToCategory(c.id)}>
                <ArrowUpDown className="h-4 w-4 mr-2" /> → {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-start gap-2 pr-8 mb-2">
        <span className="text-2xl leading-none">{sound.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight line-clamp-2">{sound.name}</p>
          <Badge variant="secondary" className="text-[10px] mt-1">{sound.type === "loop" ? "pętla" : "efekt"}</Badge>
        </div>
      </div>

      <div
        className="flex items-center gap-2 mb-2 flex-1 min-w-0"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
        <Slider value={[volume]} onValueChange={([v]) => onVolumeChange(v)} min={0} max={100} step={1} className="flex-1 min-h-[44px]" />
      </div>

      <div className="flex gap-1.5">
        <Button
          variant={isPlaying ? "secondary" : isPaused ? "outline" : "default"}
          size="sm"
          className={cn("flex-1 min-h-[44px]", isFading && "opacity-50 pointer-events-none")}
          onClick={onToggle}
          disabled={isFading}
        >
          {hasError ? (
            <><AlertTriangle className="h-4 w-4 mr-1" /> Błąd</>
          ) : isFading ? (
            <>Wyciszanie…</>
          ) : isPlaying ? (
            <><Pause className="h-4 w-4 mr-1" /> Pauza</>
          ) : isPaused ? (
            <><Play className="h-4 w-4 mr-1" /> Wznów</>
          ) : (
            <><Play className="h-4 w-4 mr-1" /> Odtwórz</>
          )}
        </Button>
        {active && (
          <Button
            variant="destructive"
            size="sm"
            className={cn("min-h-[44px] min-w-[44px]", isFading && "opacity-50 pointer-events-none")}
            onClick={onStop}
            disabled={isFading}
            title="Zatrzymaj (fade out)"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
