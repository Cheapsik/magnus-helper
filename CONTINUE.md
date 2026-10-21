# Gdzie skończyliśmy: przebudowa na system uniwersalny

Gałąź `feat/campaigns`, commity lokalne (bez pusha, bez merge'a; merge robi właściciel repo).
Decyzje projektowe: `CONTEXT.md` + `docs/adr/0006`–`0009`. Plan IP: `IP_CLEANUP_PLAN.md`.

Stan: `tsc` 0 błędów, testy 149/149 (w tym „IP guard”), `vite build` OK, ESLint 7 błędów `no-empty` (wszystkie zastane, w nieruszanych plikach: `mobileAudioUnlock.ts`, `sessionNotesMigration.ts`).

## Zrobione
1. **Model** (`src/lib/cardSchema.ts`, `campaignSystem.ts`, `systemTemplates.ts`, `cardStore.ts`, `dataReset.ts`, `diceNotation.ts`): konfigurowalna struktura kart, role pól, rodzaje testów i ataku, stany, waluta; neutralny szablon i pusta struktura; reset danych sprzed przebudowy (bez migracji).
2. **Edytor struktury kart** (Ustawienia → Karty), **kreator kampanii**, **karty** bohaterów/NPC/potworów z generatorem „Losuj”.
3. **Testy**: `testEngine.ts` + `TestsPage` + edytor (Ustawienia → Testy). Stare `difficultyPresets`/`testHistory` usunięte z `AppContext` i `dice.ts`; Skrzynka MG linkuje do ustawień testów.
4. **Walka**: generyczny `Combatant`, roster z kart, stany z kampanii oraz
   - `src/lib/combatEngine.ts` (+ testy): `resolveHit` (self / vsDefense / opposed z zasadą remisu / manual) i `resolveDamage` (kości z karty, wartość stała lub ręczna, `+ pole atakującego`, `+ margines`, redukcja z minimum 0/1, lokacje z kością albo odwróconym k100, redukcja per lokacja). `resolveTest` przyjmuje `difficultyValue` (obrona celu w miejsce stopnia trudności);
   - `CombatAttackPanel.tsx`: wybór rodzaju ataku i celu, rzut, ręczne „Trafienie/Pudło”, kości obrażeń z karty, „Zadaj X” odejmujące od zasobu głównego (sprawdzone w przeglądarce na uczestnikach bez kart);
   - `CombatSettingsEditor.tsx` (Ustawienia → Walka): rodzaje ataku, typy obrony, tabela lokacji; w edytorze kart (`RolesEditor`) przypisanie pól do obron i redukcji per lokacja.
5. **Listy kampanii**: stany, waluta, łup i sklep na walucie kampanii.
6. **Sprzątanie IP**: usunięte tło logowania z okładkami cudzych podręczników (gradient CSS), martwe style `.sheet-*`/`.armor-*`, `og:image`, `raport-projektu-dla-konsultanta.md`; test `src/test/ipGuard.test.ts` skanuje `src/`, `public/`, `docs/` i `index.html` pod kątem listy z `IP_CLEANUP_PLAN.md` §4.2.

7. **Nowe moduły (2026-10-22, analiza w `docs/konkurencja-funkcje.md`)**:
   - `/prep`: przygotowanie sesji (mocny początek, sceny, sekrety i tropy z ujawnianiem, `src/lib/secrets.ts`);
   - `/clocks`: zegary postępu, także jako zakładka „Zegary” w trackerze (`src/lib/clocks.ts`);
   - `/calendar`: kalendarz kampanii, data świata na pasku statusu (`src/lib/campaignCalendar.ts`);
   - `/tables`: tabele losowe z `[[tabela tabel]]` (`src/lib/randomTables.ts`);
   - `/factions`: frakcje i drabina reputacji (`src/lib/factions.ts`);
   - `/player-screen`: ekran graczy w drugim oknie, sterowany z zakładki „Ekran” w trackerze (`src/lib/playerScreen.ts`);
   - wzmianki na kartach (`src/lib/mentionIndex.ts`), własne pliki audio w Ambiencie (IndexedDB, `src/lib/audioStore.ts`), PWA (`vite-plugin-pwa`).

   - `/chronicle` kronika sesji (dziennik zdarzeń `src/lib/chronicle.ts`, do którego zapisują zegary, kalendarz, walka, sekrety, frakcje i podróże), `/maps` mapy z pinezkami (obrazy w IndexedDB), `/gm-screen` ekran MG z kafelków, `/travel` podróże, `/safety` granice, zasłony i pauza (karta X) na ekranie graczy.

## Do zrobienia
1. **Ścieżka karta → atak w UI**: silnik ma testy jednostkowe, ale panel z uczestnikami z kart (źródła z `testType.sources`, obrona z karty, kości broni z tabeli) nie był jeszcze przeklikany w przeglądarce.
2. **Import/eksport systemu kampanii** (`*.magnus-rules.json`, `IP_CLEANUP_PLAN.md` §6): schemat Zod, limity rozmiaru, `rightsAttestation`, UI w `settings/DataManager.tsx`. Bez tego nie da się przenieść własnego systemu między kampaniami ani go udostępnić.
3. **Marka**: kontrola znaku „Magnus” (EUIPO/USPTO/UPRP, klasy 9/41/42) i decyzja o ewentualnej zmianie nazwy.
4. **ADR o polityce IP i treści użytkownika**, regulamin, procedura zgłaszania naruszeń, przegląd licencji zależności i assetów (`favicon`, dźwięki `dice-box`). Do ustalenia z prawnikiem od IP.
5. **Ekspozycja publiczna** (P0-1…P0-3 w planie IP, po stronie właściciela): push i merge `chore/ip-cleanup-p0`, przebudowa albo wyłączenie `gh-pages`, widoczność repo i historia gita.

6. **Po nowych modułach**:
   - `ShowToPlayersButton` (`src/components/player-screen/`) nie jest jeszcze podpięty w notatkach i kodeksie;
   - wzmianki nie przewijają do konkretnej notatki ani wpisu kodeksu (strony nie przyjmują id);
   - stara kategoria notatek „Tropy” nie jest połączona z nowymi sekretami;
   - ikony PWA są powiększone z favicon 256 px;
   - logowanie offline zależy od zapisanej sesji Supabase i nie było testowane;
   - mapy: nie przeklikane w przeglądarce (wgrywanie obrazu, pinezki, dotyk); brak przybliżania dwoma palcami;
   - obrazy map i pliki audio (IndexedDB) nie trafiają do eksportu danych.

## Uwagi
- `src/components/AuthGuard.tsx` ma **tymczasową, niezacommitowaną** zmianę (pomija logowanie w `npm run dev`). Nie commitować; cofnąć `git checkout src/components/AuthGuard.tsx`.
- Gałąź `chore/ip-cleanup-p0` (commit `e5cb367`, od `main`) usuwa treści WFRP z `main`; czeka na decyzję o pushu/merge'u.
- Przy pierwszym uruchomieniu nowej wersji dane w przeglądarce są czyszczone (ADR 0008).
- Atak: `vsDefense` podstawia pole obrony celu w miejsce wartości stopnia trudności; `opposed` wymaga sukcesu atakującego i wyższego wyniku (margines / suma / sukcesy zależnie od trybu).
