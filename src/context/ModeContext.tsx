import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type AppMode = "player" | "gm";

interface ModeContextType {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  toggle: () => void;
}

const ModeContext = createContext<ModeContextType | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useLocalStorage<AppMode>("rpg_mode", "gm");
  return (
    <ModeContext.Provider value={{ mode, setMode, toggle: () => setMode(mode === "gm" ? "player" : "gm") }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}

/** Trasy widoczne w trybie gracza */
export const PLAYER_PATHS = new Set<string>([
  "/", "/dice", "/tests", "/character", "/inventory", "/codex", "/notes",
]);

export function isVisibleInMode(path: string, mode: AppMode): boolean {
  if (mode === "gm") return true;
  return PLAYER_PATHS.has(path);
}
