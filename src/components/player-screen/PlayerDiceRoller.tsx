import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logChronicleEvent } from "@/lib/chronicle";
import { rollDiceNotation } from "@/lib/diceNotation";

const QUICK = ["k4", "k6", "k8", "k10", "k12", "k20", "k100", "2k6"];

/** Rolls for a player and posts the result to the GM's chronicle. */
export function PlayerDiceRoller({ playerName }: { playerName: string }) {
  const [notation, setNotation] = useState("k20");
  const [last, setLast] = useState<string | null>(null);

  const roll = (n: string) => {
    const r = rollDiceNotation(n);
    if (!r) return setLast("Niepoprawna notacja (np. 2k6+1)");
    const faces = r.dice.map((d) => `[${d.results.join(", ")}]`).join(" ");
    const mod = r.modifier ? ` ${r.modifier > 0 ? "+" : "−"} ${Math.abs(r.modifier)}` : "";
    setLast(`${n.trim()}: ${faces}${mod} = ${r.total}`);
    logChronicleEvent({ kind: "other", text: `${playerName || "Gracz"} rzuca ${n.trim()}: ${r.total}` });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((n) => (
          <Button key={n} type="button" variant="outline" size="sm" onClick={() => roll(n)}>
            {n}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          roll(notation);
        }}
      >
        <Input aria-label="Notacja kości" value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="np. 2k6+3" />
        <Button type="submit">Rzuć</Button>
      </form>
      {last && (
        <p className="text-lg font-semibold tabular-nums" role="status">
          {last}
        </p>
      )}
    </div>
  );
}
