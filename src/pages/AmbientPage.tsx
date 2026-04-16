import { useState, useCallback, useRef, useEffect } from "react";
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { unlockMobileAudio } from "@/lib/mobileAudioUnlock";

// --- Types ---

interface SoundItem {
  id: string;
  name: string;
  emoji: string;
  url: string;
  type: "loop" | "effect";
  categoryId: string;
  volume: number;
}

interface Category {
  id: string;
  name: string;
  collapsed: boolean;
}

interface SoundboardConfig {
  categories: Category[];
  sounds: SoundItem[];
}

// --- Defaults ---

const DEFAULT_CONFIG: SoundboardConfig = {
  categories: [
    { id: "env", name: "Środowisko", collapsed: false },
    { id: "music", name: "Muzyka", collapsed: false },
    { id: "fx", name: "Efekty", collapsed: false },
  ],
  sounds: [
    { id: "s1", name: "Deszcz", emoji: "🌧️", url: "https://www.youtube.com/watch?v=q76bMs-NwRk", type: "loop", categoryId: "env", volume: 70 },
    { id: "s2", name: "Las — ptaki", emoji: "🌲", url: "https://www.youtube.com/watch?v=xNN7iTA57jM", type: "loop", categoryId: "env", volume: 70 },
    { id: "s3", name: "Miasto — gwar", emoji: "🏙️", url: "https://www.youtube.com/watch?v=3sL0omwElxw", type: "loop", categoryId: "env", volume: 70 },
    { id: "s4", name: "Karczma — muzyka", emoji: "🏰", url: "https://www.youtube.com/watch?v=vyg5jJrZ42s", type: "loop", categoryId: "music", volume: 70 },
    { id: "s5", name: "Bitwa — epicka", emoji: "⚔️", url: "https://www.youtube.com/watch?v=nso6Vhg0p9k", type: "loop", categoryId: "music", volume: 70 },
    { id: "s6", name: "Podziemia — mroczny ambient", emoji: "🕌", url: "https://www.youtube.com/watch?v=TVGsIU4WFF4", type: "loop", categoryId: "music", volume: 70 },
    { id: "s8", name: "Dzwon kościelny", emoji: "🔔", url: "https://www.youtube.com/watch?v=D1hddNfO7C0", type: "loop", categoryId: "fx", volume: 70 },
  ],
};

