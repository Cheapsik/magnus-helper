# IP_CLEANUP_PLAN — usunięcie zależności od IP Warhammer / WFRP

> **Status:** audyt, kod nie był modyfikowany.
> **Data:** 2026-10-15 · **Gałąź:** `feat/campaigns` (`e79ebea`) + niezacommitowane zmiany w drzewie roboczym.
> **Zakres:** `src/`, `public/`, `index.html`, `docs/`, pliki `.md` w katalogu głównym, historia gita, gałęzie `origin/main` i `origin/gh-pages`, wdrożona strona.
> **Zastrzeżenie:** to audyt techniczny, nie opinia prawna. Mechaniki gier (np. rzut k100 „pod wartość”) z zasady nie podlegają prawu autorskiemu, ale konkretny tekst, tłumaczenia, nazwy, znaki towarowe i rozpoznawalny układ karty już tak. Przed startem komercyjnym listę z sekcji 4 i 8 powinien przejrzeć prawnik od IP.

---

## 1. Podsumowanie

| Obszar | Stan | Ryzyko |
|---|---|---|
| **Drzewo robocze (niezacommitowane)** | Brak nazw własnych lore (bogowie, miasta, frakcje, Chaos). Zostało **ok. 30 plików** z mechaniką i terminologią **WFRP 2. edycji w polskim tłumaczeniu** (cechy, Krzepa/Ogłada, waluta zk/s/p, PP/PO, „Schemat rozwoju”, tabela trudności, lokacje trafień). | **Średnie**: trade dress i rozpoznawalne terminy tłumaczenia. |
| **HEAD / `origin/main`** | Nadal zawiera `src/data/zdolnosci.ts`: **113 wpisów** umiejętności i zdolności WFRP 2 z opisami (prawdopodobnie tekst z podręcznika), a także `src/data/cheatsheets.ts`, „Ubersreik”, „Aldric Grimwald”, odniesienia do Chaosu, Imperium, Ulryka, Sigmara, Kislevu i Bretonii. W drzewie roboczym są usunięte, ale **niezacommitowane**. | **Wysokie** (tekst chroniony prawem autorskim). |
| **Publiczna historia gita** | Repo `github.com/Cheapsik/magnus-helper` jest **publiczne** (HTTP 200). Treści WFRP są w commitach `bd6a4a6`, `c66847e`, `5370aa9`, `8e5b8da`, `457c43b`, `4ccb8cb`, `e79ebea`. | **Wysokie**: kopia jest publicznie rozpowszechniana. |
| **Wdrożona strona (`origin/gh-pages`)** | Bundle `8e5b8da` zawiera m.in. „Ubersreik”, „Grimwald”, „Ogłada”, „Punkty Przeznaczenia”. `cheapsik.github.io/magnus-helper` odpowiada HTTP 200. | **Wysokie**: to publiczna dystrybucja. |
| **IP innych wydawców** | `public/assets/images/background.png` pokazuje okładki z napisami **PLAYER'S HANDBOOK / DUNGEON MASTER'S GUIDE / MONSTER MANUAL** (znaki Wizards of the Coast). Placeholder „Zbrojownia w **Westfall**” to strefa z Warcrafta (Blizzard). | **Wysokie** (grafika), niskie (placeholder). |
| **Marka „Magnus”** | Kojarzy się z *Magnusem Pobożnym* (cesarz z lore WFRP) i *Magnusem Czerwonym* (prymarcha *Thousand Sons*; „Thousand Sons” jest na liście znaków GW). | **Niskie / średnie**: słowo ogólne, ale razem z kartą WFRP-podobną daje skojarzenie. |
| **Schemat bazy danych** | Brak ORM i migracji SQL. Supabase obsługuje tylko autoryzację, dane domenowe trzymane są w `localStorage`. Typy WFRP siedzą w **typach TS** i kluczach `localStorage`. | Brak. |
| **Architektura** | Abstrakcja już istnieje: `src/lib/cardSchema.ts` (`CampaignSchema`, `RoleBindings`). Część UI (walka, NPC, mapa relacji, szkic postaci) wciąż korzysta z **legacy typów WFRP**. | Do dokończenia (sekcja 5). |

**Wniosek:** w kodzie nie ma już „fluffu” Warhammera. Główne ryzyka to (1) **publicznie dostępna historia i wdrożona stara wersja** z tekstem reguł WFRP, (2) **grafika z okładkami D&D** oraz (3) **zaszyta na sztywno mechanika i polska terminologia WFRP 2e** w silniku walki, testów i karty.

---

## 2. Metodologia

1. Przeszukanie `rg` drzewa roboczego, HEAD (`git archive`), `origin/gh-pages` i całej historii (`git log -S`) pod kątem ok. 150 terminów: rasy, frakcje, bogowie, miejsca, mechaniki, profesje, wiatry magii, waluty i polskie skróty cech.
2. Ekstrakcja wszystkich literałów tekstowych z `src/` (≈6000) i ręczny przegląd rzadkich rzeczowników własnych.
3. Ręczny przegląd plików z danymi (`lib/dice.ts`, `lib/gameStatGlossary.ts`, `lib/cardMigration.ts`, `components/character-sheet/*`, `lib/lootDb.ts`, `lib/shopTypes.ts`, `pages/*`).
4. Przegląd assetów graficznych (`background.png`, `favicon`, tekstury kości). Tekstury pochodzą z `@3d-dice/dice-box-threejs` na licencji MIT.
5. Weryfikacja w sieci: lista znaków towarowych GW, skojarzenia nazw (Magnus, panteon Starego Świata, lokacje). Źródła na końcu dokumentu.

---

## 3. Lista plików wymagających interwencji

Oznaczenia: 🔴 wysokie · 🟠 średnie · 🟡 niskie · ⚪ kosmetyka/dokumentacja.
`[WT]` = drzewo robocze, `[HEAD]` = zacommitowane lub wypchnięte.

### 3.1 Treści / dane seed

