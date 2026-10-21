import { useEffect } from "react";
import { Maximize } from "lucide-react";
import { PlayerScreenView } from "@/components/player-screen/PlayerScreenView";

/**
 * Second-window view for players (TV / second monitor). Rendered outside the
 * main Layout; it only reads state the GM window writes to campaign storage.
 */
export default function PlayerScreenPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Magnus · ekran graczy";
    return () => {
      document.title = previous;
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950">
      <PlayerScreenView />
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label="Pełny ekran"
        title="Pełny ekran"
        className="absolute top-3 right-3 p-2 rounded-md text-neutral-500 opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <Maximize className="h-6 w-6" />
      </button>
    </div>
  );
}
