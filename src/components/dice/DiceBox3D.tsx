import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import DiceBox from "@3d-dice/dice-box-threejs";
import { X } from "lucide-react";
import type { Dice3DVisualConfig } from "@/lib/dice3dVisualSettings";
import { Button } from "@/components/ui/button";

export interface DiceBox3DProps {
  isVisible: boolean;
  visualConfig: Dice3DVisualConfig;
  onRollComplete: (results: number[]) => void;
  onClose: () => void;
  onInitFailed?: (message: string) => void;
  onReady?: () => void;
}

export type DiceBox3DHandle = {
  rollDice3D: (notation: string, magnusDiceResults: number[]) => Promise<void>;
};

type DiceBoxInstance = InstanceType<(typeof import("@3d-dice/dice-box-threejs"))["default"]>;

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/** Stałe: widok 3D zawsze „Stół karczmy” (`theme_surface` w dice-box). */
const DICE_BOX_THEME_SURFACE = "taverntable" as const;

/** Tło CSS pod przezroczystym canvasem — tekstura stołu karczmy. */
const TAVERN_TABLE_FLOOR = {
  textureUrl: (base: string) => `${base}assets/dice-box/textures/wood_table.jpg`,
  color: "#5c3f2a",
  blendMode: "multiply" as const,
};

function flatRollValuesFromDetail(detail: unknown): number[] {
  if (!detail || typeof detail !== "object") return [];
  const d = detail as {
    sets?: Array<{ rolls?: Array<{ value?: number }> }>;
  };
  if (!Array.isArray(d.sets)) return [];
  return d.sets.flatMap((s) => (Array.isArray(s.rolls) ? s.rolls.map((r) => Number(r.value)) : []));
}

function disposeDiceBox(box: DiceBoxInstance | null) {
  if (!box) return;
  try {
    box.clearDice?.();
  } catch {
    /* ignore */
  }
  try {
    const r = box.renderer as { domElement?: HTMLCanvasElement; dispose?: () => void } | undefined;
    if (r?.domElement?.parentNode) {
      r.domElement.parentNode.removeChild(r.domElement);
    }
    r?.dispose?.();
  } catch {
    /* ignore */
  }
}

const DiceBox3D = forwardRef<DiceBox3DHandle, DiceBox3DProps>(function DiceBox3D(
  { isVisible, visualConfig, onRollComplete, onClose, onInitFailed, onReady },
  ref,
) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `dice-box-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<DiceBoxInstance | null>(null);
  const magnusResultsRef = useRef<number[]>([]);
  const onRollCompleteRef = useRef(onRollComplete);
  onRollCompleteRef.current = onRollComplete;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setMobile(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useImperativeHandle(ref, () => ({
    rollDice3D: async (notation: string, magnusDiceResults: number[]) => {
      magnusResultsRef.current = magnusDiceResults.slice();
      const box = boxRef.current;
      if (!box || !(box as { initialized?: boolean }).initialized) {
        throw new Error("DiceBox nie jest gotowy");
      }
      await box.roll(notation);
    },
  }));

  const fail = useCallback(
    (message: string) => {
      setInitError(message);
      onInitFailed?.(message);
    },
    [onInitFailed],
  );

  useLayoutEffect(() => {
    if (!isVisible) {
      setInitError(null);
      setReady(false);
      return;
    }

    if (!webglAvailable()) {
      fail("Nie można załadować trybu 3D — WebGL niedostępny w tej przeglądarce");
      return;
    }

    let cancelled = false;
    let rafId = 0;
    const assetPath = `${import.meta.env.BASE_URL}assets/dice-box/`;

    const tryInit = (attempt = 0) => {
      if (cancelled) return;
      const containerEl = containerRef.current;
      if (!containerEl) {
        if (attempt < 40) {
          rafId = requestAnimationFrame(() => tryInit(attempt + 1));
        } else {
          fail("Nie można przygotować widoku 3D (brak kontenera).");
        }
        return;
      }

      void (async () => {
        try {
          const tex = visualConfig.themeTexture;
          const textureForCustom = tex === "" ? "none" : tex;
          const box = new DiceBox(`#${containerId}`, {
            assetPath,
            sounds: visualConfig.sounds,
            shadows: visualConfig.shadows,
            theme_surface: DICE_BOX_THEME_SURFACE,
            color_spotlight: 0xffeedd,
            light_intensity: 1,
            gravity_multiplier: 400,
            baseScale: mobile ? 70 : 100,
            theme_customColorset: {
              name: "magnus",
              foreground: "#1a1208",
              background: "#d4c5a9",
              outline: "none",
              texture: textureForCustom,
              material: visualConfig.themeMaterial,
            },
            theme_colorset: "white",
            theme_texture: tex,
            theme_material: visualConfig.themeMaterial,
            onRollComplete: (detail: unknown) => {
              const fromPhysics = flatRollValuesFromDetail(detail);
              const magnus = magnusResultsRef.current;
              const payload = magnus.length > 0 ? magnus : fromPhysics;
              onRollCompleteRef.current(payload);
            },
          });

          if (cancelled) {
            disposeDiceBox(box);
            return;
          }

          await box.initialize();
          if (cancelled) {
            disposeDiceBox(box);
            return;
          }

          // Renderer paczki tworzy canvas z alpha:true i setClearColor(0,0) — canvas jest
          // przezroczysty. Tło CSS kontenera (kolor + tekstura) świeci przez WebGL.
          // Ważne: NIE nadpisuj setClearColor nieprzezroczystą wartością — zasłoni teksturę.
          const renderer = box.renderer as { domElement: HTMLCanvasElement };
          renderer.domElement.style.backgroundColor = "transparent";

          boxRef.current = box;
          setReady(true);
          setInitError(null);
          onReadyRef.current?.();
        } catch (err) {
          console.error("DiceBox3D init", err);
          if (!cancelled) {
            fail("Nie udało się wczytać trybu 3D (szczegóły w konsoli przeglądarki).");
          }
        }
      })();
    };

    tryInit(0);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      disposeDiceBox(boxRef.current);
      boxRef.current = null;
      setReady(false);
    };
  }, [isVisible, containerId, mobile, fail, visualConfig]);

  if (!isVisible) {
    return null;
  }

  const floor = TAVERN_TABLE_FLOOR;
  const tableTextureUrl = floor.textureUrl(import.meta.env.BASE_URL);

  return (
    <div
      className="animate-slide-down flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-[#0e0d0b] shadow-none"
      style={{
        background: "linear-gradient(180deg, #0e0d0b 0%, #050504 100%)",
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-3 py-2">
        <span className="text-sm font-semibold text-foreground/90">Rzut 3D</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Zamknij 3D"
          >
            <span className="sr-only">Zamknij 3D</span>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {initError ? (
        <p className="p-4 text-center text-sm text-destructive">{initError}</p>
      ) : (
        <div className="relative min-h-0 flex-1 p-0">
          <div
            id={containerId}
            ref={containerRef}
            className="absolute inset-0 overflow-hidden [&_canvas]:block [&_canvas]:h-full [&_canvas]:min-h-0 [&_canvas]:w-full [&_canvas]:bg-transparent"
            style={{
              touchAction: "manipulation",
              backgroundColor: "transparent",
              backgroundImage: `url(${tableTextureUrl})`,
              backgroundSize: "auto",
              backgroundPosition: "center",
              backgroundRepeat: "repeat",
              backgroundBlendMode: floor.blendMode,
            }}
          />
          {!ready && !initError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Ładowanie stołu 3D…
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DiceBox3D;