| # | Plik | Co zawiera | Ryzyko |
|---|---|---|---|
| T1 | `src/data/zdolnosci.ts` `[HEAD, usunięty w WT]` | 113 umiejętności i zdolności WFRP 2 PL z opisami: „Splatanie magii”, „Odporność na Chaos”, „Krasnoludzki fach”, „Magia kapłańska” (Sigmar, Ulryk…), „Wiedza (różne)” (Kislev, Bretonia…), „Szał bojowy”, „Zapiekła nienawiść”, „Mocna głowa” itd. | 🔴 |
| T2 | `src/data/cheatsheets.ts` `[HEAD, usunięty w WT]` | Ściągi reguł (testy procentowe, stopnie sukcesu, runda walki) | 🟠 |
| T3 | `src/context/AppContext.tsx` `[HEAD]` | Przykładowe notatki „Podróż do Ubersreiku”, postać „Aldric Grimwald”. W WT już usunięte. | 🔴 (HEAD) |
| T4 | `src/pages/SessionNotesPage.tsx:799` `[HEAD]` | Placeholder „Sesja 12 — Zjazd w Ubersreiku”. W WT już usunięty. | 🟠 (HEAD) |
| T5 | `src/components/character-sheet/random.ts:5-81, 178-200` `[WT]` | Generator NPC: rasy `Krasnolud/Elf/Niziołek/Półelf/Półork`, **nazwy talentów WFRP PL** (`Silny cios`, `Twardziel`, `Szybki refleks`, `Odporny`, `Biegły w broni`), waluta zk/s/p, wzory `S = K/10`, `Wt = Odp/10`, `PP = k3-1`. Imiona „imperialno-germańskie” (`Sigmund`, `Ruprecht`…) są ogólne, ale wzmacniają skojarzenie. | 🟠 |
| T6 | `src/lib/cardMigration.test.ts:10, 29, 32, 57, 69-123` `[WT, untracked]` | Fixture: „Hilda Brandt”, profesje Strażniczka/Chłopka, miejsce urodzenia **„Altdorf”**, znak gwiezdny „Wóz”, waluta zk/s/p | 🟠 |
| T7 | `src/lib/lootDb.ts:38-46` | Waluta `"sz"` (szylingi). „Elficki sztylet / runiczny wzór” to ogólne fantasy. | 🟡 |
| T8 | `src/pages/LootGeneratorPage.tsx:355` | Nazwy monet „Szylingi / Pensy” | 🟡 |
| T9 | `src/pages/ShopPage.tsx:891` | Placeholder „Zbrojownia w **Westfall**” (Warcraft) | 🟡 |
| T10 | `public/assets/images/background.png` (użyty w `src/pages/AuthPage.tsx:17`) | Okładki **Player's Handbook / Dungeon Master's Guide / Monster Manual** (WotC). Grafika wygląda na wygenerowaną przez AI, ale z cudzymi znakami towarowymi. | 🔴 |
| T10b | `src/components/character-sheet/CharacterSheet.tsx:183`, `src/index.css:499` (klasa `.sheet-kosmit`) `[WT]` | Stopka **„KOSMIT 2013 · www.kosmitpaczy.pl”** i komentarz „Układ stron jak na karcie PDF (KOSMIT)”: układ karty skopiowany z fanowskiego PDF-a karty WFRP2, czyli cudzy utwór. *Na `chore/ip-cleanup-p0` już usunięte, na `feat/campaigns` jeszcze nie.* (znalezione po audycie) | 🟠 |
| T11 | `index.html:19` | `og:image` hostowany na `storage.googleapis.com/gpt-engineer-…` z podpisem, który wygasa. To nie IP, ale do wymiany przed SaaS: nie wiadomo, co jest na obrazie, a link przestanie działać. | 🟡 |

### 3.2 Schematy i typy

| # | Plik | Co jest zaszyte | Ryzyko |
|---|---|---|---|
| S1 | `src/components/character-sheet/types.ts` (całość) | `StatRow {ww, us, k, odp, zr, int, sw, ogd}`, `StatRow2 {a, zyw, s, wt, sz, mag, po, pp}` (dokładny profil WFRP 2), `p/s/a` = Początkowa/**Schemat rozwoju**/Aktualna, `obecnaProfesja/poprzedniaProfesja`, `znakGwiezdny`, `ruch/szarza/bieg`, 6 lokacji pancerza, `pancerzProsty/pancerzZlozony`, `umiejetnosciPodstawowe/Zaawansowane` z `wykupione/plus10/plus20`, `pieniadze {zk, s, p}` | 🟠 |
| S2 | `src/lib/gameStatGlossary.ts` (całość) | Słownik cech z tłumaczeniami **„Krzepa”**, **„Ogłada”**, WW/US/Odp/SW, a także `SB` i „Wyt. w.” (soak) | 🟠 |
| S3 | `src/context/AppContext.tsx:30-39` | `interface Combatant { ww, us, sb, toughness, … }`: silnik walki zakłada profil WFRP | 🟠 |
| S4 | `src/lib/gmEnemy.ts:1-80` | `GmEnemy` z pełnym profilem WFRP (`ww, us, sb, k, odp, zr, int, sw, ogd, mag, sz, s, wt, a, po, pp`) i domyślnymi wartościami (`ww 30`, `toughness 3`) | 🟠 |
| S5 | `src/data/character.ts` | `CharacterData { career, fatePoints, … }` oraz domyślne cechy `ww/us/s/wt/zr/int/sw/ogd` | 🟠 |
| S6 | `src/lib/cardMigration.ts:16, 35-60, 103-104, 116, 136, 197-211, 225-231, 312` | `buildLegacyWfrpSchema()` generuje strukturę z etykietami „Schemat rozwoju”, „Znak gwiezdny”, „Złote korony / Srebrne szylingi / Miedziane pensy”, „Umiejętności podstawowe/zaawansowane”, „Opancerzenie proste/złożone”, „Cechy oręża”. **Ta struktura trafia do danych użytkownika.** | 🟠 |
| S7 | `src/lib/combatSessions.ts:58`, `src/lib/combatRoster.ts`, `src/lib/cardRoster.ts`, `src/lib/rpgStorageMigration.ts`, `src/components/character-sheet/migrateLegacyStorage.ts:51-52`, `factory.ts:33, 71`, `npcAccessors.ts` | Serializacja i migracja pól `ww/us/sb/toughness`, `obecnaProfesja`, `zk` | 🟡 (kod przejściowy) |
| S8 | `src/components/relations-map/types.ts`, `context/RelationsMapContext.tsx` | Zależność od `SavedNpc` (legacy) | 🟡 |
| S9 | klucze `localStorage`: `rpg_saved_npcs`, `rpg_characters` (struktura WFRP) | Dane użytkowników w starym formacie; wymagają migracji, nie usuwania | 🟡 |

