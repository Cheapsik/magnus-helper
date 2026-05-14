import { Check } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { THEMES, THEME_ORDER, type ThemeId } from "@/types/settings";

const TAB_BODY_H = 60;

function ThemeCardTitle({ text, active }: { text: string; active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 0.5);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const className = cn(
    "block min-w-0 truncate text-left text-[11px] font-semibold leading-snug text-muted-foreground transition-colors duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
    active && "text-primary",
    !active && "group-hover:text-foreground",
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={ref} className={className}>
          {text}
        </span>
      </TooltipTrigger>
      {truncated ? (
        <TooltipContent side="top" align="start" className="max-w-xs text-left">
          {text}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

function themeBodyGradientStyle(id: ThemeId): CSSProperties {
  const v = THEMES[id].vars;
  const a = v["--bg-primary"];
  const b = v["--bg-secondary"];
  const c = v["--bg-card"];
  const d = v["--bg-tertiary"];
  return {
    backgroundImage: `linear-gradient(135deg, ${a} 0%, ${b} 38%, ${c} 72%, ${d} 100%)`,
  };
}

function earDotColors(id: ThemeId): readonly [string, string, string] {
  const v = THEMES[id].vars;
  return [v["--bg-tertiary"], v["--bg-card"], v["--accent-gold"]] as const;
}

export default function ThemeSelector() {
  const { settings, updateSettings } = useSettings();

  return (
    <section className="mx-auto w-full space-y-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">Wygląd</h2>
      <div className="flex w-full flex-wrap justify-center gap-2">
        {THEME_ORDER.map((id) => {
          const theme = THEMES[id];
          const active = settings.theme === id;
          const dots = earDotColors(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateSettings({ theme: id })}
              aria-pressed={active}
              aria-label={theme.label}
              className={cn(
                "group relative flex min-w-[200px] max-w-full grow basis-[200px] cursor-pointer flex-col border-0 bg-transparent p-0 outline-none",
              )}
            >
              {/* Ucho — jedna linia + ellipsis; tooltip tylko przy obcięciu */}
              <div
                className={cn(
                  "z-[1] flex w-full min-w-0 items-start gap-1 rounded-t-sm border border-b-0 border-white/[0.07] bg-white/[0.025] px-2 py-1 transition-[background,border-color,color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                  active &&
                    "border-primary/35 bg-primary/15 shadow-[0_-3px_10px_hsl(var(--primary)/0.12)]",
                  !active && "group-hover:border-white/[0.12] group-hover:bg-white/[0.05]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <ThemeCardTitle text={theme.label} active={active} />
                </div>
                <div className="flex shrink-0 items-start gap-[3px] pt-0.5" aria-hidden>
                  {dots.map((c, i) => (
                    <span
                      key={i}
                      className="block h-[5px] w-[5px] shrink-0 rounded-full border border-white/15"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Ciało — jak v2: pełny gradient + opacity (0.45 / 0.68 / 0.85) */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-bl-md rounded-br-md rounded-tr-md rounded-tl-none border border-t-0 border-white/[0.05] transition-[box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                  "group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary",
                  !active && "group-hover:-translate-y-[3px] group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
                  active && "-translate-y-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_0_2px_hsl(var(--primary)/0.28)]",
                )}
                style={{ height: TAB_BODY_H }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 z-0 transition-opacity duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                    active ? "opacity-[0.85]" : "opacity-[0.45] group-hover:opacity-[0.68]",
                  )}
                  style={themeBodyGradientStyle(id)}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_55%)]"
                  aria-hidden
                />
                <div
                  className={cn(
                    "absolute bottom-2 right-2 z-[2] h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-white/20 bg-black/55",
                    active ? "flex" : "hidden",
                  )}
                  aria-hidden={!active}
                >
                  <Check className="h-2.5 w-2.5 text-primary" strokeWidth={2.5} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
