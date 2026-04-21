import type { SavedNpc } from "./types";
import { STAT_MAIN } from "./constants";
/** Podgląd NPC w sheetach (Quests, Notatki) — zgodny z modelem karty WFRP. */
export function NpcQuickPreview({ npc }: { npc: SavedNpc }) {
  const p = npc.cechyGlowne.p;
  return (
    <div className="mt-4 space-y-3 text-sm">
      {npc.daneOgolne.obecnaProfesja && (
        <div>
          <div className="text-xs text-muted-foreground">Profesja</div>
          <div className="font-medium">{npc.daneOgolne.obecnaProfesja}</div>
        </div>
      )}
      {npc.cechyCharakteru && (
        <div>
          <div className="text-xs text-muted-foreground">Cechy</div>
          <div>{npc.cechyCharakteru}</div>
        </div>
      )}
      {npc.opisOgolny && (
        <div>
          <div className="text-xs text-muted-foreground">Opis</div>
          <div className="whitespace-pre-wrap">{npc.opisOgolny}</div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5 pt-2">
        {STAT_MAIN.map(({ key, label }) => (
          <div key={key} className="rounded bg-muted p-1.5 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
            <div className="text-sm font-bold">{p[key] || "—"}</div>
          </div>
        ))}
      </div>
      {npc.notatkiMG && (
        <div>
          <div className="text-xs text-muted-foreground">Notatki</div>
          <div className="whitespace-pre-wrap text-xs">{npc.notatkiMG}</div>
        </div>
      )}
    </div>
  );
}