### 3.3 Logika biznesowa

| # | Plik | Mechanika rozpoznawalna jako WFRP | Ryzyko |
|---|---|---|---|
| L1 | `src/pages/CombatPage.tsx:66-73, 141-148` | **Lokacja trafienia z odwróconego k100** (01-15 głowa, 16-35 PR, 36-55 LR, 56-80 korpus, 81-90 PN, 91-00 LN). To sygnaturowa tabela WFRP. Obrażenia: `k10 + SB + broń − Wt − pancerz`. | 🟠 |
| L2 | `src/pages/CombatPage.tsx:119, 255, 286, 311, 362-410, 641-650` | `derivedSB = S/10`, „SL” (Success Levels, termin z WFRP 4e), szybkie statusy, formularz WW/US/SB/Wt | 🟠 |
| L3 | `src/lib/dice.ts:56-64` | `DIFFICULTY_PRESETS`: **Very Easy +30 / Easy +20 / Routine +10 / Average 0 / Challenging −10 / Hard −20 / Very Hard −30**, czyli dokładna drabina WFRP 2e (EN i PL: „Rutynowy”, „Wymagający”) | 🟠 |
| L4 | `src/pages/TestsPage.tsx:82-86` | „Stopnie sukcesu/porażki = margines/10” | 🟡 |
| L5 | `src/pages/SimulationsPage.tsx:37-119` | Krytyki `≤05 / ≥96`, test przeciwstawny po SL, symulacja walki `WW vs Wt+Pnc` | 🟡 |
| L6 | `src/components/combat/CombatantCard.tsx`, `CombatantFormFields.tsx`, `ReadyOpponentsPanel.tsx`, `CombatMonstersPanel.tsx`, `CombatEnemyPill.tsx`, `CombatRosterPill.tsx`, `CombatSidePanel.tsx`, `CombatPresetsPanel.tsx` | Formularze i widoki oparte na `ww/us/sb/toughness` | 🟠 |
| L7 | `src/components/character-sheet/sub/StatTable.tsx`, `BodyArmor.tsx`, `SkillsTable.tsx` | Renderowanie siatki cech 8+8 × 3 kolumny, sylwetki z 6 lokacjami, skilli z kolumnami W/+10/+20, czyli **trade dress karty WFRP 2 PL** | 🟠 |
| L8 | `src/context/AmbientContext.tsx` | Trafienia na skróty pól, prawdopodobnie fałszywe dopasowania. Do weryfikacji przy refaktorze. | ⚪ |

### 3.4 UI i teksty

| # | Plik:linia | Tekst | Ryzyko |
|---|---|---|---|
| U1 | `src/pages/CharacterPage.tsx:97, 103, 135-139` | „Punkty Przeznaczenia”, „Profesja” | 🟠 |
| U2 | `src/components/character-sheet/CharacterSheet.tsx:44-51, 214-216` | „Poprzednia/Obecna profesja”, „Złote korony (zk) / Srebrne szylingi (s) / **Mosiężne pensy** (p)” | 🟠 |
| U3 | `src/pages/Index.tsx:105` | `race · career` | 🟡 |
| U4 | `src/components/character-sheet/NpcQuickPreview.tsx:8-11`, `global-drawer/views/NpcDrawerView.tsx:76`, `pages/NpcManagerPage.tsx:86-87`, `relations-map/panels/DetailPanel.tsx:127`, `relations-map/hooks/useRelationsMapState.ts:30, 33, 156`, `command-palette/searchUtils.ts:34-35`, `combat/CombatRosterPanel.tsx:69, 112` | Bezpośredni odczyt `daneOgolne.obecnaProfesja` i etykieta „Profesja” | 🟡 |
| U5 | `src/pages/SessionNotesPage.tsx:82` | Szablon „Profesja / rola” | ⚪ |
| U6 | `src/components/card/TableField.tsx:6` | Komentarz „…the WFRP sheet…” | ⚪ |
| U7 | `src/pages/ConditionsPage.tsx:8-20` | Ogłuszony, Krwawienie, Powalony… To ogólne stany fantasy; zostawić, ale przenieść do konfiguracji kampanii. | ⚪ |
| U8 | `src/components/combat/CombatPresetsPanel.tsx:46` | „Gobliny w tawernie”: goblin to termin z folkloru, OK | ⚪ |
| U9 | `CONTEXT.md:40`, `raport-projektu-dla-konsultanta.md:7, 104` | Wzmianki „WFRP”, „Warhammer”, „Aldric Grimwald / Ubersreik” | ⚪ (repo jest publiczne) |
| U10 | Nazwa produktu „Magnus Helper” (`index.html`, `Logo.tsx`, `AuthPage.tsx`, `package.json`) | Skojarzenia opisane w sekcji 4.3 | 🟡 (decyzja biznesowa) |

---

## 4. Mapowanie terminów

### 4.1 Terminy obecne w kodzie → neutralne odpowiedniki

Zasada wynikająca z `CONTEXT.md` i ADR 0002: **Magnus nie dostarcza profilu żadnego systemu**. Neutralny szablon startowy powinien więc być minimalny, a poniższe odpowiedniki służą do (a) neutralnego szablonu startowego, (b) etykiet w migracji legacy, (c) tekstów UI.

