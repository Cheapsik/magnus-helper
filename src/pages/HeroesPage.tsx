import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ArrowLeft, Plus, Trash2, ScrollText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ──────────────────────── Typy ──────────────────────── */

type StatRow = { ww: string; us: string; k: string; odp: string; zr: string; int: string; sw: string; ogd: string };
type StatRow2 = { a: string; zyw: string; s: string; wt: string; sz: string; mag: string; po: string; pp: string };

interface Bron { id: string; nazwa: string; obc: string; kategoria: string; sila: string; zasieg: string; przeladowanie: string; cechy: string; }
interface PancerzProsty { id: string; typ: string; pz: string; }
interface PancerzZlozony { id: string; typ: string; obc: string; lokacja: string; pz: string; }
interface Umiejetnosc { id: string; nazwa: string; wykupione: boolean; plus10: boolean; plus20: boolean; zdolnosci: string; }
interface Zdolnosc { id: string; nazwa: string; opis: string; }
interface Wyposazenie { id: string; nazwa: string; obc: string; opis: string; }

interface Hero {
  id: string;
  daneOgolne: { imie: string; rasa: string; obecnaProfesja: string; poprzedniaProfesja: string; };
  opis: { wiek: string; plec: string; oczy: string; waga: string; wlosy: string; wzrost: string; znakGwiezdny: string; rodzenstwo: string; miejsceUrodzenia: string; znakiSzczegolne: string; };
  cechyGlowne: { p: StatRow; s: StatRow; a: StatRow; };
  cechyDrugorzedne: { p: StatRow2; s: StatRow2; a: StatRow2; };
  xp: { obecne: string; razem: string; };
  ruch: { ruch: string; szarza: string; bieg: string; };
  punktyZbroi: { glowa: string; korpus: string; prawaReka: string; lewaReka: string; prawaNoga: string; lewaNoga: string; };
  bron: Bron[];
  pancerzProsty: PancerzProsty[];
  pancerzZlozony: PancerzZlozony[];
  umiejetnosciPodstawowe: Umiejetnosc[];
  umiejetnosciZaawansowane: Umiejetnosc[];
  zdolnosci: Zdolnosc[];
  pieniadze: { zk: string; s: string; p: string; };
  wyposazenie: Wyposazenie[];
}

/* ──────────────────────── Stałe ──────────────────────── */

const DEFAULT_BASIC_SKILLS = [
  "Charakteryzacja", "Dowodzenie", "Hazard", "Jeździectwo", "Mocna głowa",
  "Opieka nad zwierzętami", "Plotkowanie", "Pływanie", "Powożenie", "Przekonywanie",
  "Przeszukiwanie", "Skradanie się", "Spostrzegawczość", "Sztuka przetrwania",
  "Targowanie", "Ukrywanie się", "Wioślarstwo", "Wspinaczka", "Wycena", "Zastraszanie",
];

const STAT_MAIN: { key: keyof StatRow; label: string }[] = [
  { key: "ww", label: "WW" }, { key: "us", label: "US" }, { key: "k", label: "K" }, { key: "odp", label: "Odp" },
  { key: "zr", label: "Zr" }, { key: "int", label: "Int" }, { key: "sw", label: "SW" }, { key: "ogd", label: "Ogd" },
];

const STAT_SECONDARY: { key: keyof StatRow2; label: string }[] = [
  { key: "a", label: "A" }, { key: "zyw", label: "Żyw" }, { key: "s", label: "S" }, { key: "wt", label: "Wt" },
  { key: "sz", label: "Sz" }, { key: "mag", label: "Mag" }, { key: "po", label: "PO" }, { key: "pp", label: "PP" },
];

