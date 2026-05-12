import { createContext, useCallback, useContext, useMemo, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAmbient } from "@/context/AmbientContext";

export interface QuickAction {
  id: string;
  label: string;
  type: "plotki" | "loot" | "timer" | "roll" | "custom";
  params?: Record<string, unknown>;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  ambientLayers: string[];
  ambientVolumes?: Record<string, number>;
  linkedNpcIds: string[];
  linkedThreadIds: string[];
  quickActions: QuickAction[];
  isActive: boolean;
  autoStartAmbient?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SceneContextValue {
  scenes: Scene[];
  activeScene: Scene | null;
  createScene: (data: Omit<Scene, "id" | "isActive" | "createdAt" | "updatedAt">) => Scene;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  activateScene: (id: string) => void;
  deactivateScene: () => void;
}

const SceneContext = createContext<SceneContextValue | null>(null);
const now = () => new Date().toISOString();

export function SceneProvider({ children }: { children: ReactNode }) {
  const [scenes, setScenes] = useLocalStorage<Scene[]>("magnus_scenes", []);
  const ambient = useAmbient();

  const activeScene = useMemo(() => scenes.find((s) => s.isActive) ?? null, [scenes]);

  const createScene: SceneContextValue["createScene"] = useCallback((data) => {
    const scene: Scene = {
      ...data,
      id: crypto.randomUUID(),
      isActive: false,
      createdAt: now(),
      updatedAt: now(),
    };
    setScenes((prev) => [...prev, scene]);
    return scene;
  }, [setScenes]);

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now() } : s)));
  }, [setScenes]);

  const deleteScene = useCallback((id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id));
  }, [setScenes]);

  const activateScene = useCallback((id: string) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;
    setScenes((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
    if (scene.autoStartAmbient !== false && scene.ambientLayers.length > 0) {
      ambient.stopAll();
      setTimeout(() => {
        scene.ambientLayers.forEach((trackId) => {
          const sound = ambient.config.sounds.find((s) => s.id === trackId);
          if (!sound) return;
          const vol = scene.ambientVolumes?.[trackId];
          if (typeof vol === "number") ambient.changeVolume(trackId, vol);
          if (!ambient.playing[trackId]) ambient.toggleSound(sound);
        });
      }, 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, setScenes, ambient.config.sounds, ambient.playing]);

  const deactivateScene = useCallback(() => {
    const active = scenes.find((s) => s.isActive);
    if (!active) return;
    setScenes((prev) => prev.map((s) => ({ ...s, isActive: false })));
    if (active.ambientLayers.length > 0) {
      active.ambientLayers.forEach((trackId) => {
        if (ambient.playing[trackId] || ambient.paused[trackId]) {
          ambient.stopSoundWithFade(trackId);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, setScenes]);

  return (
    <SceneContext.Provider value={{ scenes, activeScene, createScene, updateScene, deleteScene, activateScene, deactivateScene }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used within SceneProvider");
  return ctx;
}