| Obecnie (WFRP 2e PL) | Skrót | Neutralny odpowiednik (PL / EN) | Uwagi |
|---|---|---|---|
| Walka wręcz | WW | Walka / *Melee* | |
| Umiejętności strzeleckie | US | Strzelanie / *Ranged* | |
| **Krzepa** | K | Siła / *Might* | „Krzepa” to charakterystyczne tłumaczenie WFRP PL |
| Odporność | Odp | Kondycja / *Endurance* | |
| Zręczność | Zr | Zręczność / *Agility* | ogólne |
| Inteligencja | Int | Intelekt / *Intellect* | ogólne |
| Siła woli | SW | Wola / *Resolve* | |
| **Ogłada** | Ogd | Prezencja / *Presence* | charakterystyczne tłumaczenie WFRP PL |
| Ataki | A | Akcje / *Actions* | |
| Żywotność | Żyw | Zdrowie / *Health* (rola `mainResource`) | |
| Siła (bonus) / Wytrzymałość (bonus) | S / Wt | **usunąć** (pochodne `K/10`, `Odp/10` to mechanika WFRP) | GM może dodać własne pola pochodne |
| Szybkość | Sz | Ruch / *Speed* | |
| Magia | Mag | Moc / *Power* | |
| **Punkty Obłędu** (obecnie zamaskowane jako „PO = Punkty obrażeń”) | PO | **usunąć** z szablonu; ewentualnie „Stres” / *Stress* | maskowanie skrótu nie zmienia układu karty |
| **Punkty Przeznaczenia** | PP | Punkty Losu / *Luck Points* (alternatywnie „Punkty Bohatera” / *Hero Points*) | `fatePoints` → `luckPoints` |
| Wypaczenie / Spaczenie / Chaos *(tylko w historii)* | — | Skaza / *Taint* (koncept ogólny, opcjonalne pole) | nie dodawać do szablonu domyślnie |
| Obłęd / Insanity *(tylko w historii)* | — | Stres / *Stress* | jw. |
| Profesja (obecna / poprzednia), ścieżka kariery | — | Zajęcie / *Occupation*; „Profesja” jako słowo ogólne jest OK, ale para *obecna/poprzednia* to wzorzec karier WFRP | zostawić jedno pole „Zajęcie / rola” |
| **Schemat rozwoju** (kolumna `s`) | — | **usunąć**; kolumny: Bazowa / Aktualna | sygnaturowy element karty WFRP 2 |
| Umiejętności podstawowe / zaawansowane, W / +10 / +20 | — | Jedna lista „Umiejętności” z kolumną „Poziom” (liczba) | |
| Zdolności (talenty) | — | Atuty / *Traits* | |
| Znak gwiezdny | — | **usunąć** z szablonu (GM doda „Pochodzenie”) | znaki gwiezdne Starego Świata |
| Ruch / Szarża / Bieg | — | Ruch / *Speed* (jedno pole) | |
| Punkty zbroi × 6 lokacji, opancerzenie proste / złożone | PZ | Ochrona / *Armor* (jedno pole liczbowe) | lokacje tylko jako opcja kampanii |
| Złote korony / srebrne szylingi / **mosiężne/miedziane pensy** | zk / s / p | Złoto / Srebro / Miedź (*gp / sp / cp*), albo jedno pole „Majątek” | trójka *korona / szyling / pens* to waluta Imperium |
| Siła bojowa | SB | Bonus obrażeń / *Damage bonus* | |
| Wyt. w. (soak) | — | Redukcja obrażeń / *Damage reduction* | |
| Stopnie sukcesu / **SL** | SL | Margines / *Margin* (liczba) | „Success Levels” to termin WFRP 4e |
| Rutynowy / Wymagający (drabina ±30) | — | Drabina konfigurowana przez kampanię; domyślnie: Łatwy +20 / Normalny 0 / Trudny −20 | |
| Lokacja trafienia z odwróconego k100 | — | Opcjonalna tabela lokacji zdefiniowana przez GM (bez wartości domyślnych WFRP) | |
| Krytyk 01–05 / 96–00 | — | Próg krytyka konfigurowany przez kampanię (domyślnie wyłączony) | |
| Rasy: Krasnolud / Elf / Niziołek / Półork | — | Generator: lista ras pochodzi z kampanii (domyślnie pusta lub „Człowiek”). „Krasnolud” i „Niziołek” to ogólne słowa w PL, ale w zestawie z resztą wzmacniają skojarzenie. | |
| Talenty: Silny cios, Twardziel, Szybki refleks, Odporny, Biegły w broni | — | Generator: atuty z Kodeksu kampanii (domyślnie brak) | |
| Altdorf, Ubersreik, Westfall | — | Np. „Kamienny Bród”, „Szarogród”, „Zbrojownia pod Kowadłem” | |

### 4.2 Lista kontrolna terminów zakazanych (do CI / lintera)

Pełna lista do wykorzystania w teście „IP guard” (zadanie P1-7). Grupy:

- **Marki i znaki GW:** Warhammer, WFRP, WHFRP, Games Workshop, GW, Citadel, Age of Sigmar, Old World, Black Library, White Dwarf, Mordheim, Blood Bowl, Necromunda, Space Marine, Thousand Sons, Chaos Space Marines, Forge World; także licencjobiorcy: Cubicle 7, Copernicus Corporation, Fantasy Flight, Hogshead.
- **Bogowie i kulty:** Sigmar, Ulryk/Ulric, Morr, Shallya, Verena, Ranald, Taal, Rhya, Manann, Myrmidia, Handrich, Khaine, Grungni, Valaya, Khorne, Nurgle, Tzeentch, Slaanesh, Mroczni Bogowie, Rogaty Szczur.
- **Geografia:** Imperium (w kontekście nazwy własnej), Stary Świat, Reikland, Altdorf, Middenheim, Nuln, Talabheim, Marienburg, Ubersreik, Averland, Stirland, Ostland, Ostermark, Hochland, Middenland, Nordland, Wissenland, Talabecland, Sylvania, Kraina Zgromadzenia/Moot, Kislev, Bretonia, Tilea, Estalia, Araby, Norska, Drakwald, Pustkowia Chaosu.
- **Rasy i frakcje specyficzne:** Skaven, zielonoskórzy (jako nazwa frakcji), Zwierzoludzie, Ogry z Gór Żałosnych, Wampirzy hrabiowie, Ludzie Jaszczury, Wysokie elfy z Ulthuanu, Mroczne elfy, krasnoludy z Karaz-a-Karak, Zabójcy (Slayers).
- **Mechanika i terminologia WFRP:** Punkty Przeznaczenia, Punkty Szczęścia (*Fortune*), Punkty Bohatera (*Resilience/Resolve*), Punkty Obłędu, Spaczenie/Wypaczenie, Spaczeń (*Warpstone*), Schemat rozwoju, Ścieżka kariery, Profesja wyjściowa, Krzepa, Ogłada, Stopnie Sukcesu (SL), Wiatry Magii (Aqshy, Ghur, Ghyran, Hysh, Chamon, Ulgu, Shyish, Azyr, Dhar, Qhaysh), Kolegia Magii, Magister, Splatanie magii, Łowca czarownic, Szczurołap, Zabójca trolli.
- **Waluta:** złota korona, srebrny szyling, mosiężny pens (w zestawie).

