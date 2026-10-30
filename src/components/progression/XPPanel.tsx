import { useState } from "react";
import { Award, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inputCls } from "@/components/system/controls";
import { useCards } from "@/lib/cardStore";
import { advance, canAdvance, grantXP, newRecord, nextTier, useCardXP, useProgressionConfig, type XPRecord } from "@/lib/progression";

function GrantDialog({ title, open, onClose, onGrant }: {
  title: string; open: boolean; onClose: () => void; onGrant: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const n = Number(amount);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <input type="number" autoFocus className={inputCls} placeholder="Ilość PD" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className={inputCls} placeholder="Powód (opcjonalnie)" value={note} onChange={(e) => setNote(e.target.value)} />
        <DialogFooter>
          <Button disabled={!n} onClick={() => { onGrant(n, note.trim()); setAmount(""); setNote(""); onClose(); }}>Przyznaj</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shown under a hero card: level, XP, grant / advance buttons and history. */
export function XPPanel({ cardId, cardName }: { cardId: string; cardName: string }) {
  const [config] = useProgressionConfig();
  const [all, setAll] = useCardXP();
  const [granting, setGranting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const record = all[cardId] ?? newRecord();
  const tier = nextTier(record, config);
  const set = (r: XPRecord) => setAll((prev) => ({ ...prev, [cardId]: r }));

  return (
    <section className="mt-4 space-y-2 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Poziom {record.level}</Badge>
        <span className="text-sm">{record.xp} PD{tier ? ` / ${tier.xp}` : ""}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setGranting(true)}><Star className="h-3 w-3" /> Przyznaj PD</Button>
          {canAdvance(record, config) && (
            <Button size="sm" onClick={() => setAdvancing(true)}><Award className="h-3 w-3" /> Awansuj</Button>
          )}
        </div>
      </div>
      {record.history.length > 0 && (
        <ul className="max-h-40 space-y-0.5 overflow-auto text-xs text-muted-foreground">
          {[...record.history].reverse().map((h, i) => (
            <li key={i}>
              {new Date(h.at).toLocaleDateString("pl-PL")} —{" "}
              {h.type === "xp" ? `${h.amount! > 0 ? "+" : ""}${h.amount} PD` : `Awans na poziom ${h.level}`}
              {h.note && `: ${h.note}`}
            </li>
          ))}
        </ul>
      )}
      <GrantDialog title={`Przyznaj PD: ${cardName}`} open={granting} onClose={() => setGranting(false)}
        onGrant={(a, note) => set(grantXP(record, a, note))} />
      <Dialog open={advancing} onOpenChange={setAdvancing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Awans na poziom {tier?.level}</DialogTitle></DialogHeader>
          <p className="text-sm">{tier?.reward || "Brak opisanej nagrody."}</p>
          <DialogFooter>
            <Button onClick={() => { set(advance(record, config)); setAdvancing(false); }}>Potwierdź awans</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Header action on the heroes list: grants the same XP to every hero. */
export function PartyXPButton() {
  const [heroes] = useCards("hero");
  const [, setAll] = useCardXP();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={heroes.length === 0}>
        <Star className="h-3.5 w-3.5" /> PD dla drużyny
      </Button>
      <GrantDialog title="Przyznaj PD całej drużynie" open={open} onClose={() => setOpen(false)}
        onGrant={(a, note) =>
          setAll((prev) => {
            const next = { ...prev };
            for (const h of heroes) next[h.id] = grantXP(prev[h.id], a, note);
            return next;
          })} />
    </>
  );
}
