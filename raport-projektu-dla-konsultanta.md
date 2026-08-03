# Raport projektu dla konsultanta

## 1. Cel produktu, odbiorcy i problem
- **Cel:** Aplikacja webowa **Magnus Helper — Pomocnik RPG**: osobisty pomocnik do sesji RPG (kości, testy, kodeks, tracker walki i inne narzędzia sesyjne). UI po polsku; tytuł i meta w `index.html`.
- **Odbiorcy:** Nie ustalono w dokumentacji produktowej. Z kodu wynika podział UI na tryb **gracza** (`player`) i **MG** (`gm`) — lokalny przełącznik widoczności nawigacji, nie role serwerowe.
- **Problem:** Nie ustalono (brak PRD/README z opisem problemu). Interpretacja z funkcji: lokalne wsparcie sesji (rzuty, walka, notatki, NPC, łup, ambient itd.) bez backendu domenowego.
- **System zasad (interpretacja z kodu):** cechy typu WW/US/K/Odp/…, SB, żywotność, domyślna postać „Aldric Grimwald” / Ubersreik — spójne z idiomem WFRP (2e-like). Brak jawnego oświadczenia „to jest Warhammer” w README.
- **Źródła:** `index.html`, `src/context/ModeContext.tsx`, `src/data/character.ts`, `src/lib/gameStatGlossary.ts`, `README.md` (tylko tytuł).

## 2. Stack, usługi zewnętrzne i deployment
- **Stack:** TypeScript, React 18, Vite 5, React Router 6, Tailwind 3 + Radix/shadcn-like UI, `next-themes`, Zod + react-hook-form, `@xyflow/react` (mapa relacji), `@3d-dice/dice-box-threejs` (kości 3D), Vitest + Testing Library; w `devDependencies` też Playwright i `lovable-tagger` (ślad generowania z Lovable).
- **Usługi zewnętrzne:**
  - **Supabase Auth** (`@supabase/supabase-js`) — klient z `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
  - Google Fonts (MedievalSharp) w `index.html`.
  - Obrazy OG hostowane na `storage.googleapis.com` (meta w `index.html`).
- **Deployment / hosting / CI:**
  - Deploy: `gh-pages -d dist`; `homepage`: `https://cheapsik.github.io/magnus-helper`; Vite `base: "/magnus-helper/"`.
  - Brak katalogu `.github` / workflow CI w repo.
  - Brak Docker/compose/Vercel/Fly w repo.
- **Źródła:** `package.json`, `vite.config.ts`, `src/lib/supabase.ts`, `src/vite-env.d.ts`.

## 3. Architektura i przepływy danych
- **Styl:** Monolit frontendowy (SPA). Brak serwera aplikacji, API REST/GraphQL/tRPC ani schematu DB aplikacji w repo.
- **Główne przepływy:**
  1. Wejście → `AuthProvider` (sesja Supabase) → `AuthGuard` → chronione trasy w `Layout`.
  2. Dane sesji RPG → głównie **`localStorage`** (klucze `rpg_*` / `magnus_*`) przez `useLocalStorage` i konteksty (`AppContext`, `SceneContext`, `AmbientContext`, …).
  3. Backup: eksport/import JSON snapshotu kluczy `rpg_*`/`magnus_*` (`rpgStorageBackup`, ustawienia).
  4. Migracje legacy kluczy storage w kodzie klienckim (`rpgStorageMigration`, migracje notatek/walki/NPC/loot).
- **Granice:** tylko przeglądarka (+ Supabase Auth). Brak workerów/edge/kolejek w repo. `@tanstack/react-query` jest w zależnościach, ale **nie znaleziono użycia** `useQuery` / `QueryClient` w `src`.
- **Źródła:** `src/App.tsx`, `src/context/*`, `src/hooks/useLocalStorage.ts`, `src/lib/rpgStorageBackup.ts`, grep po `react-query`.

## 4. Kluczowe katalogi, moduły i odpowiedzialności

| Ścieżka / moduł | Odpowiedzialność |
|---|---|
| `src/pages/` | Ekrany tras (Start, kości, testy, walka, questy, notatki, sklep, ambient, auth, …) |
| `src/context/` | Stan aplikacji: auth, dane RPG, scena, ambient, tryb GM/gracz, drawer, command palette, settings |
| `src/lib/` | Logika domenowa: kości, walka, loot/shop, backup, Supabase client, URL-e auth, migracje |
| `src/components/character-sheet/` | Pełniejsza karta postaci/NPC (typy PL: cechy, broń, pancerz, umiejętności) |
| `src/components/combat/`, `dice/`, `kodeks/`, `relations-map/`, `global-drawer/`, `command-palette/` | UI domenowe |
| `src/components/ui/` | Komponenty UI (shadcn/Radix) |
| `src/data/` | Dane seed: postać domyślna, cheat sheets, zdolności |
| `src/types/settings.ts` | Motywy wizualne aplikacji |
| `public/assets/` | Assety (kości 3D, tło auth) |
| `.agents/skills/` | Skill’e agentowe (gitignore’owane) — poza produktem użytkownika końcowego |

## 5. Modele danych, relacje i API
- **Modele (klient, TypeScript + localStorage), m.in.:**
  - `CharacterData` — uproszczona karta (`rpg_character`)
  - `SavedNpc` / karta w `character-sheet/types` — bogatszy model NPC (`rpg_saved_npcs`)
  - Bohaterowie drużyny: `rpg_characters`
  - Walka: `CombatSessionsState` / `Combatant` (`rpg_combat_sessions`)
  - Notatki sesji + katalog sesji (`rpg_session_notes`, `rpg_notes_session_catalog`)
  - Questy/wątki (`rpg_quests`, layout)
  - Loot DB + config (`rpg_items_db`, `rpg_loot_config`)
  - Shop (`rpg_shop_config`, `rpg_shop_history`)
  - Bestiariusz (`rpg_bestiary`), plotki, timery, ambient, mapa relacji (`magnus_relations_map`), sceny (`magnus_scenes`)
