import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TILE_LABELS, TileBody } from "@/components/gm-screen/GmScreenTiles";
import {
  TILE_TYPES,
  addTile,
  moveTile,
  newTile,
  removeTile,
  resizeTile,
  updateTileConfig,
  useGmScreenLayout,
  type TileSize,
} from "@/lib/gmScreen";
import { cn } from "@/lib/utils";

const SPAN: Record<TileSize, string> = {
  s: "col-span-1",
  m: "col-span-1 lg:col-span-2",
  l: "col-span-1 sm:col-span-2 lg:col-span-4",
};

const SIZE_LABELS: Record<TileSize, string> = { s: "S", m: "M", l: "L" };

export default function GmScreenPage() {
  const [tiles, setTiles] = useGmScreenLayout();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" variant={editing ? "default" : "outline"} onClick={() => { setEditing((e) => !e); setPicking(false); }}>
          {editing ? <Check className="mr-2 h-5 w-5" /> : <Pencil className="mr-2 h-5 w-5" />}
          {editing ? "Gotowe" : "Edytuj układ"}
        </Button>
        {editing && (
          <Button size="lg" variant="outline" onClick={() => setPicking((p) => !p)}>
            <Plus className="mr-2 h-5 w-5" /> Dodaj kafelek
          </Button>
        )}
      </div>

      {editing && picking && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {TILE_TYPES.map((type) => (
            <Button size="lg"
              key={type}
              variant="secondary"
             
              onClick={() => {
                setTiles((prev) => addTile(prev, newTile(type)));
                setPicking(false);
              }}
            >
              {TILE_LABELS[type]}
            </Button>
          ))}
        </div>
      )}

      {tiles.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Ekran jest pusty. Włącz edycję i dodaj kafelki.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <Card key={tile.id} className={cn("min-w-0", SPAN[tile.size], editing && "border-dashed border-primary/50")}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
                <CardTitle className="text-base">{TILE_LABELS[tile.type]}</CardTitle>
                {editing && (
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => setTiles((p) => moveTile(p, tile.id, -1))} aria-label="Przesuń wcześniej">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" disabled={i === tiles.length - 1} onClick={() => setTiles((p) => moveTile(p, tile.id, 1))} aria-label="Przesuń dalej">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    {(Object.keys(SIZE_LABELS) as TileSize[]).map((s) => (
                      <Button
                        key={s}
                        size="icon"
                        variant={tile.size === s ? "default" : "ghost"}
                       
                        onClick={() => setTiles((p) => resizeTile(p, tile.id, s))}
                        aria-label={`Rozmiar ${SIZE_LABELS[s]}`}
                      >
                        {SIZE_LABELS[s]}
                      </Button>
                    ))}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setTiles((p) => removeTile(p, tile.id))}
                      aria-label="Usuń kafelek"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <TileBody tile={tile} editing={editing} onConfig={(patch) => setTiles((p) => updateTileConfig(p, tile.id, patch))} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