const YT_REGEX = /(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/** Minimalny typ playera IFrame API (bez pełnych definicji YT). */
type YTPlayerLike = {
  stopVideo?: () => void;
  destroy?: () => void;
  pauseVideo?: () => void;
  playVideo?: () => void;
  setVolume?: (v: number) => void;
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(YT_REGEX);
  return m ? m[2] : null;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// --- YouTube API loader ---

let ytApiLoading = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function ensureYTApi(cb: () => void) {
  if (ytApiReady) { cb(); return; }
  ytReadyCallbacks.push(cb);
  if (ytApiLoading) return;
  ytApiLoading = true;
  const w = window as Window & { onYouTubeIframeAPIReady?: () => void };
  w.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytReadyCallbacks.forEach(fn => fn());
    ytReadyCallbacks.length = 0;
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

// --- Component ---

export default function AmbientPage() {
  const [config, setConfig] = useLocalStorage<SoundboardConfig>("rpg_soundboard_config", DEFAULT_CONFIG);

  // Active playback state (not persisted)
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const ytPlayerRefs = useRef<Record<string, YTPlayerLike>>({});
  const fadeTimers = useRef<Record<string, number>>({});
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const pendingYtPlayRef = useRef<Set<string>>(new Set());
  const [ytLoading, setYtLoading] = useState<Record<string, boolean>>({});
  const [showTouchHint, setShowTouchHint] = useState(false);

  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    config.sounds.forEach(s => { v[s.id] = s.volume; });
    return v;
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [form, setForm] = useState({ name: "", emoji: "🔊", url: "", type: "loop" as "loop" | "effect", categoryId: "", newCategory: "", volume: 70 });

  const anyPlaying = Object.values(playing).some(Boolean);

  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      setShowTouchHint(true);
    }
  }, []);

  // Sync volumes from config when sounds change
  useEffect(() => {
    setVolumes(prev => {
      const next = { ...prev };
      config.sounds.forEach(s => {
        if (!(s.id in next)) next[s.id] = s.volume;
      });
      return next;
    });
  }, [config.sounds]);

  const save = useCallback((fn: (c: SoundboardConfig) => SoundboardConfig) => {
    setConfig(prev => fn(prev));
  }, [setConfig]);

  // --- Audio playback ---

  const FADE_DURATION = 1500; // ms
  const FADE_STEPS = 30;

  const killSound = useCallback((id: string) => {
    pendingYtPlayRef.current.delete(id);
    setYtLoading((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (fadeTimers.current[id]) { clearInterval(fadeTimers.current[id]); delete fadeTimers.current[id]; }
    const audio = audioRefs.current[id];
    if (audio) { audio.pause(); audio.currentTime = 0; delete audioRefs.current[id]; }
    const yt = ytPlayerRefs.current[id];
    if (yt) {
      try { yt.stopVideo(); yt.destroy(); } catch { /* ignore */ }
      delete ytPlayerRefs.current[id];
      document.getElementById(`yt-player-${id}`)?.remove();
    }
    setPlaying(p => ({ ...p, [id]: false }));
    setPaused(p => ({ ...p, [id]: false }));
    setErrors(e => ({ ...e, [id]: false }));
  }, []);

  const fadeOutAndStop = useCallback((id: string) => {
    const audio = audioRefs.current[id];
    const yt = ytPlayerRefs.current[id];
    const targetVol = volumes[id] ?? 70;
    let currentStep = 0;

    const interval = window.setInterval(() => {
      currentStep++;
      const ratio = 1 - currentStep / FADE_STEPS;
      const vol = Math.max(0, targetVol * ratio);
      if (audio) audio.volume = vol / 100;
      if (yt) try { yt.setVolume(vol); } catch { /* ignore */ }
      if (currentStep >= FADE_STEPS) {
        clearInterval(interval);
        delete fadeTimers.current[id];
        killSound(id);
      }
    }, FADE_DURATION / FADE_STEPS);
    fadeTimers.current[id] = interval;
  }, [killSound, volumes]);

  const pauseSound = useCallback((id: string) => {
    pendingYtPlayRef.current.delete(id);
    setYtLoading((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const audio = audioRefs.current[id];
    if (audio) audio.pause();
    const yt = ytPlayerRefs.current[id];
    if (yt) try { yt.pauseVideo(); } catch { /* ignore */ }
    setPlaying(p => ({ ...p, [id]: false }));
    setPaused(p => ({ ...p, [id]: true }));
  }, []);

  const resumeSound = useCallback((id: string) => {
    const vol = (volumes[id] ?? 70) / 100;
    const audio = audioRefs.current[id];
    if (audio) {
      audio.volume = vol;
      const pr = audio.play();
      if (pr !== undefined) {
        pr
          .then(() => {
            setPlaying((p) => ({ ...p, [id]: true }));
            setPaused((p) => ({ ...p, [id]: false }));
          })
          .catch(() => {
            setErrors((e) => ({ ...e, [id]: true }));
            setPlaying((p) => ({ ...p, [id]: false }));
            setPaused((p) => ({ ...p, [id]: true }));
          });
        return;
      }
    }
    const yt = ytPlayerRefs.current[id];
    if (yt) {
      try {
        yt.setVolume(vol * 100);
        yt.playVideo();
      } catch {
        setErrors((e) => ({ ...e, [id]: true }));
        setPlaying((p) => ({ ...p, [id]: false }));
        setPaused((p) => ({ ...p, [id]: true }));
        return;
      }
    }
    setPlaying(p => ({ ...p, [id]: true }));
    setPaused(p => ({ ...p, [id]: false }));
  }, [volumes]);

  const playSound = useCallback((sound: SoundItem) => {
    const vol = (volumes[sound.id] ?? sound.volume) / 100;
    const ytId = extractYouTubeId(sound.url);

    if (ytId) {
      pendingYtPlayRef.current.add(sound.id);
      setYtLoading((prev) => ({ ...prev, [sound.id]: true }));

      ensureYTApi(() => {
        if (!ytContainerRef.current) {
          pendingYtPlayRef.current.delete(sound.id);
          setYtLoading((prev) => {
            const next = { ...prev };
            delete next[sound.id];
            return next;
          });
          return;
        }
        if (ytPlayerRefs.current[sound.id]) {
          setYtLoading((prev) => {
            const next = { ...prev };
            delete next[sound.id];
            return next;
          });
          return;
        }

        const div = document.createElement("div");
        div.id = `yt-player-${sound.id}`;
        div.style.width = "100%";
        div.style.height = "1px";
        div.style.overflow = "hidden";
        div.style.position = "relative";
        ytContainerRef.current.appendChild(div);

        const playerVars: Record<string, number | string> = {
          playsinline: 1,
          controls: 0,
          mute: 0,
        };
        if (sound.type === "loop") {
          playerVars.loop = 1;
          playerVars.playlist = ytId;
        }

        const YT = (window as unknown as { YT?: { Player: new (el: string, opts: object) => object } }).YT;
        if (!YT?.Player) {
          pendingYtPlayRef.current.delete(sound.id);
          setYtLoading((prev) => {
            const next = { ...prev };
            delete next[sound.id];
            return next;
          });
          return;
        }

        const player = new YT.Player(div.id, {
          videoId: ytId,
          playerVars,
          events: {
            onReady: (e: { target: { setVolume: (v: number) => void; playVideo: () => void } }) => {
              setYtLoading((prev) => {
                const next = { ...prev };
                delete next[sound.id];
                return next;
              });
              const shouldPlay = pendingYtPlayRef.current.has(sound.id);
              if (shouldPlay) pendingYtPlayRef.current.delete(sound.id);
              try {
                e.target.setVolume(vol * 100);
                if (shouldPlay) e.target.playVideo();
                setPlaying((p) => ({ ...p, [sound.id]: shouldPlay }));
              } catch {
                setErrors((err) => ({ ...err, [sound.id]: true }));
                setPlaying((p) => ({ ...p, [sound.id]: false }));
              }
            },
            onError: () => {
              pendingYtPlayRef.current.delete(sound.id);
              setYtLoading((prev) => {
                const next = { ...prev };
                delete next[sound.id];
                return next;
              });
              setErrors((e) => ({ ...e, [sound.id]: true }));
              setPlaying((p) => ({ ...p, [sound.id]: false }));
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === 0 && sound.type === "effect") {
                killSound(sound.id);
              }
            },
          },
        });
        ytPlayerRefs.current[sound.id] = player as YTPlayerLike;
      });
    } else {
      const audio = new Audio(sound.url);
      audio.loop = sound.type === "loop";
      audio.volume = vol;
      audioRefs.current[sound.id] = audio;
      audio.addEventListener("playing", () => {
        setPlaying((p) => ({ ...p, [sound.id]: true }));
      });
      audio.addEventListener("error", () => {
        setErrors((e) => ({ ...e, [sound.id]: true }));
        setPlaying((p) => ({ ...p, [sound.id]: false }));
      });
      audio.addEventListener("ended", () => {
        if (sound.type === "effect") {
          setPlaying((p) => ({ ...p, [sound.id]: false }));
          delete audioRefs.current[sound.id];
        }
      });
      const playResult = audio.play();
      if (playResult !== undefined) {
        playResult.catch(() => {
          setErrors((e) => ({ ...e, [sound.id]: true }));
          setPlaying((p) => ({ ...p, [sound.id]: false }));
        });
      }
    }
  }, [volumes, killSound]);

  const dismissTouchHint = useCallback(() => {
    setShowTouchHint(false);
  }, []);

  const toggleSound = useCallback((sound: SoundItem) => {
    unlockMobileAudio();
    dismissTouchHint();
    if (playing[sound.id]) {
      pauseSound(sound.id);
    } else if (paused[sound.id]) {
      resumeSound(sound.id);
    } else {
      setErrors(e => ({ ...e, [sound.id]: false }));
      playSound(sound);
    }
  }, [playing, paused, pauseSound, resumeSound, playSound, dismissTouchHint]);

  const stopSoundWithFade = useCallback((id: string) => {
    fadeOutAndStop(id);
  }, [fadeOutAndStop]);

  const stopAll = useCallback(() => {
    config.sounds.forEach(s => {
      if (playing[s.id] || paused[s.id]) fadeOutAndStop(s.id);
    });
  }, [config.sounds, playing, paused, fadeOutAndStop]);

  const changeVolume = useCallback((id: string, vol: number) => {
    setVolumes(v => ({ ...v, [id]: vol }));
    const audio = audioRefs.current[id];
    if (audio) audio.volume = vol / 100;
    const yt = ytPlayerRefs.current[id];
    if (yt) try { yt.setVolume(vol); } catch { /* ignore */ }
    // Persist
    save(c => ({
      ...c,
      sounds: c.sounds.map(s => s.id === id ? { ...s, volume: vol } : s),
    }));
  }, [save]);

  // --- Modal ---

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
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Nazwa i URL są wymagane");
      return;
    }
    let catId = form.categoryId;
    let newCat: Category | null = null;
    if (catId === "__new__" && form.newCategory.trim()) {
      newCat = { id: genId(), name: form.newCategory.trim(), collapsed: false };
      catId = newCat.id;
    }
    if (!catId) {
      toast.error("Wybierz kategorię");
      return;
    }

    save(c => {
      const cats = newCat ? [...c.categories, newCat] : c.categories;
      if (editingSound) {
        return {
          categories: cats,
          sounds: c.sounds.map(s => s.id === editingSound.id ? { ...s, name: form.name.trim(), emoji: form.emoji || "🔊", url: form.url.trim(), type: form.type, categoryId: catId, volume: form.volume } : s),
        };
      } else {
        const ns: SoundItem = { id: genId(), name: form.name.trim(), emoji: form.emoji || "🔊", url: form.url.trim(), type: form.type, categoryId: catId, volume: form.volume };
        return { categories: cats, sounds: [...c.sounds, ns] };
      }
    });
    setModalOpen(false);
  };

  const deleteSound = (id: string) => {
    killSound(id);
    save(c => ({ ...c, sounds: c.sounds.filter(s => s.id !== id) }));
  };

  const moveToCategory = (soundId: string, catId: string) => {
    save(c => ({ ...c, sounds: c.sounds.map(s => s.id === soundId ? { ...s, categoryId: catId } : s) }));
  };

  // --- Categories ---

  const toggleCollapse = (catId: string) => {
    save(c => ({ ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, collapsed: !cat.collapsed } : cat) }));
  };

  const renameCategory = (catId: string, name: string) => {
    save(c => ({ ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, name } : cat) }));
  };

  const deleteCategory = (cat: Category) => {
    if (cat.id === "__uncategorized__") return;
    if (!confirm(`Usunąć kategorię '${cat.name}'? Dźwięki zostaną przeniesione do 'Bez kategorii'`)) return;
    save(c => {
      const cats = c.categories.filter(ct => ct.id !== cat.id);
      const sounds = c.sounds.map(s => s.categoryId === cat.id ? { ...s, categoryId: "__uncategorized__" } : s);
      // Create uncategorized if needed
      if (sounds.some(s => s.categoryId === "__uncategorized__") && !cats.some(ct => ct.id === "__uncategorized__")) {
        cats.push({ id: "__uncategorized__", name: "Bez kategorii", collapsed: false });
      }
      return { categories: cats, sounds };
    });
  };

  const addCategory = () => {
    save(c => ({ ...c, categories: [...c.categories, { id: genId(), name: "Nowa kategoria", collapsed: false }] }));
  };

  // Group sounds by category
  const grouped = config.categories.map(cat => ({
    category: cat,
    sounds: config.sounds.filter(s => s.categoryId === cat.id),
  }));
  // Uncategorized
  const uncatSounds = config.sounds.filter(s => !config.categories.some(c => c.id === s.categoryId));
  if (uncatSounds.length > 0) {
    let uncatCat = config.categories.find(c => c.id === "__uncategorized__");
    if (!uncatCat) {
      uncatCat = { id: "__uncategorized__", name: "Bez kategorii", collapsed: false };
    }
    if (!grouped.some(g => g.category.id === "__uncategorized__")) {
      grouped.push({ category: uncatCat, sounds: uncatSounds });
    }
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Stały 1px pas: ref musi być w DOM zanim zadziała async YT API (mobile). */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-px w-full overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div ref={ytContainerRef} className="h-px w-full relative" />
      </div>

      {showTouchHint && (
        <button
          type="button"
          className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-sm text-foreground"
          onPointerDown={() => {
            unlockMobileAudio();
            dismissTouchHint();
          }}
        >
          Dotknij dowolny dźwięk aby go odtworzyć
        </button>
      )}

      {/* Top bar */}
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

      {/* Categories */}
      {grouped.map(({ category: cat, sounds }) => (
        <section key={cat.id} className="space-y-2">
          <div className="flex items-center gap-2 group">
            <button onClick={() => toggleCollapse(cat.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
              {cat.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
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
              {sounds.map(sound => (
                <SoundTile
                  key={sound.id}
                  sound={sound}
                  isPlaying={!!playing[sound.id]}
                  isPaused={!!paused[sound.id]}
                  hasError={!!errors[sound.id]}
                  volume={volumes[sound.id] ?? sound.volume}
                  onToggle={() => toggleSound(sound)}
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

      {/* Add category button */}
      <Button variant="outline" size="sm" onClick={addCategory} className="min-h-[44px]">
        <Plus className="h-4 w-4 mr-1" /> Dodaj kategorię
      </Button>

      {/* Mobile sticky stop-all bar */}
      {anyPlaying && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-2 bg-card/95 backdrop-blur-md border-t md:hidden">
          <Button variant="destructive" className="w-full min-h-[44px]" onClick={stopAll}>
            <Square className="h-4 w-4 mr-1" /> Zatrzymaj wszystko
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSound ? "Edytuj dźwięk" : "Dodaj dźwięk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nazwa *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nazwa dźwięku" />
            </div>
            <div className="space-y-1">
              <Label>Emoji ikony</Label>
              <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value.slice(0, 2) }))} placeholder="🔊" className="w-20" />
            </div>
            <div className="space-y-1">
              <Label>URL lub link YouTube *</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Wklej link YouTube lub bezpośredni URL do pliku mp3/ogg/wav</p>
            </div>
            <div className="space-y-1">
              <Label>Typ odtwarzania</Label>
              <RadioGroup value={form.type} onValueChange={(v: "loop" | "effect") => setForm(f => ({ ...f, type: v }))} className="flex gap-4">
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
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Wybierz kategorię" /></SelectTrigger>
                <SelectContent>
                  {config.categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__new__">Nowa kategoria...</SelectItem>
                </SelectContent>
              </Select>
              {form.categoryId === "__new__" && (
                <Input className="mt-2" value={form.newCategory} onChange={e => setForm(f => ({ ...f, newCategory: e.target.value }))} placeholder="Nazwa nowej kategorii" />
              )}
            </div>
            <div className="space-y-1">
              <Label>Głośność domyślna: {form.volume}%</Label>
              <Slider value={[form.volume]} onValueChange={([v]) => setForm(f => ({ ...f, volume: v }))} min={0} max={100} step={1} className="py-2" />
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

// --- Sub-components ---

function CategoryName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);

  if (editing) {
    return (
      <Input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onRename(val.trim() || name); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onRename(val.trim() || name); setEditing(false); } }}
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
  sound, isPlaying, isPaused, hasError, volume, onToggle, onStop, onVolumeChange, onEdit, onDelete, categories, onMoveToCategory,
}: {
  sound: SoundItem;
  isPlaying: boolean;
  isPaused: boolean;
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
      {/* Context menu */}
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
            {categories.length > 1 && (
              <>
                {categories.filter(c => c.id !== sound.categoryId).map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => onMoveToCategory(c.id)}>
                    <ArrowUpDown className="h-4 w-4 mr-2" /> → {c.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Emoji + Name */}
      <div className="flex items-start gap-2 pr-8 mb-2">
        <span className="text-2xl leading-none">{sound.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight line-clamp-2">{sound.name}</p>
          <Badge variant="secondary" className="text-[10px] mt-1">{sound.type === "loop" ? "pętla" : "efekt"}</Badge>
        </div>
      </div>

      {/* Volume */}
      <div
        className="flex items-center gap-2 mb-2 flex-1 min-w-0"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
        <Slider value={[volume]} onValueChange={([v]) => onVolumeChange(v)} min={0} max={100} step={1} className="flex-1 min-h-[44px]" />
      </div>

      {/* Play/Pause + Stop buttons */}
      <div className="flex gap-1.5">
        <Button
          variant={isPlaying ? "secondary" : isPaused ? "outline" : "default"}
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={onToggle}
        >
          {hasError ? (
            <><AlertTriangle className="h-4 w-4 mr-1" /> Błąd</>
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
            className="min-h-[44px] min-w-[44px]"
            onClick={onStop}
            title="Zatrzymaj (fade out)"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