- **Relacje:** nie w DB — luźne powiązania przez ID/nazwy w localStorage (np. questy↔scena, heroes↔combat/relations). Brak formalnego schematu relacyjnego.
- **API:** brak API domenowego w repo. Jedyny klient zewnętrzny: **Supabase Auth** (signUp/signIn/OAuth Google/reset/update password). Brak `.from(...)` / tabel Supabase w kodzie aplikacji.
- **Źródła:** `AppContext`, `character-sheet/types.ts`, grep `supabase` / `localStorage` / kluczy `rpg_`.

## 6. Funkcje i stan ukończenia

| Funkcja | Stan | Dowód w repo |
|---|---|---|
| Auth (email/hasło, Google, reset) | Działa (UI + AuthContext) | `AuthPage`, `AuthContext`, `AuthGuard` |
| Dashboard Start | Działa | `Index.tsx`, trasa `/` |
| Kości (w tym 3D) | Działa | `DicePage`, `dice-box-threejs`, assety |
| Testy procentowe + preset trudności | Działa | `TestsPage`, `difficultyPresets` |
| Kodeks / baza wiedzy | Działa | `CheatSheetsPage`, `codexEntries` |
| Tracker walki + sesje walki | Działa | `CombatPage`, `combatSessions.ts` (~778 LOC page) |
| Postać / bohaterowie / NPC | Działa | `CharacterPage`, `HeroesPage`, `NpcManagerPage`, character-sheet |
| Ekwipunek, stany, notatki sesji | Działa | odpowiednie pages + AppContext |
| Questy/wątki (kanban) | Działa | `QuestsPage` (~1417 LOC) |
| Scena, timery, ambient | Działa | `ScenePage`, `TimersPage`, `AmbientPage` |
| Generator łupu, sklep | Działa (sklep poza głównym sidebarem) | `LootGeneratorPage`, `ShopPage` (trasa `/shop`; brak w `SIDEBAR_GROUPS`) |
| Mapa relacji | Działa | `RelationsMapPage` + duży moduł `relations-map` |
| Skrzynka MG, plotki, bestiariusz, symulacje | Działa (UI obecne) | `GmToolboxPage`, `RumorsPage`, `BestiarySection`, `SimulationsPage` |
| Ustawienia / motywy / backup | Działa | `SettingsContext`, `settings.ts`, backup JSON |
| Tryb GM vs gracz | Działa (filtrowanie nav) | `ModeContext` |
| Testy automatyczne | Stub / praktycznie brak | tylko `src/test/example.test.ts` (`expect(true)`); Playwright w deps bez plików testów w repo |
| Sync danych użytkownika do chmury | Brak w repo | Supabase używany wyłącznie do auth |

## 7. Auth, role, płatności, integracje, joby, storage
- **Autoryzacja / sesje / role:** Supabase Auth; chronione trasy po zalogowaniu. Role produktowe serwerowe: **brak**. „Role” UI: `player` | `gm` w localStorage.
- **Płatności:** Brak w repo.
- **Integracje:** Supabase Auth; Google OAuth przez Supabase; fonty Google; (historycznie) Lovable tagger w dev.
- **Joby / kolejki / cron:** Brak w repo.
- **Storage:** `localStorage` jako główna persystencja danych RPG; eksport/import JSON; pliki statyczne w `public/`; sekrety w `.env` (gitignore) — `VITE_SUPABASE_*`. Brak S3/blob storage aplikacji w kodzie.

## 8. Ryzyka, dług techniczny, braki
- **Ryzyka:**
  - Dane sesji wyłącznie lokalnie — utrata przy czyszczeniu przeglądarki / innym urządzeniu (mimo backupu ręcznego).
  - Auth wymaga konta, ale dane nie są powiązane z kontem w kodzie — model „login + lokalne dane”.
  - Anon key Supabase w bundlu frontu (standard Vite) — OK dla Auth, o ile RLS/projekt skonfigurowane poza repo (konfiguracji Supabase **brak w repo**).
- **Dług techniczny:**
  - README praktycznie pusty; brak docs/ADR.
  - Wiele ścieżek migracji legacy storage — złożona ewolucja modelu danych.
  - Duże pliki stron (Quests ~1.4k, SessionNotes ~1k, Shop/Loot/Combat setki–900 LOC) — monolity UI.
  - Zależności prawdopodobnie nieużywane (`@tanstack/react-query`; Playwright bez testów).
  - Ślady dwóch modeli postaci: uproszczony `CharacterData` vs bogata karta `character-sheet`.
  - `/shop` poza główną nawigacją sidebara — odkrywalność niejasna.
- **Braki / TODOs:** brak komentarzy TODO/FIXME w `src` (grep pusty). Brak CI. Brak `.env.example`. Testy nie pokrywają domeny.
- **Niepewności:** dokładna edycja WFRP / oficjalne licencje treści; konfiguracja projektu Supabase (redirecty, Google provider); czy produkcja na GitHub Pages jest aktualnie wdrożona; intencje produktowe poza meta description.

---

### Niepewności i braki źródeł
- Nie przeglądnięto całego kodu każdej strony linia po linii — ocena „działa” = trasa + substancjalna implementacja + persystencja, bez ręcznego QA UI.
- Nie czytano wartości `.env` (sekrety); potwierdzono tylko nazwy zmiennych w kodzie.
- Brak dokumentacji produktowej, schematu Supabase i CI — wiele aspektów ops/produktowych: **Nie ustalono**.
