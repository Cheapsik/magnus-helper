# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Magnus Helper: a system-neutral tool for an RPG Game Master. Vite + React 18 + TypeScript + Tailwind + shadcn/ui (`src/components/ui`), deployed to GitHub Pages under `/magnus-helper/` as a PWA. The UI and the design docs are in Polish. Code comments and commit messages are in English.

Read these before larger changes:
- `CONTEXT.md`: domain glossary (Kampania, System kampanii, Karta, Rola pola, Rodzaj testu/ataku…). Use these terms and avoid the ones listed under _Avoid_.
- `docs/adr/`: design decisions (campaign isolation, configurable test/attack resolution, field types, no legacy migration, soft field deletion).
- `CONTINUE.md`: current state of the work, open items, and local caveats.
- `IP_CLEANUP_PLAN.md`: why the app must not contain any published game's names, rules, or art.

## Commands

```sh
npm run dev                          # Vite dev server on port 8080, http://localhost:8080/magnus-helper/
npm run build                        # production build into dist/
npm run lint                         # ESLint
npm test                             # Vitest, single run (jsdom)
npx vitest run src/lib/clocks.test.ts    # one test file
npx vitest run -t "name of test"         # tests matching a name
npx tsc -p tsconfig.app.json --noEmit    # type check (vite build does not type check)
npm run deploy                       # publishes dist/ to gh-pages
```

Tests live next to the code as `src/**/*.test.ts(x)`. `src/test/setup.ts` clears the storage snapshot cache before each test.

## Architecture

**Cloud copy with a local mirror (ADR 0010).** Supabase (`src/lib/supabase.ts`, env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) holds the GM's campaigns (`campaigns`, `campaign_data` with one row per storage key, and the `campaign-files` bucket for map images and audio). The browser keeps a full copy in `localStorage` (images and audio in IndexedDB: `imageStore.ts`, `audioStore.ts`), so the app keeps reading synchronously and works offline. `main.tsx` waits for `startCloudSync()` (`src/lib/cloudSync.ts`) to pull the account's copy before rendering `App`. Every write is queued in `src/lib/syncQueue.ts` and pushed in the background, and when two devices change the same key, the last push wins. Player and material sharing is separate (`src/lib/sharedCampaigns.ts`). The schema is in `supabase/migrations/` and access is enforced by RLS. New tables need explicit `GRANT`s, because the project does not grant them by default.

**Campaign isolation via namespaced storage.** `src/lib/campaignStorage.ts` keeps the campaign registry (`magnus_campaigns`) and rewrites every key to `campaign:<activeId>:<key>`. The only exceptions are the keys in `GLOBAL_KEYS`, which must match the `{ global: true }` call sites. Switching campaigns reloads the page (`CampaignContext.switchCampaign`) instead of resetting each piece of state. All runtime persistence goes through `src/lib/storage.ts` (`readJson`/`writeJson`/`subscribe`) or the `useLocalStorage` hook built on it. Do not touch `localStorage` directly. Code that has to anyway must call `markKeyDirty(storageKey)`, or the change never reaches the cloud. The only exceptions are boot (`main.tsx` → `dataReset.ts`, which wipes data from older `DATA_VERSION`s per ADR 0008) and the export/import/reset in settings.

**The campaign system is data, not code.** `src/lib/campaignSystem.ts` (`CampaignSystem`: test types, attack types, defenses, hit locations, conditions, currency) and `src/lib/cardSchema.ts` (per-kind card structure, field roles) are defined by the GM for each campaign and stored under `rpg_campaign_system` (`cardStore.ts`). New campaigns copy a starting point from `systemTemplates.ts`. Shared tools read card fields only through explicit **field roles** (initiative, main resource, defenses, damage reduction). Never infer meaning from a field's name (ADR 0003). Rules logic is pure and unit-tested: `testEngine.ts` (test resolution) and `combatEngine.ts` (`resolveHit`, `resolveDamage`).

**Routing (`src/App.tsx`).** `/auth` and `/join/:token` are public. Everything else is behind `AuthGuard`. `/player/*` is the player panel (`PlayerApp.tsx`). The GM app (`GmEntry`) sends users to `/player` when an invite is pending or they have no campaigns of their own but are members elsewhere. It shows `FirstCampaignScreen` when no campaign exists. `/player-screen` is the players' second-window view without GM chrome. GM pages live in `src/pages`, and feature components sit in matching folders under `src/components`. Cross-page UI comes from the providers in `src/context` (global drawer, command palette, scene, ambient).

**IP guard.** `src/test/ipGuard.test.ts` fails if `src/`, `public/`, `docs/`, or `index.html` contains third-party game trademarks or terminology. Keep sample data, placeholders, and templates generic.

## Local caveats

- Work happens on feature branches. The repo owner does all merges and pushes.
