import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/context/SettingsContext";
import { THEMES, THEME_ORDER, type ThemeId } from "@/types/settings";

function ThemeSwatches({ themeId }: { themeId: ThemeId }) {
  const v = THEMES[themeId].vars;
  const colors = [
    v["--bg-primary"],
    v["--bg-card"],
    v["--accent-gold"],
    v["--accent-red"],
    v["--text-primary"],
  ];
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((c, i) => (
        <span
          key={i}
          className="block h-4 w-4 rounded-full border border-black/20"
          style={{ background: c }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function ThemeSelector() {
  const { settings, updateSettings } = useSettings();

  return (
    <section className="space-y-3">
      <h2 className="text-base tracking-wide text-foreground">Wygląd</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEME_ORDER.map((id) => {
          const theme = THEMES[id];
          const active = settings.theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateSettings({ theme: id })}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-3 p-3 border bg-card/40 text-left transition-colors",
                "hover:bg-white/[0.04] hover:border-primary/60",
                active
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-border",
              )}
            >
              <ThemeSwatches themeId={id} />
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm text-foreground">{theme.label}</span>
                {active && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-primary">
                    <Check className="h-3 w-3" /> Aktywny
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