### 4.3 Nazwy kojarzące się z Warhammerem (weryfikacja w sieci)

| Nazwa | Skojarzenie | Rekomendacja |
|---|---|---|
| **Magnus** (nazwa produktu) | *Magnus Pobożny*: cesarz Imperium, bohater Wielkiej Wojny z Chaosem (lore WFRP). *Magnus Czerwony*: prymarcha legionu Thousand Sons (WH40k; „Thousand Sons” na liście znaków GW). | Samo słowo jest łacińskie i ogólne, więc ryzyko znakowe jest niskie. Przy produkcie dla graczy RPG skojarzenie jest jednak silne. **Decyzja biznesowa:** zrobić kontrolę znaków (EUIPO/USPTO, klasy 9, 41, 42) i rozważyć zmianę nazwy przed inwestycją w markę. |
| Sigmund, Ruprecht, Albrecht, Kunigunde… (`random.ts`) | Germańska onomastyka Imperium | Same w sobie OK. Dla neutralności lepiej, żeby imiona pochodziły z listy kampanii lub z mieszanych, wielokulturowych zestawów. |
| Hilda Brandt + Altdorf (fixture testu) | Altdorf to stolica Imperium | Zmienić. |
| Aldric Grimwald, Ubersreik *(historia / gh-pages)* | Ubersreik to miasto z kampanii startowej WFRP 4e | Usunąć z wdrożenia i historii. |
| „Złoty / srebrny / mosiężny” + korona / szyling / pens | Waluta Imperium | Patrz 4.1. |
| Westfall | Warcraft (Blizzard) | Zmienić. |
| Player's Handbook, Dungeon Master's Guide, Monster Manual (grafika) | Znaki Wizards of the Coast; „Dungeon Master” to zarejestrowany znak | Wymienić grafikę. |

---

## 5. Architektura: miejsca zaszycia i wzorzec system-agnostic

### 5.1 Gdzie uniwersum jest zaszyte

```
                         ┌─────────────────────────────┐
                         │  CampaignSchema (cardSchema)│  ← NEUTRALNE (gotowe)
                         │  sections/fields/roles      │
                         └──────────────┬──────────────┘
                                        │ czyta przez RoleBindings
     ┌──────────────────┬───────────────┼─────────────────┬──────────────────┐
     ▼                  ▼               ▼                 ▼                  ▼
 HeroesPage       HeroDrawerView   CombatRosterPanel  searchUtils       RelationsMap
 (nowy model)     (nowy model)     (mieszany)         (mieszany)        (mieszany)

 ─── LEGACY, zaszyty WFRP ──────────────────────────────────────────────────────
 character-sheet/types.ts ─► CharacterSheet, StatTable, BodyArmor, SkillsTable
 gameStatGlossary.ts ─────► constants.ts, data/character.ts, CombatPage
 AppContext.Combatant{ww,us,sb,toughness} ─► combat/*, combatSessions, gmEnemy
 dice.ts DIFFICULTY_PRESETS ─► TestsPage, CombatPage
 CombatPage.getHitLocation / damage formula / SL
 SimulationsPage (crit 05/96, SL, WW vs Wt)
 random.ts (rasy, talenty, waluta, wzory WFRP)
 cardMigration.buildLegacyWfrpSchema ─► dane użytkownika
```

Uwagi:
- **Nie ma warstwy bazodanowej** (Prisma/TypeORM/Drizzle). „Schemat” to typy TS plus JSON w `localStorage` z namespace kampanii (`lib/storage.ts`, `lib/campaignStorage.ts`).
- `Combatant` w `AppContext` jest **najgłębszym** zaszyciem: tracker walki, presety, sesje walki i pigułki rosteru znają `ww/us/sb/toughness`. Według ADR 0005 i `CONTEXT.md` tracker powinien znać tylko inicjatywę, zasób główny, zasoby dodatkowe, statusy i notatkę.

### 5.2 Docelowy wzorzec: silnik + pakiet zasad kampanii (data-driven)

Projekt ma już właściwy fundament (`CampaignSchema` + `RoleBindings`, ADR 0002–0005). Wzorzec do dokończenia:

```
┌────────────────────── ENGINE (kod Magnusa, zero treści) ──────────────────────┐
│ CardRenderer      — renderuje dowolny SectionDef/FieldDef                      │
│ RoleResolver      — readCardCombatStats(): initiative, mainResource,          │
│                     combatResources[], testable[]                              │
│ DiceEngine        — notacja kości, rzut, historia (bez progów i drabin)        │
│ TestEngine        — test „pod wartość / nad wartość / pula” wg TestProfile     │
│ CombatTracker     — kolejność, tury, rundy, statusy, notatki, zasób główny     │
│ Notes/Quests/Scenes/Relations — czysto narracyjne, bez mechaniki               │
└───────────────────────────────▲───────────────────────────────────────────────┘
                                │ czyta wyłącznie
┌───────────────────────────────┴───────────────────────────────────────────────┐
│ CAMPAIGN RULES (dane per kampania, edytowalne, importowalne)                   │
│  cards:      hero / npc / monster  → CardTypeDef (już istnieje)                │
│  roles:      RoleBindings (już istnieje)                                       │
│  tests:      TestProfile  { mode, difficultyLadder[], margin, critical? }      │
│  combat:     CombatProfile? { hitLocations?: RangeTable, damageFormula? }      │
│  conditions: string[]                                                          │
│  currency:   { id, name, ratio }[]                                             │
│  reference:  Kodeks entries (umiejętności/zdolności)                           │
│  generators: { names[], traits[], occupations[], ancestries[] }                │
└────────────────────────────────────────────────────────────────────────────────┘
```

