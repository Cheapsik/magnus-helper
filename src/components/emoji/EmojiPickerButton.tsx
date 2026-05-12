import { useState, useCallback } from "react";
import EmojiPicker, { Theme as EmojiPickerTheme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function EmojiPickerButton({
  emoji,
  onPick,
  className,
}: {
  emoji: string;
  onPick: (e: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "light" ? EmojiPickerTheme.LIGHT : EmojiPickerTheme.DARK;

  const onEmojiClick = useCallback(
    (data: EmojiClickData) => {
      onPick(data.emoji);
      setOpen(false);
    },
    [onPick],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-background px-2 text-lg leading-none hover:bg-accent",
            className,
          )}
        >
          {emoji || "➕"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[min(100vw-2rem,420px)] border p-0 shadow-lg" align="start">
        <EmojiPicker theme={pickerTheme} width={360} height={420} onEmojiClick={onEmojiClick} searchPlaceHolder="Szukaj emoji…" />
      </PopoverContent>
    </Popover>
  );
}
