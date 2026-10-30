import { Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { showHandoutToPlayers } from "@/lib/playerScreen";
import { secretName, type Secret } from "@/lib/secrets";

/** Puts a secret on the player screen as a handout. */
export function SecretHandout({ secret }: { secret: Secret }) {
  const reveal = () => {
    if (!showHandoutToPlayers({ title: secretName(secret), text: secret.text })) {
      toast.error("Nie udało się pokazać na ekranie graczy");
      return;
    }
    toast.success("Pokazano na ekranie graczy");
  };
  return (
    <Button type="button" size="sm" variant="outline" onClick={reveal}>
      <Presentation className="h-4 w-4 mr-1.5" />
      Pokaż graczom
    </Button>
  );
}