Zasady:
1. **Engine nigdy nie zawiera nazw cech, skrótów, walut, drabin ani tabel.** Wszystko, co dziś siedzi w `dice.ts`, `gameStatGlossary.ts`, `getHitLocation`, `random.ts` i `ConditionsPage`, przechodzi do `CampaignRules` z neutralnymi lub pustymi wartościami domyślnymi.
2. **Brak wnioskowania z nazw** (ADR 0003). Narzędzia czytają pola tylko przez role.
3. **`Combatant` staje się generyczny:**
   ```ts
   type Combatant = {
     id: string; name: string; cardRef?: { kind: CardKind; id: string };
     initiative: number;                       // z roli, ręcznie nadpisywalne
     resource?: { current: number; max: number };
     extras: { label: string; value: number }[]; // z roli combatResources
     statuses: string[]; notes: string; isEnemy: boolean;
   };
   ```
   `ww/us/sb/toughness` wychodzą z typu. Kalkulator obrażeń (`CombatPage` → „akcja”) staje się opcjonalnym modułem `CombatProfile`, domyślnie wyłączonym. Bez profilu GM wpisuje obrażenia ręcznie.
4. **`TestProfile` zamiast `DIFFICULTY_PRESETS`:**
   ```ts
   type TestProfile = {
     mode: "rollUnder" | "rollOver" | "pool";
     die: string;                     // "1d100", "1d20", "5d6"…
     difficultyLadder: { label: string; modifier: number }[];
     margin?: { divisor: number; label: string };   // np. 10, "Margines"
     critical?: { successAtOrBelow?: number; failureAtOrAbove?: number };
   };
   ```
5. **Legacy jako dane, nie kod.** `buildLegacyWfrpSchema` → `buildLegacyMigrationSchema` z neutralnymi etykietami (sekcja 4.1). Identyfikatory pól (`ww`, `odp`…) zostają tylko wewnątrz mapera migracji, żeby odczytać stare dane, i nie przechodzą do nowej struktury (mapowanie `ww → stat_melee` itd.).
6. **Seed = neutralny szablon startowy albo pusty.** Wszelkie „pakiety pod konkretne systemy” powstają tylko jako import użytkownika (sekcja 6), nigdy jako treść dostarczana przez platformę.

---

## 6. Format danych zewnętrznych (import reguł przez użytkownika)

### 6.1 Format: `*.magnus-rules.json` (JSON, walidowany Zod/JSON Schema)

JSON zamiast YAML: zgadza się z `localStorage` i obecnym eksportem/importem, a Zod jest już w zależnościach (`zod ^3.25`), więc walidacja nie wymaga nowej biblioteki. Opcjonalnie później dojdzie YAML jako format wejściowy konwertowany do tego samego modelu.

```jsonc
{
  "$schema": "https://<domena>/schemas/campaign-rules/v1.json",
  "format": "magnus.campaign-rules",
  "version": 1,
  "meta": {
    "name": "Mój system domowy",
    "author": "string",
    "description": "string",
    "license": "CC-BY-4.0 | private | other",   // deklaracja użytkownika
    "rightsAttestation": true                    // wymagane: „mam prawa do tej treści”
  },
  "cards": {
    "hero":    { "sections": [/* SectionDef */], "roles": {/* RoleBindings */},
                 "titleFieldId": "name", "subtitleFieldIds": ["occupation"] },
    "npc":     { "...": "..." },
    "monster": { "...": "..." }
  },
  "tests": {
    "mode": "rollUnder", "die": "1d100",
    "difficultyLadder": [ { "label": "Łatwy", "modifier": 20 },
                          { "label": "Normalny", "modifier": 0 },
                          { "label": "Trudny", "modifier": -20 } ],
    "margin": { "divisor": 10, "label": "Margines" }
  },
  "combat": {
    "hitLocations": null,            // albo [{ "from": 1, "to": 20, "label": "..." }]
    "damage": null                   // w MVP brak formuł (ADR 0002: bez skryptów)
  },
  "conditions": ["Ogłuszony", "Krwawienie"],
  "currency": [ { "id": "gold", "name": "Złoto", "ratio": 100 },
                { "id": "silver", "name": "Srebro", "ratio": 10 },
                { "id": "copper", "name": "Miedź", "ratio": 1 } ],
  "reference": {
    "skills": [ { "id": "s1", "name": "…", "test": "…", "description": "…" } ],
    "traits": [ { "id": "t1", "name": "…", "description": "…" } ]
  },
  "generators": { "names": [], "traits": [], "occupations": [], "ancestries": [] }
}
```

Reguły walidacji:
- **Brak kodu wykonywalnego.** Formuły tylko jako zamknięta lista operatorów, jeśli w ogóle (ADR 0002 wyklucza skrypty w MVP).
- Limity rozmiaru (np. 1 MB, ≤ 500 wpisów referencyjnych, ≤ 4000 znaków na opis), żeby zniechęcić do wklejania całych podręczników.
- Każda referencja `roles.*` musi wskazywać istniejące pole (`validateRoles` w `cardSchema.ts` już to robi).
- Import tworzy **nową kampanię albo jej kopię**, nigdy nie nadpisuje po cichu (zgodnie z ostrzeżeniami o utracie danych z `CONTEXT.md`).

### 6.2 Zabezpieczenia prawne platformy (procesowe)

| Mechanizm | Cel |
|---|---|
| Treść importowana jest **prywatna dla kampanii** (izolacja wg ADR 0001), bez publicznego katalogu i marketplace (ADR 0002) | Platforma jest hostem treści użytkownika, nie jej wydawcą |
| Checkbox `rightsAttestation` i zapis w Regulaminie: użytkownik gwarantuje prawa do importowanych treści | Przeniesienie odpowiedzialności |
| Procedura **notice-and-takedown** (DSA art. 16 / DMCA) i kontakt do zgłoszeń | Ochrona hosta (safe harbour) |
| Zakaz w Regulaminie: upload tekstów podręczników komercyjnych i znaków towarowych osób trzecich | Podstawa do usuwania treści |
| Brak oficjalnych „pakietów” i nazw systemów w UI, SEO, marketingu i domenach (np. żadnego „kompatybilny z Warhammer”) | Unikanie naruszenia znaku i *passing off* |
| Jeśli kiedyś powstanie udostępnianie między użytkownikami: moderacja, raportowanie, filtr listy terminów z 4.2 | Ograniczenie ryzyka |

