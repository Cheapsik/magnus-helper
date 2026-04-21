import type { Bron, CharacterSheetCore, Hero, PancerzProsty, PancerzZlozony, SavedNpc, Zdolnosc, Wyposazenie } from "./types";
import { STAT_MAIN, STAT_SECONDARY } from "./constants";
import { defaultKampania, newId } from "./factory";
import { Section } from "./sub/Section";
import { PaperField } from "./sub/PaperField";
import { StatTable } from "./sub/StatTable";
import { DynTable } from "./sub/DynTable";
import { SkillsTable } from "./sub/SkillsTable";
import { BodyArmor } from "./sub/BodyArmor";
import { ZestawienieAkcji } from "./sub/ZestawienieAkcji";

export type CharacterSheetProps =
  | { variant: "hero"; value: Hero; onChange: (next: Hero) => void }
  | { variant: "npc"; value: SavedNpc; onChange: (next: SavedNpc) => void };

export function CharacterSheet(props: CharacterSheetProps) {
  const { variant, value, onChange } = props;

  const update = <K extends keyof CharacterSheetCore>(key: K, val: CharacterSheetCore[K]) => {
    onChange({ ...value, [key]: val } as never);
  };

  const km = variant === "hero" ? { ...defaultKampania(), ...(value as Hero).kampania } : null;
  const setKampania = (patch: Partial<ReturnType<typeof defaultKampania>>) => {
    if (variant !== "hero" || !km) return;
    const h = value as Hero;
    onChange({ ...h, kampania: { ...km, ...patch } } as never);
  };

  const npcExtras =
    variant === "npc"
      ? {
          cechyCharakteru: (value as SavedNpc).cechyCharakteru,
          opisOgolny: (value as SavedNpc).opisOgolny,
          notatkiMG: (value as SavedNpc).notatkiMG,
          setCechy: (v: string) => onChange({ ...(value as SavedNpc), cechyCharakteru: v } as never),
          setOpis: (v: string) => onChange({ ...(value as SavedNpc), opisOgolny: v } as never),
          setNotatki: (v: string) => onChange({ ...(value as SavedNpc), notatkiMG: v } as never),
        }
      : null;

  return (
    <div className="wfrp-sheet">
      <div className="wfrp-page wfrp-page-1">
        <div className="wfrp-p1-grid">
          <div className="wfrp-p1-left">
            {variant === "npc" && npcExtras && (
              <Section title="NPC — MG" className="wfrp-mt-section">
                <PaperField
                  label="Cechy charakteru"
                  value={npcExtras.cechyCharakteru}
                  onChange={npcExtras.setCechy}
                />
                <PaperField label="Opis / wygląd" value={npcExtras.opisOgolny} onChange={npcExtras.setOpis} />
                <PaperField label="Notatki MG" value={npcExtras.notatkiMG} onChange={npcExtras.setNotatki} />
              </Section>
            )}
            <Section title="BOHATER">
              <PaperField
                label="Imię"
                value={value.daneOgolne.imie}
                onChange={(v) => update("daneOgolne", { ...value.daneOgolne, imie: v })}
              />
              <PaperField
                label="Poprzednia profesja"
                value={value.daneOgolne.poprzedniaProfesja}
                onChange={(v) => update("daneOgolne", { ...value.daneOgolne, poprzedniaProfesja: v })}
              />
              <PaperField
                label="Obecna profesja"
                value={value.daneOgolne.obecnaProfesja}
                onChange={(v) => update("daneOgolne", { ...value.daneOgolne, obecnaProfesja: v })}
              />
              <PaperField
                label="Rasa"
                value={value.daneOgolne.rasa}
                onChange={(v) => update("daneOgolne", { ...value.daneOgolne, rasa: v })}
              />
            </Section>
            <Section title="OPIS BOHATERA" className="wfrp-mt-section">
              <div className="paper-field-grid wfrp-opis-grid">
                <PaperField label="Płeć" value={value.opis.plec} onChange={(v) => update("opis", { ...value.opis, plec: v })} />
                <PaperField
                  label="Znaki szczególne"
                  value={value.opis.znakiSzczegolne}
                  onChange={(v) => update("opis", { ...value.opis, znakiSzczegolne: v })}
                />
                <PaperField
                  label="Miejsce urodzenia"
                  value={value.opis.miejsceUrodzenia}
                  onChange={(v) => update("opis", { ...value.opis, miejsceUrodzenia: v })}
                />
                <PaperField
                  label="Znak gwiezdny"
                  value={value.opis.znakGwiezdny}
                  onChange={(v) => update("opis", { ...value.opis, znakGwiezdny: v })}
                />
                <PaperField label="Kolor włosów" value={value.opis.wlosy} onChange={(v) => update("opis", { ...value.opis, wlosy: v })} />
                <PaperField label="Kolor oczu" value={value.opis.oczy} onChange={(v) => update("opis", { ...value.opis, oczy: v })} />
                <PaperField label="Wiek" value={value.opis.wiek} onChange={(v) => update("opis", { ...value.opis, wiek: v })} />
                <PaperField
                  label="Rodzeństwo"
                  value={value.opis.rodzenstwo}
                  onChange={(v) => update("opis", { ...value.opis, rodzenstwo: v })}
                />
                <PaperField label="Wzrost" value={value.opis.wzrost} onChange={(v) => update("opis", { ...value.opis, wzrost: v })} />
                <PaperField label="Waga" value={value.opis.waga} onChange={(v) => update("opis", { ...value.opis, waga: v })} />
              </div>
            </Section>
          </div>

          <div className="wfrp-p1-mid">
            <Section title="CECHY" className="wfrp-section-cechy">
              <h4 className="paper-subhead">Cechy główne</h4>
              <StatTable
                cols={STAT_MAIN}
                rows={value.cechyGlowne}
                onChange={(rowKey, colKey, val) =>
                  update("cechyGlowne", {
                    ...value.cechyGlowne,
                    [rowKey]: { ...value.cechyGlowne[rowKey], [colKey]: val },
                  })
                }
              />
              <h4 className="paper-subhead wfrp-subhead-tight">Cechy drugorzędne</h4>
              <StatTable
                cols={STAT_SECONDARY}
                rows={value.cechyDrugorzedne}
                onChange={(rowKey, colKey, val) =>
                  update("cechyDrugorzedne", {
                    ...value.cechyDrugorzedne,
                    [rowKey]: { ...value.cechyDrugorzedne[rowKey], [colKey]: val },
                  })
                }
              />
            </Section>

            <div className="wfrp-xp-ruch-stack">
              <div className="wfrp-xp-ruch-armor">
                {variant === "hero" && km && (
                  <div className="paper-subbox wfrp-gracz-span">
                    <h4 className="paper-subhead">Gracz / kampania</h4>
                    <div className="paper-field-grid wfrp-gracz-grid">
                      <PaperField label="Imię gracza" value={km.gracz} onChange={(v) => setKampania({ gracz: v })} />
                      <PaperField label="Kampania" value={km.kampania} onChange={(v) => setKampania({ kampania: v })} />
                      <PaperField label="Mistrz gry" value={km.mistrzGry} onChange={(v) => setKampania({ mistrzGry: v })} />
                      <PaperField label="Rok kampanii" value={km.rokKampanii} onChange={(v) => setKampania({ rokKampanii: v })} />
                    </div>
                  </div>
                )}
                <div className="paper-subbox wfrp-xp-box">
                  <h4 className="paper-subhead">Punkty doświadczenia</h4>
                  <PaperField label="Obecne" value={value.xp.obecne} onChange={(v) => update("xp", { ...value.xp, obecne: v })} />
                  <PaperField label="Razem" value={value.xp.razem} onChange={(v) => update("xp", { ...value.xp, razem: v })} />
                </div>
                <div className="paper-subbox wfrp-ruch-box">
                  <h4 className="paper-subhead">Ruch w walce</h4>
                  <PaperField label="Ruch / odwrót" value={value.ruch.ruch} onChange={(v) => update("ruch", { ...value.ruch, ruch: v })} />
                  <PaperField label="Szarża" value={value.ruch.szarza} onChange={(v) => update("ruch", { ...value.ruch, szarza: v })} />
                  <PaperField label="Bieg" value={value.ruch.bieg} onChange={(v) => update("ruch", { ...value.ruch, bieg: v })} />
                </div>
              </div>
              <div className="paper-subbox wfrp-armor-block">
                <h4 className="paper-subhead">Punkty zbroi</h4>
                <BodyArmor
                  values={value.punktyZbroi}
                  onChange={(patch) => update("punktyZbroi", { ...value.punktyZbroi, ...patch })}
                />
              </div>
            </div>
          </div>
        </div>

        <ZestawienieAkcji />

        <Section title="BROŃ" wide className="wfrp-section-bron">
          <DynTable
            headers={["Nazwa", "Obc.", "Cechy oręża", "Przeład.", "Zasięg", "Siła broni", "Kategoria"]}
            rows={value.bron}
            fields={["nazwa", "obc", "cechy", "przeladowanie", "zasieg", "sila", "kategoria"]}
            onChange={(rows) => update("bron", rows as Bron[])}
            addLabel="+ Dodaj broń"
            createRow={() => ({
              id: newId(),
              nazwa: "",
              obc: "",
              kategoria: "",
              sila: "",
              zasieg: "",
              przeladowanie: "",
              cechy: "",
            })}
          />
        </Section>

        <Section title="PANCERZ" wide>
          <h4 className="paper-subhead">Opancerzenie proste</h4>
          <DynTable
            headers={["Typ pancerza", "Punkty Zbroi"]}
            rows={value.pancerzProsty}
            fields={["typ", "pz"]}
            onChange={(rows) => update("pancerzProsty", rows as PancerzProsty[])}
            addLabel="+ Dodaj wiersz"
            createRow={() => ({ id: newId(), typ: "", pz: "" })}
          />
          <h4 className="paper-subhead wfrp-subhead-tight">Opancerzenie złożone</h4>
          <DynTable
            headers={["Typ pancerza", "Obc.", "Lokacja ciała", "PZ"]}
            rows={value.pancerzZlozony}
            fields={["typ", "obc", "lokacja", "pz"]}
            onChange={(rows) => update("pancerzZlozony", rows as PancerzZlozony[])}
            addLabel="+ Dodaj wiersz"
            createRow={() => ({ id: newId(), typ: "", obc: "", lokacja: "", pz: "" })}
          />
        </Section>

        <p className="wfrp-kosmit">KOSMIT 2013 · www.kosmitpaczy.pl</p>
      </div>

      <div className="wfrp-page wfrp-page-2">
        <div className="wfrp-p2-columns">
          <section className="paper-section wfrp-p2-skills-section">
            <header className="paper-section-header">UMIEJĘTNOŚCI</header>
            <div className="paper-section-body">
              <h4 className="paper-subhead">Umiejętności podstawowe</h4>
              <SkillsTable rows={value.umiejetnosciPodstawowe} onChange={(rows) => update("umiejetnosciPodstawowe", rows)} allowAdd={false} />
              <h4 className="paper-subhead wfrp-subhead-tight">Umiejętności zaawansowane</h4>
              <SkillsTable rows={value.umiejetnosciZaawansowane} onChange={(rows) => update("umiejetnosciZaawansowane", rows)} allowAdd />
            </div>
          </section>
          <section className="paper-section wfrp-p2-talents-section">
            <header className="paper-section-header">ZDOLNOŚCI</header>
            <div className="paper-section-body">
              <DynTable
                headers={["Zdolność", "Opis"]}
                rows={value.zdolnosci}
                fields={["nazwa", "opis"]}
                onChange={(rows) => update("zdolnosci", rows as Zdolnosc[])}
                addLabel="+ Dodaj zdolność"
                createRow={() => ({ id: newId(), nazwa: "", opis: "" })}
              />
            </div>
          </section>
        </div>

        <Section title="PIENIĄDZE" wide>
          <div className="paper-money wfrp-money-row">
            <PaperField label="Złote korony (zk)" value={value.pieniadze.zk} onChange={(v) => update("pieniadze", { ...value.pieniadze, zk: v })} numeric />
            <PaperField label="Srebrne szylingi (s)" value={value.pieniadze.s} onChange={(v) => update("pieniadze", { ...value.pieniadze, s: v })} numeric />
            <PaperField label="Mosiężne pensy (p)" value={value.pieniadze.p} onChange={(v) => update("pieniadze", { ...value.pieniadze, p: v })} numeric />
          </div>
        </Section>

        <Section title="WYPOSAŻENIE" wide>
          <DynTable
            headers={["Przedmiot", "Obc.", "Opis"]}
            rows={value.wyposazenie}
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
