# Gdzie skończyliśmy: przebudowa na system uniwersalny

Gałąź `feat/campaigns`, commity lokalne (bez pusha, bez merge'a; merge robi właściciel repo).
Decyzje projektowe: `CONTEXT.md` + `docs/adr/0006`–`0009`. Plan IP: `IP_CLEANUP_PLAN.md`.

Stan po ostatnim commicie: `tsc` 0 błędów, testy 119/119, `vite build` OK, ESLint 23 błędy (wszystkie zastane, w plikach nieruszanych).

## Zrobione
1. **Model** (`src/lib/cardSchema.ts`, `campaignSystem.ts`, `systemTemplates.ts`, `cardStore.ts`, `dataReset.ts`, `diceNotation.ts`): rdzeń karty (nazwa/portret/notatki), ukryte pola, typy pól `dice`/`track`, reguły losowania, role (inicjatywa, zasób główny, zasoby dodatkowe, obrony, redukcja, redukcja per lokacja), rodzaje testów i ataku, stany, waluta; neutralny szablon i pusta struktura; reset danych sprzed przebudowy (bez migracji).
2. **Edytor struktury kart**: Ustawienia → Karty (`src/components/system/*`, `src/lib/structureOps.ts`).
3. **Kreator kampanii**: `src/components/campaign/*`, ekran pierwszej kampanii w `App.tsx`.
4. **Karty bohaterów/NPC/potworów**: `src/pages/CardsPage.tsx` (`/heroes`, `/npcs`, `/monsters`), grupy, „Losuj” (`src/lib/cardGenerator.ts`), szuflada `CardDrawerView`; mapa relacji, notatki, wątki, sceny, wyszukiwarka czytają karty. Usunięte: `character-sheet/*`, `/character`, `/simulations`, tryb gracza, `gmEnemy`, `gameStatGlossary`.
5. **Walka (częściowo)**: generyczny `Combatant` (`resource`, `resourceLabel`, `stats`, `card`), roster z kart (przeciąganie `typ:id`), formularz uczestnika, stany z kampanii.
6. **Testy (częściowo)**: `src/lib/testEngine.ts` (+ testy) i edytor Ustawienia → Testy (`TestTypesEditor.tsx`).
7. **Listy kampanii**: Ustawienia → Stany / Waluta, `/conditions`, łup i sklep na walucie kampanii (`src/lib/currency.ts`, `MoneyInput`).

## Do zrobienia (w tej kolejności)
1. **`src/pages/TestsPage.tsx`** — przepisać na `resolveTest` z `testEngine.ts`: wybór rodzaju testu, źródło (karta + pole z `testType.sources[kind]` albo wartość ręczna), stopień trudności, modyfikator, historia w `useLocalStorage("rpg_test_history")`. Pusty stan → `/settings?tab=testy`. Strona wciąż używa starego `difficultyPresets`/`addTestResult` z AppContext.
2. **`GmToolboxPage.tsx`** — sekcja edycji presetów trudności → link do Ustawienia → Testy. Potem usunąć z `AppContext` `difficultyPresets`, `testHistory`, `addTestResult` oraz `DIFFICULTY_PRESETS`/`TestResult` z `src/lib/dice.ts`.
3. **Silnik ataku** `src/lib/combatEngine.ts` (TDD) wg `AttackType` z `campaignSystem.ts`: test atakującego (`resolveTest`), rozstrzygnięcie (`self` / `vsDefense` przez `roles.defenses[defenseId]` celu / `opposed` z zasadą remisu / `manual`), obrażenia (`weapon` = pole/komórka `dice` wybrana na karcie, `fixed`, `manual`; `+ addField[kind]`, `+ margines`), redukcja (`roles.damageReduction` albo `locationReduction` dla trafionej lokacji, minimum 0/1), lokacje (`system.hitLocations`, kość albo odwrócony wynik ataku). Wartości kart czytać przez `combatant.card` + `readCards`.
4. **`src/components/combat/CombatAttackPanel.tsx`** — dziś placeholder; zbudować UI na `combatEngine`, z podglądem i „Zadaj X” odejmującym od `combatant.resource`.
5. **`src/components/system/CombatSettingsEditor.tsx`** — dziś placeholder: edytor rodzajów ataku, typów obrony, tabeli lokacji; w edytorze kart (RolesEditor) dodać przypisanie pól do obron i redukcji per lokacja.
6. **Sprzątanie i dokumenty**: `IP_CLEANUP_PLAN.md` (zaktualizować status, P0-2…P0-5 nadal otwarte: gh-pages, prywatność repo, `background.png` z okładkami D&D, `raport-projektu-dla-konsultanta.md`), test „IP guard” w Vitest, `docs/adr/0002` wspomina „neutralny szablon” — już istnieje.

## Uwagi
- `src/components/AuthGuard.tsx` ma **tymczasową, niezacommitowaną** zmianę (pomija logowanie w `npm run dev`). Nie commitować; cofnąć `git checkout src/components/AuthGuard.tsx`.
- Osobna gałąź `chore/ip-cleanup-p0` (commit `e5cb367`, od `main`) usuwa treści WFRP z `main`; czeka na decyzję o pushu/merge'u.
- Przy pierwszym uruchomieniu nowej wersji dane w przeglądarce są czyszczone (ADR 0008).