---

## 7. Plan zadań (task list z priorytetami)

> **P0** blokuje komercjalizację lub to publiczna ekspozycja teraz · **P1** silnik · **P2** legacy i dane · **P3** kosmetyka.
> Kolejność wewnątrz priorytetu odpowiada kolejności realizacji.

### P0: natychmiast (ekspozycja publiczna)

- [~] **P0-1. Usunąć treści WFRP z `main`.** Zrobione lokalnie na gałęzi `chore/ip-cleanup-p0` (commit `e5cb367`, od `main`): usunięte `zdolnosci.ts` i `cheatsheets.ts`, neutralny Kodeks, usunięte Ubersreik/Grimwald/KOSMIT, „Punkty Losu”, klasy `wfrp-*` → `sheet-*`. tsc/lint bez nowych błędów, testy i build OK. **Pozostaje:** push gałęzi i merge (merge robi wyłącznie właściciel repo). Przy merge'u `feat/campaigns` konflikty w tych plikach rozwiązywać na korzyść `feat/campaigns`, a potem usunąć tam stopkę KOSMIT (T10b).
- [ ] **P0-2. Przebudować i wdrożyć `gh-pages`** z wyczyszczonego `main` albo wyłączyć GitHub Pages do czasu wydania SaaS. Bundle `8e5b8da` zawiera „Ubersreik”, „Grimwald”, „Ogłada”, „Punkty Przeznaczenia”.
- [ ] **P0-3. Ustawić repozytorium jako prywatne** (najprostsze i odwracalne) **lub** przepisać historię (`git filter-repo` dla `src/data/zdolnosci.ts`, `src/data/cheatsheets.ts`, `raport-projektu-dla-konsultanta.md` i commitów z seedami). ⚠️ Przepisanie historii jest nieodwracalne i wymaga force-push oraz koordynacji z każdym, kto ma klon. Rekomendacja: najpierw repo prywatne, a decyzję o filter-repo podjąć z prawnikiem. Forki i cache mogą zachować kopie.
- [ ] **P0-4. Wymienić `public/assets/images/background.png`** na grafikę bez znaków towarowych (bez tytułów książek, logotypów, rozpoznawalnych figurek). Przy okazji wymienić `og:image` w `index.html:19` na własny, trwale hostowany plik.
- [ ] **P0-5. Usunąć lub przepisać `raport-projektu-dla-konsultanta.md`** (WFRP, Aldric Grimwald, Ubersreik) i zneutralizować `CONTEXT.md:40` („struktury WFRP-podobnej” → „legacy struktury karty”).

### P1: silnik system-agnostic

- [ ] **P1-1. `TestProfile` w kampanii.** Przenieść `DIFFICULTY_PRESETS` (`lib/dice.ts:56-64`) do danych kampanii z neutralną drabiną domyślną. Usunąć etykiety EN „Routine/Challenging”. `TestsPage` i `CombatPage`: „Stopnie sukcesu”/„SL” → konfigurowalny „Margines”.
- [ ] **P1-2. Generyczny `Combatant`** (`AppContext.tsx:30-39`) według 5.2 pkt 3. Refaktor `combat/*`, `combatSessions.ts`, `combatRoster.ts`, `cardRoster.ts`, `combatDrag.ts` i migracja zapisanych walk (`ww/us/sb/toughness` → `extras[]`).
- [ ] **P1-3. Kalkulator ataku w `CombatPage`:** usunąć `getHitLocation` (WFRP), wzór `k10+SB+broń−Wt−pancerz`, `derivedSB`. Zostaje: rzut testu przez `TestProfile` i ręczne „zadaj X obrażeń” na `mainResource`. Lokacje trafień opcjonalnie jako tabela GM (`combat.hitLocations`, domyślnie `null`).
- [ ] **P1-4. `GmEnemy` → karta typu `monster`** (`lib/gmEnemy.ts`). Profil WFRP zastąpić strukturą kampanii i migracją istniejących wrogów.
- [ ] **P1-5. `SimulationsPage`:** progi krytyków i porównanie SL z `TestProfile`. Symulację walki oprzeć na rolach (`testable`, `mainResource`) albo ukryć, gdy kampania nie ma `CombatProfile`.
- [ ] **P1-6. Usunąć `lib/gameStatGlossary.ts`.** Tooltipy cech mają pochodzić z nazw pól w strukturze kampanii (`FieldDef.name` / `FixedRow.label`). Zaktualizować `constants.ts`, `data/character.ts`, `CombatStatCell`.
- [ ] **P1-7. Test „IP guard” w Vitest:** skan `src/`, `public/`, `index.html` i `docs/` pod kątem listy z 4.2 (z białą listą dla `cardMigration` legacy-maperów), uruchamiany w CI. Zapobiega regresji.

### P2: legacy karta, generatory, dane

