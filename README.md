# Heavy Metal KB

A mobile-first static PWA built with native JavaScript ES modules, HTML and CSS. No framework, CDN or runtime build step is required.

## Available workouts

The Library and weekly assignment picker contain exactly five released AMRAP WODs:

| Workout | Duration | Focus | Prescribed kettlebell |
| --- | --- | --- | --- |
| Classic Iron v1 | 20 minutes | Full Body | None |
| Core Blast v1 | 10 minutes | Core | None |
| Iron Twist v1 | 5 minutes | Full Body | 8 kg |
| Saturday Morning Beef v1 | 10 minutes | Power & Conditioning | 8 kg |
| Iron Arms v1 | 20 minutes | Upper Body / Full Body | None |

Iron Twist and Saturday Morning Beef detail pages offer optional **Watch reference video** links that open YouTube in a separate tab. Videos are not embedded or displayed during training.

All five share one round-based timer, Focus Mode, Results and explicit-save workflow. Classic Iron retains its seven-exercise circuit and saved-record format. The mini WODs have five exercises, ten total repetitions each (five per side when applicable); Deadlift + Halo is one combined exercise. A 3-2-1 countdown precedes the continuous AMRAP. Press **Ronda completa** only after a full circuit; an automatic 20-second rest stays inside the workout countdown. Pause/Resume freezes both clocks.

Results retain completed rounds, additional repetitions (0–69 for Classic Iron, 0–49 for each mini, 0–74 for Iron Arms), and precise full-round times excluding countdown, rest and paused time. History shows all round times and highlights the fastest. Progress keeps an independent all-time fastest round for each WOD, alongside the existing monthly statistics and calendar. Performance records never compare different WODs. Core Blast and Saturday Morning Beef keep separate fastest-round records for historical five-minute and new ten-minute sessions. The PWA cache is `kb2-static-v42`.

The pre-start countdown is outside the workout. Sessions stay in memory until the full workout finishes and the user explicitly presses **Save Workout**. There are no draft saves or recovery actions. Early End, refresh or leaving discards the unsaved workout. A failed final save retains the result for retry. Audio and training work without an account.

## Library and weekly plan

Library derives its cards and count from `src/data/catalog.js`. It has no Hide/Restore interface or user visibility preferences. Add future released definitions to the catalog; Library and assignment pickers use the same list without hardcoded workout counts.

Today keeps seven Monday–Sunday slots. Assignments remain manual and may reuse the same WOD on multiple days. Retired workout references are removed from the active and cached weekly plan when its workspace is loaded. Incoming/outgoing cloud plans and conflict choices are filtered by the same retired-ID rules. Unknown future references are retained but cannot start until their definition is installed. Outdated retired cloud references are cleared through the existing weekly-plan synchronization mechanism and cannot reopen a removed workout.

## Stored data and cloud

The IndexedDB database `kb2.training.sessions` and original session/weekly-plan tables remain in use. Completed-session synchronization, ownership checks, explicit guest import, retries and duplicate protection are preserved. Removed WOD sessions are excluded from current History/Progress and the sync queue; their original IndexedDB/Supabase records are **not deleted or rewritten**. Old drafts and unused preference keys are left untouched. Actual record deletion belongs to a separate future cleanup.

Supabase is optional. See [existing Auth and cloud setup](docs/SUPABASE.md). This change requires no new production migration and executes no production SQL. If PR #36's visibility migration was applied previously, its database objects remain deployed until separately reviewed; see the [deployment caveat](docs/LIBRARY_DEFINITIVE_CLEANUP.md#existing-pr-36-database-objects).

## Develop and test

- `npm ci`: install the pinned test dependency.
- `npm start`: serve locally on port 8000.
- `npm test`: run the complete Node suite.
- `npm run test:e2e`: run the complete Chromium suite, mobile and desktop.

Python 3, Node 22+ and Chromium are required. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. Playwright serves the parent directory at port 8102 to exercise the GitHub Pages `/kb-wod/` subpath. Browser/cloud fixtures contain synthetic data and do not use production accounts.

## Structure

- `src/data`: released-workout catalog, Classic Iron, Iron Arms and three mini AMRAP definitions.
- `src/domain`: planning, monotonic timer, AMRAP round timing, result validation and read-only progress projections.
- `src/storage`: weekly plan and unchanged transactional session storage.
- `src/ui`: Library, Today, details, Focus Mode, results, History, Progress and Account.
- `src/cloud`: existing optional Auth, owner-scoped session/plan transport and synchronization.
- `src/platform`: synthesized Web Audio and cross-tab workspace locking.
- `styles`: HM/KB presentation; `manifest.webmanifest` and `service-worker.js`: install metadata and offline assets.
- `tests`: current behavior, account/data safety, offline, layout and audio regressions.

[Definitive cleanup and validation](docs/LIBRARY_DEFINITIVE_CLEANUP.md) is the current release note. Earlier documents describe features at their release and may reference workouts or modules removed by this cleanup. Classic Iron details: [AMRAP](docs/CLASSIC_IRON_AMRAP.md), [additional repetitions](docs/CLASSIC_IRON_PARTIAL_REPS.md), [round times](docs/CLASSIC_IRON_ROUND_TIMES.md).
