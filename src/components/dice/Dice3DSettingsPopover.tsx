import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_DICE_3D_VISUAL,
  type Dice3DVisualConfig,
  DICE_3D_MATERIAL_OPTIONS,
  DICE_3D_TEXTURE_OPTIONS,
} from "@/lib/dice3dVisualSettings";

export interface Dice3DSettingsPopoverProps {
  value: Dice3DVisualConfig;
  onChange: (next: Dice3DVisualConfig) => void;
  disabled?: boolean;
  /** Klasy triggera (np. rozmiar na mobile). */
  triggerClassName?: string;
}

export function Dice3DSettingsPopover({ value, onChange, disabled, triggerClassName }: Dice3DSettingsPopoverProps) {
  const patch = (partial: Partial<Dice3DVisualConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={triggerClassName ?? "h-10 w-10 shrink-0 md:h-11 md:w-11"}
          disabled={disabled}
          aria-label="Ustawienia widoku 3D"
        >
          <Settings className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(calc(100vw-2rem),20rem)] space-y-4 sm:w-80"
        align="end"
        side="top"
        sideOffset={8}
        collisionPadding={12}
      >
        <div>
          <h3 className="font-semibold text-sm leading-none">Widok 3D</h3>
          <p className="text-xs text-muted-foreground mt-1.5">
            Zmiana opcji natychmiast przeładowuje widok 3D (nowa scena po zapisaniu wyboru).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tekstura kości</Label>
          <Select
            value={value.themeTexture === "" ? "__none__" : value.themeTexture}
            onValueChange={(v) => patch({ themeTexture: (v === "__none__" ? "" : v) as Dice3DVisualConfig["themeTexture"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] max-h-64">
              {DICE_3D_TEXTURE_OPTIONS.map((o) => (
                <SelectItem key={o.value || "__none__"} value={o.value === "" ? "__none__" : o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Materiał kości</Label>
          <Select
            value={value.themeMaterial}
            onValueChange={(v) => patch({ themeMaterial: v as Dice3DVisualConfig["themeMaterial"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {DICE_3D_MATERIAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="dice-3d-sounds" className="text-xs cursor-pointer">
            Dźwięki rzutu
          </Label>
          <Switch
            id="dice-3d-sounds"
            checked={value.sounds}
            onCheckedChange={(sounds) => patch({ sounds })}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="dice-3d-shadows" className="text-xs cursor-pointer">
            Cienie
          </Label>
          <Switch
            id="dice-3d-shadows"
            checked={value.shadows}
            onCheckedChange={(shadows) => patch({ shadows })}
            disabled={disabled}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full text-xs"
          disabled={disabled}
          onClick={() => onChange({ ...DEFAULT_DICE_3D_VISUAL })}
        >
          Przywróć domyślne
        </Button>
      </PopoverContent>
    </Popover>
  );
}