- [ ] **P2-1. Dokończyć przejście UI na `CampaignSchema` + `CardRenderer`.** Usunąć `components/character-sheet/{CharacterSheet,types,constants,factory,sub/StatTable,sub/BodyArmor,sub/SkillsTable}.tsx`. Konsumentów z listy 3.4/U4 przepiąć z `daneOgolne.obecnaProfesja` na `titleFieldId`/`subtitleFieldIds`.
- [ ] **P2-2. `cardMigration.ts`:** zmienić nazwę `buildLegacyWfrpSchema` → `buildLegacyMigrationSchema`, zastosować neutralne etykiety z 4.1 (bez „Schemat rozwoju”, „Znak gwiezdny”, korony/szylingi/pensy; kolumny „Bazowa/Aktualna”), dopisać mapowanie ID `ww → melee` itd. Komentarze bez „WFRP”. **Uwaga:** kampanie już zmigrowane mają zapisane stare etykiety, więc trzeba dodać jednorazowy `upgradeCardSchema` (v2 → v3), który podmienia **tylko** etykiety pozostawione bez zmian przez GM (porównanie z oryginałem).
- [ ] **P2-3. `data/character.ts` i `CharacterPage.tsx`:** `fatePoints` → `luckPoints` z etykietą „Punkty Losu”, `career` → `occupation` z etykietą „Zajęcie”. Migracja klucza w storage. Docelowo strona przechodzi na `CardRenderer`.
- [ ] **P2-4. Generator NPC (`random.ts`):** rasy, talenty, imiona, zajęcia i cechy charakteru mają pochodzić z `generators` w kampanii. Usunąć wzory `K/10`, `Odp/10`, `PP`, walutę zk/s/p.
- [ ] **P2-5. Waluta:** `lootDb.ts` (`"sz"`), `LootGeneratorPage.tsx:355`, `shopTypes.ts`, `shopGenerator.ts` przenieść do `currency[]` kampanii z domyślnym Złoto/Srebro/Miedź.
- [ ] **P2-6. Fixtures testów (`cardMigration.test.ts`):** Altdorf → „Kamienny Bród”, znak gwiezdny → usunąć, zk/s/p → neutralna waluta, nazwy `describe` bez „Wfrp”.
- [ ] **P2-7. Import/eksport `*.magnus-rules.json`** (sekcja 6): schemat Zod, walidacja, UI w `settings/DataManager.tsx`, zapis `rightsAttestation`.
- [ ] **P2-8. `ConditionsPage` i szybkie statusy w `CombatPage:311`:** lista z `conditions[]` kampanii, a obecna lista jako neutralny szablon startowy.

### P3: kosmetyka, marka, dokumentacja

- [ ] **P3-1.** `ShopPage.tsx:891` „Westfall” → neutralna nazwa. Przejrzeć pozostałe placeholdery.
- [ ] **P3-2.** `TableField.tsx:6` i inne komentarze z „WFRP” → „legacy sheet”.
- [ ] **P3-3.** Dodać ADR 0006 „Polityka IP i treści użytkownika” (lista z 4.2, format z 6, zasady procesowe z 6.2).
- [ ] **P3-4. Marka „Magnus”:** kontrola znaków (EUIPO/USPTO/UPRP, klasy 9/41/42) i decyzja o ewentualnym rebrandingu przed startem marketingu.
- [ ] **P3-5.** Regulamin i polityka treści (rights attestation, notice-and-takedown, zakaz wgrywania podręczników) przygotowane z prawnikiem.
- [ ] **P3-6.** Przegląd licencji zależności i assetów (tekstury i dźwięki `dice-box` są na MIT; potwierdzić pochodzenie `favicon` i dźwięków w `public/assets/dice-box/sounds`).

### Kolejność i zależności

```
P0-1 ─► P0-2 ─► P0-3          (niezależnie: P0-4, P0-5)
P1-1 ─► P1-5
P1-2 ─► P1-3 ─► P1-4
P1-6 wymaga P2-1 (konsumenci glosariusza)
P1-7 na końcu P1 (żeby nie blokować pracy fałszywymi alarmami)
P2-1 ─► P2-3, P2-4, P2-8
P2-2 niezależne; P2-7 po P1-1, P2-5, P2-8 (sekcje formatu muszą istnieć)
```

---

## 8. Kryteria akceptacji

1. `rg -i -f ip-denylist.txt src public index.html docs` zwraca 0 trafień poza białą listą maperów migracji (test P1-7 przechodzi w CI).
2. `git grep -i -E 'ubersreik|grimwald|sigmar|ulryk|kislev|krzepa|ogłada|punkty przeznaczenia'` na `main` i w bundle'u produkcyjnym zwraca 0 trafień.
3. Nowa kampania z szablonu neutralnego lub pustego nie zawiera żadnego terminu z 4.1 (kolumna „Obecnie”).
4. Tracker walki, testy i symulacje działają na kampanii bez żadnych pól o nazwach WW/US/SB/Wt (test integracyjny na pustej strukturze z ręcznymi rolami).
5. Istniejące kampanie po migracji zachowują wszystkie wartości (rozszerzenie `cardMigration.test.ts`).
6. Grafiki w `public/` nie zawierają znaków towarowych osób trzecich (przegląd ręczny).

---

## Źródła (weryfikacja w sieci)

- Lista zarejestrowanych znaków GW (kopia tabeli): https://creator.myminifactory.com/registered-trademarks-from-games-workshop
- Games Workshop (Wikipedia): https://en.wikipedia.org/wiki/Games_Workshop
- Zmiany wytycznych IP GW z 2021: https://spikeybits.com/2021/07/lookout-youtube-gw-just-updated-their-ip-guidelines.html
- Magnus Pobożny: https://whfb.lexicanum.com/wiki/Magnus
- Wielka Wojna z Chaosem: https://whfb.lexicanum.com/wiki/Great_War_Against_Chaos
- Bogowie Imperium: https://whfb.lexicanum.com/wiki/Gods_of_the_Empire
- Panteon Starego Świata: https://warhammerfantasy.fandom.com/wiki/Old_World_Pantheon
- WFRP 4e: kariery, umiejętności i talenty (recenzje): https://www.d20radio.com/main/?p=14957, https://www.d20radio.com/main/?p=15323
- WFRP 4e, podręcznik główny: https://whfb.lexicanum.com/wiki/WFRP_Rulebook_(4th_Edition)
- Polskie wydania WFRP (Copernicus, Altdorf / Reikland): https://polter.pl/WFRP-Altdorf-Crown-of-the-Empire-n53554
- Odwrócony k100 jako lokacja trafienia w WFRP: https://forums.giantitp.com/archive/index.php/t-589922.html

Uwaga do źródeł: wyszukiwarka nie zwróciła oficjalnej tabeli lokacji WFRP 2e ani polskiego glosariusza tłumaczeń. Przypisanie skrótów WW/US/K/Odp/Zr/Int/SW/Ogd, PO/PP, „Schemat rozwoju” i waluty zk/s/p do WFRP 2e PL opiera się na wiedzy audytora. Przed użyciem w opinii prawnej trzeba je potwierdzić z podręcznikiem.
