import { useEffect, useRef, useState } from "react";
import { Dices, Loader2, Shuffle } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_DUNGEON_OPTIONS, type DungeonOptions, randomSeed, renderDungeon } from "@/lib/dungeonGenerator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Labeled, inputCls } from "@/components/system/controls";
import { cn } from "@/lib/utils";

type Choice = [value: string, label: string];

const SIZES: Choice[] = [
  ["Fine", "Maleńki"],
  ["Diminutive", "Bardzo mały"],
  ["Tiny", "Mały"],
  ["Small", "Niewielki"],
  ["Medium", "Średni"],
  ["Large", "Duży"],
  ["Huge", "Bardzo duży"],
  ["Gargantuan", "Ogromny"],
  ["Colossal", "Kolosalny"],
  ["Custom", "Własny"],
];
const LAYOUTS: Choice[] = [
  ["Square", "Kwadrat"],
  ["Rectangle", "Prostokąt"],
  ["Box", "Ramka"],
  ["Cross", "Krzyż"],
  ["Dagger", "Sztylet"],
  ["Saltire", "Krzyż ukośny"],
  ["Keep", "Twierdza"],
  ["Hexagon", "Sześciokąt"],
  ["Round", "Okrąg"],
  ["Cavernous", "Jaskinie"],
];
const NO_YES_MANY: Choice[] = [
  ["", "Nie"],
  ["Yes", "Tak"],
  ["Many", "Wiele"],
];
const EGRESS: Choice[] = [...NO_YES_MANY, ["Tiling", "Do łączenia map"]];
const ROOM_LAYOUTS: Choice[] = [
  ["Sparse", "Rzadki"],
  ["Scattered", "Rozproszony"],
  ["Dense", "Gęsty"],
  ["Symmetric", "Symetryczny"],
];
const ROOM_SIZES: Choice[] = [
  ["Small", "Małe"],
  ["Medium", "Średnie"],
  ["Large", "Duże"],
  ["Huge", "Bardzo duże"],
  ["Gargantuan", "Ogromne"],
  ["Colossal", "Kolosalne"],
];
const DOORS: Choice[] = [
  ["None", "Brak (tylko przejścia)"],
  ["Basic", "Podstawowe"],
  ["Secure", "Zabezpieczone"],
  ["Standard", "Standardowe"],
  ["Deathtrap", "Śmiertelne pułapki"],
];
const CORRIDORS: Choice[] = [
  ["Labyrinth", "Labirynt"],
  ["Errant", "Kręte"],
  ["Straight", "Proste"],
];
const DEADENDS: Choice[] = [
  ["", "Zostaw"],
  ["Some", "Usuń część"],
  ["All", "Usuń wszystkie"],
];
const STYLES: Choice[] = [
  ["Battlemap", "Mapa bitewna"],
  ["Battlemap Sandstone", "Mapa bitewna: piaskowiec"],
  ["Battlemap Basalt", "Mapa bitewna: bazalt"],
  ["Standard", "Standardowy"],
  ["Classic", "Klasyczny"],
  ["Crosshatch", "Kreskowanie"],
  ["GraphPaper", "Papier w kratkę"],
  ["Parchment", "Pergamin"],
  ["Marble", "Marmur"],
  ["Sandstone", "Piaskowiec"],
  ["Slate", "Łupek"],
  ["Aquatic", "Podwodny"],
  ["Infernal", "Piekielny"],
  ["Glacial", "Lodowy"],
  ["Wooden", "Drewniany"],
  ["Asylum", "Szpitalny"],
  ["Steampunk", "Steampunk"],
  ["Gamma", "Gamma"],
];
const GRIDS: Choice[] = [
  ["None", "Brak"],
  ["Square", "Kwadratowa"],
  ["Hex", "Heksagonalna"],
  ["VertHex", "Heksagonalna pionowa"],
];
const FURNISH: Choice[] = [
  ["None", "Bez wyposażenia"],
  ["Random", "Losowe"],
  ["Generic", "Ogólne"],
  ["Goblinoid Den", "Legowisko goblinów"],
  ["Bandit Hideout", "Kryjówka bandytów"],
  ["Monster Infested", "Siedlisko potworów"],
  ["Haunted Crypt", "Nawiedzona krypta"],
];
const ART: Choice[] = [
  ["painted", "Malowane"],
  ["ink", "Szkic tuszem"],
  ["scribble", "Szkic odręczny"],
  ["pixel", "Piksele 1-bit"],
];
const SCALES: Choice[] = [
  ["", "Automatyczna"],
  ["16", "16 px na pole"],
  ["32", "32 px na pole"],
  ["70", "70 px na pole"],
];
/** What "Losowy loch" rerolls; the size never becomes custom. */
const REROLLED: [keyof DungeonOptions, Choice[]][] = [
  ["dungeon_size", SIZES.filter(([v]) => v !== "Custom")],
  ["dungeon_layout", LAYOUTS],
  ["peripheral_egress", EGRESS],
  ["room_layout", ROOM_LAYOUTS],
  ["room_size", ROOM_SIZES],
  ["room_polymorph", NO_YES_MANY],
  ["door_set", DOORS],
  ["corridor_layout", CORRIDORS],
  ["remove_deadends", DEADENDS],
  ["add_stairs", NO_YES_MANY],
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export default function DungeonGeneratorPage() {
  const [saved, setSaved] = useLocalStorage<DungeonOptions>("rpg_dungeon_generator", { ...DEFAULT_DUNGEON_OPTIONS, seed: randomSeed() });
  const [form, setForm] = useState<DungeonOptions>({ ...DEFAULT_DUNGEON_OPTIONS, ...saved });
  const [images, setImages] = useState<string[]>([]);
  const [floor, setFloor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const latest = useRef(0);

  const set = <K extends keyof DungeonOptions>(key: K, value: DungeonOptions[K]) => setForm((f) => ({ ...f, [key]: value }));

  const generate = async (options: DungeonOptions) => {
    const run = ++latest.current;
    setBusy(true);
    setError(null);
    setSaved(options);
    try {
      const blobs = await renderDungeon(options);
      if (run !== latest.current) return;
      setImages((old) => {
        old.forEach((url) => URL.revokeObjectURL(url));
        return blobs.map((b) => URL.createObjectURL(b));
      });
      setFloor(0);
    } catch (e) {
      if (run === latest.current) setError(e instanceof Error ? e.message : "Nie udało się wygenerować mapy");
    } finally {
      if (run === latest.current) setBusy(false);
    }
  };

  // The saved settings rebuild the same map: generation is deterministic for a seed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void generate(form), []);
  useEffect(() => () => images.forEach((url) => URL.revokeObjectURL(url)), [images]);

  const submit = (options: DungeonOptions) => {
    const next = /^\d+$/.test(options.seed.trim()) ? options : { ...options, seed: randomSeed() };
    setForm(next);
    void generate(next);
  };

  const randomDungeon = () => {
    const next = { ...form, seed: randomSeed() };
    for (const [key, choices] of REROLLED) (next as Record<string, unknown>)[key] = pick(choices)[0];
    submit(next);
  };

  const select = (key: keyof DungeonOptions, label: string, choices: Choice[]) => (
    <Labeled label={label}>
      <select className={inputCls} value={String(form[key])} onChange={(e) => set(key, e.target.value as never)}>
        {choices.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Labeled>
  );

  const image = images[floor];

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Generator rysuje mapę podziemi według ustawień poniżej. To samo ziarno zawsze daje tę samą mapę, więc zapisane
        ustawienia odtwarzają ją po powrocie. Kliknij mapę, aby otworzyć ją na pełnym ekranie.
      </p>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-5 p-4">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                submit(form);
              }}
            >
              <Section title="Ogólne">
                <Labeled label="Ziarno losowania">
                  <div className="flex gap-1.5">
                    <input className={inputCls} inputMode="numeric" maxLength={10} value={form.seed} onChange={(e) => set("seed", e.target.value)} />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => set("seed", randomSeed())} aria-label="Losuj ziarno">
                      <Dices className="h-4 w-4" />
                    </Button>
                  </div>
                </Labeled>
                <Labeled label="Piętra">
                  <select className={inputCls} value={form.floors} onChange={(e) => set("floors", Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </Section>

              <Section title="Układ">
                {select("dungeon_size", "Rozmiar podziemi", SIZES)}
                {form.dungeon_size === "Custom" && (
                  <Labeled label="Kolumny × wiersze (11–301)">
                    <div className="flex gap-1.5">
                      <input type="number" min={11} max={301} className={inputCls} value={form.map_cols} onChange={(e) => set("map_cols", Number(e.target.value))} aria-label="Kolumny" />
                      <input type="number" min={11} max={301} className={inputCls} value={form.map_rows} onChange={(e) => set("map_rows", Number(e.target.value))} aria-label="Wiersze" />
                    </div>
                  </Labeled>
                )}
                {select("dungeon_layout", "Kształt podziemi", LAYOUTS)}
                {select("peripheral_egress", "Wyjścia na krawędziach", EGRESS)}
              </Section>

              <Section title="Pomieszczenia i korytarze">
                {select("room_layout", "Rozmieszczenie pomieszczeń", ROOM_LAYOUTS)}
                {select("room_size", "Wielkość pomieszczeń", ROOM_SIZES)}
                {select("room_polymorph", "Nieregularne kształty", NO_YES_MANY)}
                {select("door_set", "Drzwi", DOORS)}
                {select("corridor_layout", "Korytarze", CORRIDORS)}
                {select("remove_deadends", "Ślepe zaułki", DEADENDS)}
                {select("add_stairs", "Schody", NO_YES_MANY)}
              </Section>

              <Section title="Mapa">
                {select("map_style", "Styl mapy", STYLES)}
                {select("grid", "Siatka", GRIDS)}
                {select("cell_size", "Skala", SCALES)}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.labels} onChange={(e) => set("labels", e.target.checked)} />
                  Numery pomieszczeń i oznaczenia schodów
                </label>
              </Section>

              <Section title="Wyposażenie">
                {select("furnish", "Wyposażenie pomieszczeń", FURNISH)}
                {form.furnish !== "None" && select("furniture_art", "Styl rysunków", ART)}
              </Section>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gap-2" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />} Generuj
                </Button>
                <Button type="button" variant="outline" className="gap-2" disabled={busy} onClick={randomDungeon}>
                  <Shuffle className="h-4 w-4" /> Losowy loch
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-2 lg:sticky lg:top-4 lg:self-start">
          {images.length > 1 && (
            <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Piętra">
              {images.map((_, k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={k === floor}
                  onClick={() => setFloor(k)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                    k === floor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Piętro {k + 1}
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {image ? (
            <button
              type="button"
              className={cn("block w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-black", busy && "opacity-60")}
              onClick={() => {
                setActualSize(false);
                setFullscreen(true);
              }}
              aria-label="Otwórz mapę na pełnym ekranie"
            >
              <img src={image} alt={`Mapa podziemi${images.length > 1 ? `, piętro ${floor + 1}` : ""}`} className="mx-auto max-h-[75vh] w-auto max-w-full" />
            </button>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              {busy ? "Generuję mapę…" : "Brak mapy"}
            </div>
          )}
        </div>
      </div>

      <Dialog open={fullscreen && Boolean(image)} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 sm:rounded-none">
          <DialogTitle className="sr-only">Mapa podziemi</DialogTitle>
          <div className={cn("min-h-0 flex-1", actualSize ? "overflow-auto" : "flex items-center justify-center overflow-hidden")}>
            <img
              src={image}
              alt="Mapa podziemi na pełnym ekranie"
              onClick={() => setActualSize((v) => !v)}
              title={actualSize ? "Kliknij, aby dopasować do ekranu" : "Kliknij, aby zobaczyć w pełnej skali"}
              className={cn(actualSize ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain")}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}
