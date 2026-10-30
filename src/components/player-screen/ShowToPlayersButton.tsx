import { MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { showHandoutToPlayers, type PlayerHandout } from "@/lib/playerScreen";

/** Pushes one handout to the player screen from anywhere (notes, cards, …). */
export function ShowToPlayersButton({
  title,
  text,
  image,
  ...props
}: PlayerHandout & Omit<ButtonProps, "onClick" | "title">) {
  const show = () => {
    if (showHandoutToPlayers({ title, text, image })) toast.success("Pokazano na ekranie graczy");
    else toast.error("Nie udało się zapisać — za mało miejsca (zmniejsz obraz)");
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={show} {...props}>
      <MonitorUp className="h-4 w-4 mr-1.5" />
      Pokaż graczom
    </Button>
  );
}
