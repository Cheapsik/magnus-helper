import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface SoundItem {
  id: string;
  name: string;
  emoji: string;
  url: string;
  type: "loop" | "effect";
  categoryId: string;
  volume: number;
}

export interface Category {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface SoundboardConfig {
  categories: Category[];
  sounds: SoundItem[];
}

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
function extractYouTubeId(url: string): string | null {
  const m = url.match(YT_REGEX);
  return m ? m[2] : null;
}

let ytApiLoading = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];
function ensureYTApi(cb: () => void) {
  if (ytApiReady) { cb(); return; }
  ytReadyCallbacks.push(cb);
  if (ytApiLoading) return;
  ytApiLoading = true;
  (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytReadyCallbacks.forEach((fn) => fn());
    ytReadyCallbacks.length = 0;
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

function fadeTo(
  getSet: { get: () => number; set: (v: number) => void },
  target: number,
  duration: number,
  onComplete?: () => void,
) {
  const start = getSet.get();
  const startTime = performance.now();
  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    getSet.set(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(tick);
    else onComplete?.();
  }
  requestAnimationFrame(tick);
}

interface AmbientContextValue {
  config: SoundboardConfig;
  setConfig: React.Dispatch<React.SetStateAction<SoundboardConfig>>;
  playing: Record<string, boolean>;
  paused: Record<string, boolean>;
  fading: Record<string, boolean>;
  errors: Record<string, boolean>;
  volumes: Record<string, number>;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  toggleSound: (sound: SoundItem) => void;
  stopSoundWithFade: (id: string) => void;
  stopAll: () => void;
  changeVolume: (id: string, v: number) => void;
  killSound: (id: string) => void;
  activeLayers: SoundItem[];
  playingLayers: SoundItem[];
}

const AmbientContext = createContext<AmbientContextValue | null>(null);

const FADE_OUT_MS = 1200;
const FADE_IN_MS = 600;

export function AmbientProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useLocalStorage<SoundboardConfig>("rpg_soundboard_config", DEFAULT_CONFIG);
  const [masterVolume, setMasterVolumeState] = useLocalStorage<number>("rpg_ambient_master", 80);

  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [fading, setFading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const ytPlayerRefs = useRef<Record<string, { stopVideo?: () => void; destroy?: () => void; pauseVideo?: () => void; playVideo?: () => void; setVolume?: (v: number) => void; getVolume?: () => number }>>({});
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const masterRef = useRef(masterVolume);
  useEffect(() => { masterRef.current = masterVolume; }, [masterVolume]);

  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    config.sounds.forEach((s) => { v[s.id] = s.volume; });
    return v;
  });
  const volumesRef = useRef(volumes);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);

  // Persistent hidden YT container mounted once in document.body — survives navigation
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const div = document.createElement("div");
    div.id = "global-ambient-yt-container";
    div.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;pointer-events:none;";
    div.setAttribute("aria-hidden", "true");
    document.body.appendChild(div);
    ytContainerRef.current = div;
  }, []);

  useEffect(() => {
    setVolumes((prev) => {
      const next = { ...prev };
      config.sounds.forEach((s) => { if (!(s.id in next)) next[s.id] = s.volume; });
      return next;
    });
  }, [config.sounds]);

  const setActualVolume = (id: string, actual0to100: number) => {
    const a = audioRefs.current[id];
    if (a) a.volume = Math.max(0, Math.min(1, actual0to100 / 100));
    const yt = ytPlayerRefs.current[id];
    if (yt) try { yt.setVolume?.(Math.max(0, Math.min(100, actual0to100))); } catch { /* ignore */ }
  };
  const getActualVolume = (id: string): number => {
    const a = audioRefs.current[id];
    if (a) return a.volume * 100;
    const yt = ytPlayerRefs.current[id];
    if (yt) try { return yt.getVolume?.() ?? 0; } catch { /* ignore */ }
    return 0;
  };
  const logicalToActual = (logical: number) => logical * (masterRef.current / 100);
  const applyLogicalVolume = (id: string, logical: number) => setActualVolume(id, logicalToActual(logical));

  const killSound = useCallback((id: string) => {
    const audio = audioRefs.current[id];
    if (audio) { audio.pause(); audio.currentTime = 0; delete audioRefs.current[id]; }
    const yt = ytPlayerRefs.current[id];
    if (yt) {
      try { yt.stopVideo?.(); yt.destroy?.(); } catch { /* ignore */ }
      delete ytPlayerRefs.current[id];
      document.getElementById(`yt-player-${id}`)?.remove();
    }
    setPlaying((p) => ({ ...p, [id]: false }));
    setPaused((p) => ({ ...p, [id]: false }));
    setFading((f) => ({ ...f, [id]: false }));
    setErrors((e) => ({ ...e, [id]: false }));
  }, []);

  const playSound = useCallback((sound: SoundItem) => {
    const targetLogical = volumesRef.current[sound.id] ?? sound.volume;
    const targetActual = logicalToActual(targetLogical);
    const ytId = extractYouTubeId(sound.url);

    if (ytId) {
      ensureYTApi(() => {
        if (!ytContainerRef.current) return;
        const div = document.createElement("div");
        div.id = `yt-player-${sound.id}`;
        ytContainerRef.current.appendChild(div);
        const playerVars: Record<string, number | string> = { autoplay: 1, controls: 0, mute: 0, playsinline: 1 };
        if (sound.type === "loop") { playerVars.loop = 1; playerVars.playlist = ytId; }
        const YT = (window as unknown as { YT?: { Player: new (el: string, opts: object) => object } }).YT;
        if (!YT?.Player) return;
        const player = new YT.Player(div.id, {
          videoId: ytId,
          playerVars,
          events: {
            onReady: (e: { target: { setVolume: (v: number) => void; playVideo: () => void; getVolume: () => number } }) => {
              try { e.target.setVolume(0); } catch { /* ignore */ }
              setPlaying((p) => ({ ...p, [sound.id]: true }));
              fadeTo(
                { get: () => { try { return e.target.getVolume(); } catch { return 0; } }, set: (v) => { try { e.target.setVolume(v); } catch { /* ignore */ } } },
                targetActual, FADE_IN_MS,
              );
            },
            onError: () => {
              setErrors((er) => ({ ...er, [sound.id]: true }));
              setPlaying((p) => ({ ...p, [sound.id]: false }));
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === 0 && sound.type === "effect") killSound(sound.id);
            },
          },
        });
        ytPlayerRefs.current[sound.id] = player as typeof ytPlayerRefs.current[string];
      });
    } else {
      const audio = new Audio(sound.url);
      audio.loop = sound.type === "loop";
      audio.volume = 0;
      audioRefs.current[sound.id] = audio;
      audio.addEventListener("error", () => {
        setErrors((er) => ({ ...er, [sound.id]: true }));
        setPlaying((p) => ({ ...p, [sound.id]: false }));
      });
      audio.addEventListener("ended", () => {
        if (sound.type === "effect") {
          setPlaying((p) => ({ ...p, [sound.id]: false }));
          delete audioRefs.current[sound.id];
        }
      });
      audio.play().then(() => {
        setPlaying((p) => ({ ...p, [sound.id]: true }));
        fadeTo(
          { get: () => audio.volume * 100, set: (v) => { audio.volume = Math.max(0, Math.min(1, v / 100)); } },
          targetActual, FADE_IN_MS,
        );
      }).catch(() => {
        setErrors((er) => ({ ...er, [sound.id]: true }));
      });
    }
  }, [killSound]);

  const pauseSoundWithFade = useCallback((id: string) => {
    setFading((f) => ({ ...f, [id]: true }));
    fadeTo(
      { get: () => getActualVolume(id), set: (v) => setActualVolume(id, v) },
      0, FADE_OUT_MS,
      () => {
        const audio = audioRefs.current[id];
        if (audio) audio.pause();
        const yt = ytPlayerRefs.current[id];
        if (yt) try { yt.pauseVideo?.(); } catch { /* ignore */ }
        setPlaying((p) => ({ ...p, [id]: false }));
        setPaused((p) => ({ ...p, [id]: true }));
        setFading((f) => ({ ...f, [id]: false }));
      },
    );
  }, []);

  const resumeSound = useCallback((id: string) => {
    const targetLogical = volumesRef.current[id] ?? 70;
    const targetActual = logicalToActual(targetLogical);
    const audio = audioRefs.current[id];
    if (audio) {
      audio.volume = 0;
      audio.play();
      fadeTo({ get: () => audio.volume * 100, set: (v) => { audio.volume = Math.max(0, Math.min(1, v / 100)); } }, targetActual, FADE_IN_MS);
    }
    const yt = ytPlayerRefs.current[id];
    if (yt) {
      try { yt.setVolume?.(0); yt.playVideo?.(); } catch { /* ignore */ }
      fadeTo(
        { get: () => { try { return yt.getVolume?.() ?? 0; } catch { return 0; } }, set: (v) => { try { yt.setVolume?.(v); } catch { /* ignore */ } } },
        targetActual, FADE_IN_MS,
      );
    }
    setPlaying((p) => ({ ...p, [id]: true }));
    setPaused((p) => ({ ...p, [id]: false }));
  }, []);

  const toggleSound = useCallback((sound: SoundItem) => {
    if (fading[sound.id]) return;
    if (playing[sound.id]) pauseSoundWithFade(sound.id);
    else if (paused[sound.id]) resumeSound(sound.id);
    else { setErrors((e) => ({ ...e, [sound.id]: false })); playSound(sound); }
  }, [playing, paused, fading, pauseSoundWithFade, resumeSound, playSound]);

  const stopSoundWithFade = useCallback((id: string) => {
    if (fading[id]) return;
    setFading((f) => ({ ...f, [id]: true }));
    fadeTo(
      { get: () => getActualVolume(id), set: (v) => setActualVolume(id, v) },
      0, FADE_OUT_MS,
      () => killSound(id),
    );
  }, [fading, killSound]);

  const stopAll = useCallback(() => {
    config.sounds.forEach((s) => {
      if (playing[s.id] || paused[s.id]) stopSoundWithFade(s.id);
    });
  }, [config.sounds, playing, paused, stopSoundWithFade]);

  const changeVolume = useCallback((id: string, vol: number) => {
    setVolumes((v) => ({ ...v, [id]: vol }));
    applyLogicalVolume(id, vol);
    setConfig((c) => ({ ...c, sounds: c.sounds.map((s) => (s.id === id ? { ...s, volume: vol } : s)) }));
  }, [setConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMasterVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setMasterVolumeState(clamped);
    masterRef.current = clamped;
    Object.keys(audioRefs.current).forEach((id) => {
      if (playing[id]) applyLogicalVolume(id, volumesRef.current[id] ?? 70);
    });
    Object.keys(ytPlayerRefs.current).forEach((id) => {
      if (playing[id]) applyLogicalVolume(id, volumesRef.current[id] ?? 70);
    });
  }, [playing, setMasterVolumeState]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeLayers = useMemo(
    () => config.sounds.filter((s) => playing[s.id] || paused[s.id]),
    [config.sounds, playing, paused],
  );
  const playingLayers = useMemo(
    () => config.sounds.filter((s) => playing[s.id]),
    [config.sounds, playing],
  );

  // Persist active loop tracks
  useEffect(() => {
    try {
      const data = playingLayers.map((s) => ({ trackId: s.id, volume: volumes[s.id] ?? s.volume }));
      localStorage.setItem("rpg_ambient_session", JSON.stringify(data));
    } catch { /* ignore */ }
  }, [playingLayers, volumes]);

  // Restore loop tracks on startup
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    if (!config.sounds.length) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem("rpg_ambient_session");
      if (!raw) return;
      const saved: { trackId: string; volume?: number }[] = JSON.parse(raw);
      saved.forEach(({ trackId, volume }) => {
        const sound = config.sounds.find((s) => s.id === trackId);
        if (!sound || sound.type !== "loop") return;
        if (typeof volume === "number") setVolumes((v) => ({ ...v, [trackId]: volume }));
        setTimeout(() => playSound(sound), 50);
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sounds.length]);

  return (
    <AmbientContext.Provider
      value={{
        config, setConfig,
        playing, paused, fading, errors, volumes,
        masterVolume, setMasterVolume,
        toggleSound, stopSoundWithFade, stopAll, changeVolume, killSound,
        activeLayers, playingLayers,
      }}
    >
      {children}
    </AmbientContext.Provider>
  );
}

export function useAmbient() {
  const ctx = useContext(AmbientContext);
  if (!ctx) throw new Error("useAmbient must be used within AmbientProvider");
  return ctx;
}