const emptyStat = (): StatRow => ({ ww: "", us: "", k: "", odp: "", zr: "", int: "", sw: "", ogd: "" });
const emptyStat2 = (): StatRow2 => ({ a: "", zyw: "", s: "", wt: "", sz: "", mag: "", po: "", pp: "" });

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const createEmptyHero = (): Hero => ({
  id: newId(),
  daneOgolne: { imie: "", rasa: "", obecnaProfesja: "", poprzedniaProfesja: "" },
  opis: { wiek: "", plec: "", oczy: "", waga: "", wlosy: "", wzrost: "", znakGwiezdny: "", rodzenstwo: "", miejsceUrodzenia: "", znakiSzczegolne: "" },
  cechyGlowne: { p: emptyStat(), s: emptyStat(), a: emptyStat() },
  cechyDrugorzedne: { p: emptyStat2(), s: emptyStat2(), a: emptyStat2() },
  xp: { obecne: "", razem: "" },
  ruch: { ruch: "", szarza: "", bieg: "" },
  punktyZbroi: { glowa: "", korpus: "", prawaReka: "", lewaReka: "", prawaNoga: "", lewaNoga: "" },
  bron: [],
  pancerzProsty: [],
  pancerzZlozony: [],
  umiejetnosciPodstawowe: DEFAULT_BASIC_SKILLS.map((nazwa) => ({ id: newId(), nazwa, wykupione: false, plus10: false, plus20: false, zdolnosci: "" })),
  umiejetnosciZaawansowane: [],
  zdolnosci: [],
  pieniadze: { zk: "", s: "", p: "" },
  wyposazenie: [],
});

/* ──────────────────────── Główny komponent ──────────────────────── */

