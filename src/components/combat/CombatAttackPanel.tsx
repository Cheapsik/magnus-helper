import { X } from "lucide-react";
import type { Combatant } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * TEMP placeholder: the attack resolver (attack types from the campaign
 * system, docs/adr/0006) is the next step — see CONTINUE.md.
 */
export function CombatAttackPanel({
  attackerId,
  combatants,
  onClose,
}: {
  attackerId: string;
  combatants: Combatant[];
  setCombatants: (fn: Combatant[] | ((prev: Combatant[]) => Combatant[])) => void;
  onClose: () => void;
}) {
  const attacker = combatants.find((c) => c.id === attackerId);
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="flex items-center gap-2 p-3 text-sm">
        <span className="flex-1">
          Akcja: {attacker?.name ?? "uczestnik"}. Rozstrzyganie ataków według rodzajów ataku kampanii jest w przygotowaniu;
          zmieniaj zasób ręcznie przyciskami na karcie uczestnika.
        </span>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Zamknij">
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