export default function HeroesPage() {
  const [heroes, setHeroes] = useLocalStorage<Hero[]>("rpg_characters", []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeHero = useMemo(() => heroes.find((h) => h.id === activeId) ?? null, [heroes, activeId]);

  const addHero = () => {
    const h = createEmptyHero();
    setHeroes((prev) => [...prev, h]);
    setActiveId(h.id);
  };

  const deleteHero = (id: string) => {
    setHeroes((prev) => prev.filter((h) => h.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateHero = (updated: Hero) => {
    setHeroes((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  if (activeHero) {
    return <HeroSheet hero={activeHero} onBack={() => setActiveId(null)} onSave={updateHero} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Bohaterowie</h1>
        <button
          onClick={addHero}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Dodaj Bohatera
        </button>
      </div>

      {heroes.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="text-sm">Brak postaci. Kliknij „Dodaj Bohatera", aby utworzyć nową kartę.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heroes.map((h) => (
            <div
              key={h.id}
              className="group bg-card border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setActiveId(h.id)}
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <ScrollText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{h.daneOgolne.imie || "Nowy bohater"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[h.daneOgolne.rasa, h.daneOgolne.obecnaProfesja].filter(Boolean).join(" · ") || "Brak danych"}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Usuń"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć postać?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tej operacji nie można cofnąć. Karta „{h.daneOgolne.imie || "Nowy bohater"}" zostanie trwale usunięta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteHero(h.id)}>Usuń</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Karta bohatera ──────────────────────── */

function HeroSheet({ hero, onBack, onSave }: { hero: Hero; onBack: () => void; onSave: (h: Hero) => void }) {
  const [draft, setDraft] = useState<Hero>(hero);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Sync if external hero changes (id switch)
  useEffect(() => { setDraft(hero); }, [hero.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(draft), 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = <K extends keyof Hero>(key: K, value: Hero[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="paper-sheet animate-fade-in">
      {/* Top bar */}
      <div className="paper-topbar">
        <button onClick={onBack} className="paper-back-btn min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Wróć do listy
        </button>
        <h1 className="paper-title">Karta Postaci: {draft.daneOgolne.imie || "—"}</h1>
      </div>

      <div className="paper-grid">
        {/* 1. BOHATER */}
        <Section title="BOHATER">
          <PaperField label="Imię" value={draft.daneOgolne.imie} onChange={(v) => update("daneOgolne", { ...draft.daneOgolne, imie: v })} />
          <PaperField label="Rasa" value={draft.daneOgolne.rasa} onChange={(v) => update("daneOgolne", { ...draft.daneOgolne, rasa: v })} />
          <PaperField label="Obecna profesja" value={draft.daneOgolne.obecnaProfesja} onChange={(v) => update("daneOgolne", { ...draft.daneOgolne, obecnaProfesja: v })} />
          <PaperField label="Poprzednia profesja" value={draft.daneOgolne.poprzedniaProfesja} onChange={(v) => update("daneOgolne", { ...draft.daneOgolne, poprzedniaProfesja: v })} />
        </Section>

        {/* 2. OPIS */}
        <Section title="OPIS BOHATERA">
          <div className="paper-field-grid">
            <PaperField label="Wiek" value={draft.opis.wiek} onChange={(v) => update("opis", { ...draft.opis, wiek: v })} />
            <PaperField label="Płeć" value={draft.opis.plec} onChange={(v) => update("opis", { ...draft.opis, plec: v })} />
            <PaperField label="Kolor oczu" value={draft.opis.oczy} onChange={(v) => update("opis", { ...draft.opis, oczy: v })} />
            <PaperField label="Waga" value={draft.opis.waga} onChange={(v) => update("opis", { ...draft.opis, waga: v })} />
            <PaperField label="Kolor włosów" value={draft.opis.wlosy} onChange={(v) => update("opis", { ...draft.opis, wlosy: v })} />
            <PaperField label="Wzrost" value={draft.opis.wzrost} onChange={(v) => update("opis", { ...draft.opis, wzrost: v })} />
            <PaperField label="Znak gwiezdny" value={draft.opis.znakGwiezdny} onChange={(v) => update("opis", { ...draft.opis, znakGwiezdny: v })} />
            <PaperField label="Rodzeństwo" value={draft.opis.rodzenstwo} onChange={(v) => update("opis", { ...draft.opis, rodzenstwo: v })} />
            <PaperField label="Miejsce urodzenia" value={draft.opis.miejsceUrodzenia} onChange={(v) => update("opis", { ...draft.opis, miejsceUrodzenia: v })} />
            <PaperField label="Znaki szczególne" value={draft.opis.znakiSzczegolne} onChange={(v) => update("opis", { ...draft.opis, znakiSzczegolne: v })} />
          </div>
        </Section>

        {/* 3. CECHY GŁÓWNE */}
        <Section title="CECHY GŁÓWNE" wide>
          <StatTable
            cols={STAT_MAIN}
            rows={draft.cechyGlowne}
            onChange={(rowKey, colKey, val) =>
              update("cechyGlowne", { ...draft.cechyGlowne, [rowKey]: { ...draft.cechyGlowne[rowKey], [colKey]: val } })
            }
          />
        </Section>

        {/* 4. CECHY DRUGORZĘDNE */}
        <Section title="CECHY DRUGORZĘDNE" wide>
          <StatTable
            cols={STAT_SECONDARY}
            rows={draft.cechyDrugorzedne}
            onChange={(rowKey, colKey, val) =>
              update("cechyDrugorzedne", { ...draft.cechyDrugorzedne, [rowKey]: { ...draft.cechyDrugorzedne[rowKey], [colKey]: val } })
            }
          />
        </Section>

        {/* 5. XP / RUCH / PUNKTY ZBROI */}
        <Section title="DOŚWIADCZENIE · RUCH · PUNKTY ZBROI" wide>
          <div className="paper-three-col">
            <div className="paper-subbox">
              <h4 className="paper-subhead">Punkty doświadczenia</h4>
              <PaperField label="Obecne" value={draft.xp.obecne} onChange={(v) => update("xp", { ...draft.xp, obecne: v })} />
              <PaperField label="Razem" value={draft.xp.razem} onChange={(v) => update("xp", { ...draft.xp, razem: v })} />
            </div>
            <div className="paper-subbox">
              <h4 className="paper-subhead">Ruch w walce</h4>
              <PaperField label="Ruch / odwrót" value={draft.ruch.ruch} onChange={(v) => update("ruch", { ...draft.ruch, ruch: v })} />
              <PaperField label="Szarża" value={draft.ruch.szarza} onChange={(v) => update("ruch", { ...draft.ruch, szarza: v })} />
              <PaperField label="Bieg" value={draft.ruch.bieg} onChange={(v) => update("ruch", { ...draft.ruch, bieg: v })} />
            </div>
            <div className="paper-subbox">
              <h4 className="paper-subhead">Punkty zbroi (lokacje)</h4>
              <BodyArmor
                values={draft.punktyZbroi}
                onChange={(patch) => update("punktyZbroi", { ...draft.punktyZbroi, ...patch })}
              />
            </div>
          </div>
        </Section>

        {/* 6. BROŃ */}
        <Section title="BROŃ" wide>
          <DynTable
            headers={["Nazwa", "Obc.", "Kategoria", "Siła broni", "Zasięg", "Przeład.", "Cechy oręża"]}
            rows={draft.bron}
            fields={["nazwa", "obc", "kategoria", "sila", "zasieg", "przeladowanie", "cechy"]}
            onChange={(rows) => update("bron", rows as Bron[])}
            addLabel="+ Dodaj broń"
            createRow={() => ({ id: newId(), nazwa: "", obc: "", kategoria: "", sila: "", zasieg: "", przeladowanie: "", cechy: "" })}
          />
        </Section>

        {/* 7. PANCERZ */}
        <Section title="PANCERZ" wide>
          <h4 className="paper-subhead">Opancerzenie proste</h4>
          <DynTable
            headers={["Typ pancerza", "Punkty Zbroi"]}
            rows={draft.pancerzProsty}
            fields={["typ", "pz"]}
            onChange={(rows) => update("pancerzProsty", rows as PancerzProsty[])}
            addLabel="+ Dodaj wiersz"
            createRow={() => ({ id: newId(), typ: "", pz: "" })}
          />
          <h4 className="paper-subhead mt-3">Opancerzenie złożone</h4>
          <DynTable
            headers={["Typ pancerza", "Obc.", "Lokacja ciała", "PZ"]}
            rows={draft.pancerzZlozony}
            fields={["typ", "obc", "lokacja", "pz"]}
            onChange={(rows) => update("pancerzZlozony", rows as PancerzZlozony[])}
            addLabel="+ Dodaj wiersz"
            createRow={() => ({ id: newId(), typ: "", obc: "", lokacja: "", pz: "" })}
          />
        </Section>

        {/* 8. UMIEJĘTNOŚCI */}
        <Section title="UMIEJĘTNOŚCI" wide>
          <div className="paper-skills-grid">
            <div>
              <h4 className="paper-subhead">Umiejętności podstawowe</h4>
              <SkillsTable
                rows={draft.umiejetnosciPodstawowe}
                onChange={(rows) => update("umiejetnosciPodstawowe", rows)}
                allowAdd={false}
              />
            </div>
            <div>
              <h4 className="paper-subhead">Umiejętności zaawansowane</h4>
              <SkillsTable
                rows={draft.umiejetnosciZaawansowane}
                onChange={(rows) => update("umiejetnosciZaawansowane", rows)}
                allowAdd
              />
            </div>
          </div>
        </Section>

        {/* 9. ZDOLNOŚCI */}
        <Section title="ZDOLNOŚCI" wide>
          <DynTable
            headers={["Zdolność", "Opis"]}
            rows={draft.zdolnosci}
            fields={["nazwa", "opis"]}
            onChange={(rows) => update("zdolnosci", rows as Zdolnosc[])}
            addLabel="+ Dodaj zdolność"
            createRow={() => ({ id: newId(), nazwa: "", opis: "" })}
          />
        </Section>

        {/* 10. PIENIĄDZE I WYPOSAŻENIE */}
        <Section title="PIENIĄDZE I WYPOSAŻENIE" wide>
          <div className="paper-money">
            <PaperField label="Złote korony (zk)" value={draft.pieniadze.zk} onChange={(v) => update("pieniadze", { ...draft.pieniadze, zk: v })} numeric />
            <PaperField label="Srebrne szylingi (s)" value={draft.pieniadze.s} onChange={(v) => update("pieniadze", { ...draft.pieniadze, s: v })} numeric />
            <PaperField label="Mosiężne pensy (p)" value={draft.pieniadze.p} onChange={(v) => update("pieniadze", { ...draft.pieniadze, p: v })} numeric />
          </div>
          <h4 className="paper-subhead mt-3">Wyposażenie</h4>
          <DynTable
            headers={["Przedmiot", "Obc.", "Opis"]}
            rows={draft.wyposazenie}
            fields={["nazwa", "obc", "opis"]}
            onChange={(rows) => update("wyposazenie", rows as Wyposazenie[])}
            addLabel="+ Dodaj przedmiot"
            createRow={() => ({ id: newId(), nazwa: "", obc: "", opis: "" })}
          />
        </Section>
      </div>
    </div>
  );
}

/* ──────────────────────── Komponenty pomocnicze ──────────────────────── */

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={"paper-section " + (wide ? "paper-section-wide" : "")}>
      <header className="paper-section-header">{title}</header>
      <div className="paper-section-body">{children}</div>
    </section>
  );
}

function PaperField({ label, value, onChange, numeric }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <label className="paper-field">
      <span className="paper-field-label">{label}</span>
      <input
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="paper-input"
      />
    </label>
  );
}

function StatTable<T extends StatRow | StatRow2>({
  cols, rows, onChange,
}: {
  cols: { key: keyof T; label: string }[];
  rows: { p: T; s: T; a: T };
  onChange: (rowKey: "p" | "s" | "a", colKey: keyof T, val: string) => void;
}) {
  const rowDefs: { key: "p" | "s" | "a"; label: string; bold?: boolean }[] = [
    { key: "p", label: "Początkowa" },
    { key: "s", label: "Schemat rozwoju" },
    { key: "a", label: "Aktualna", bold: true },
  ];
  return (
    <div className="paper-table-wrap">
      <table className="paper-table">
        <thead>
          <tr>
            <th></th>
            {cols.map((c) => <th key={String(c.key)}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((r) => (
            <tr key={r.key}>
              <th className="paper-row-head">{r.label}</th>
              {cols.map((c) => (
                <td key={String(c.key)}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={(rows[r.key][c.key] as unknown as string) ?? ""}
                    onChange={(e) => onChange(r.key, c.key, e.target.value)}
                    className={"paper-input paper-input-cell " + (r.bold ? "font-bold" : "")}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DynTable<T extends { id: string }>({
  headers, rows, fields, onChange, addLabel, createRow,
}: {
  headers: string[];
  rows: T[];
  fields: (keyof T)[];
  onChange: (rows: T[]) => void;
  addLabel: string;
  createRow: () => T;
}) {
  const updateCell = (id: string, field: keyof T, val: string) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };
  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const addRow = () => onChange([...rows, createRow()]);

  return (
    <div className="paper-table-wrap">
      <table className="paper-table">
        <thead>
          <tr>
            {headers.map((h) => <th key={h}>{h}</th>)}
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length + 1} className="paper-empty">Brak wpisów</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              {fields.map((f) => (
                <td key={String(f)}>
                  <input
                    type="text"
                    value={(r[f] as unknown as string) ?? ""}
                    onChange={(e) => updateCell(r.id, f, e.target.value)}
                    className="paper-input paper-input-cell"
                  />
                </td>
              ))}
              <td>
                <button
                  onClick={() => removeRow(r.id)}
                  className="paper-icon-btn"
                  aria-label="Usuń wiersz"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="paper-add-btn min-h-[44px]">{addLabel}</button>
    </div>
  );
}

function SkillsTable({
  rows, onChange, allowAdd,
}: {
  rows: Umiejetnosc[];
  onChange: (rows: Umiejetnosc[]) => void;
  allowAdd: boolean;
}) {
  const update = (id: string, patch: Partial<Umiejetnosc>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const add = () => onChange([...rows, { id: newId(), nazwa: "", wykupione: false, plus10: false, plus20: false, zdolnosci: "" }]);

  return (
    <div className="paper-table-wrap">
      <table className="paper-table paper-table-skills">
        <thead>
          <tr>
            <th className="text-left">Umiejętność</th>
            <th className="col-check" title="Wykupione">W</th>
            <th className="col-check">+10</th>
            <th className="col-check">+20</th>
            <th className="text-left">Zdolności pokrewne</th>
            {allowAdd && <th className="col-check"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={allowAdd ? 6 : 5} className="paper-empty">Brak umiejętności</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="text"
                  value={r.nazwa}
                  onChange={(e) => update(r.id, { nazwa: e.target.value })}
                  className="paper-input paper-input-cell text-left"
                />
              </td>
              <td className="col-check">
                <input type="checkbox" checked={r.wykupione} onChange={(e) => update(r.id, { wykupione: e.target.checked })} className="paper-checkbox" />
              </td>
              <td className="col-check">
                <input type="checkbox" checked={r.plus10} onChange={(e) => update(r.id, { plus10: e.target.checked })} className="paper-checkbox" />
              </td>
              <td className="col-check">
                <input type="checkbox" checked={r.plus20} onChange={(e) => update(r.id, { plus20: e.target.checked })} className="paper-checkbox" />
              </td>
              <td>
                <input
                  type="text"
                  value={r.zdolnosci}
                  onChange={(e) => update(r.id, { zdolnosci: e.target.value })}
                  className="paper-input paper-input-cell text-left"
                />
              </td>
              {allowAdd && (
                <td>
                  <button onClick={() => remove(r.id)} className="paper-icon-btn" aria-label="Usuń">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {allowAdd && (
        <button onClick={add} className="paper-add-btn min-h-[44px]">+ Dodaj umiejętność</button>
      )}
    </div>
  );
}

/* ──────────────────────── Body silhouette (Punkty zbroi) ──────────────────────── */

function BodyArmor({
  values,
  onChange,
}: {
  values: Hero["punktyZbroi"];
  onChange: (patch: Partial<Hero["punktyZbroi"]>) => void;
}) {
  const cell = (
    label: string,
    range: string,
    field: keyof Hero["punktyZbroi"],
  ) => (
    <div className="armor-cell">
      <div className="armor-cell-label">
        <span className="armor-cell-name">{label}</span>
        <span className="armor-cell-range">{range}</span>
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={values[field]}
        onChange={(e) => onChange({ [field]: e.target.value } as Partial<Hero["punktyZbroi"]>)}
        className="armor-input"
        aria-label={`${label} (${range})`}
      />
    </div>
  );

  return (
    <div className="armor-diagram">
      <div className="armor-figure" aria-hidden="true">
        <svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet">
          {/* Głowa */}
          <circle cx="50" cy="20" r="13" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          {/* Szyja */}
          <line x1="50" y1="33" x2="50" y2="40" stroke="#1a1a1a" strokeWidth="1.5" />
          {/* Tułów */}
          <path d="M30 42 L70 42 L66 110 L34 110 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          {/* Ręce */}
          <path d="M30 44 L18 90 L22 120 L28 120 L26 92 L34 60" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M70 44 L82 90 L78 120 L72 120 L74 92 L66 60" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          {/* Nogi */}
          <path d="M36 110 L32 185 L42 185 L46 110" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
          <path d="M64 110 L68 185 L58 185 L54 110" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="armor-grid">
        <div className="armor-row armor-row-head">
          {cell("Głowa", "01–15", "glowa")}
        </div>
        <div className="armor-row armor-row-arms">
          {cell("Pr. ręka", "16–35", "prawaReka")}
          {cell("Korpus", "56–80", "korpus")}
          {cell("L. ręka", "36–55", "lewaReka")}
        </div>
        <div className="armor-row armor-row-legs">
          {cell("Pr. noga", "81–90", "prawaNoga")}
          {cell("L. noga", "91–00", "lewaNoga")}
        </div>
      </div>
    </div>
  );
}
