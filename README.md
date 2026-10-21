# KB 2.0 — Foundation

A mobile-first static application built with HTML, CSS and native JavaScript ES modules. No runtime framework, CDN, backend or build step. This branch replaces the experimental prototype; it does not migrate its data or Supabase integration.

## Develop and test

- Python 3 and Node.js 22+ are recommended.
- `npm start`: serve the checkout locally on port 8000.
- `npm ci`: install pinned development-only test dependencies.
- `npm test`: domain and storage tests using Node's test runner.
- `npm run test:e2e`: Chromium navigation, filters, planning, responsive, flow scaffold, invalid storage and offline tests. Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation.
- The E2E server serves the parent directory at port 8102, deliberately testing `/kb-wod/` as on GitHub Pages. It uses isolated browser contexts and synthetic data.

## Structure

- `src/data`: workout catalog, extensible type registry, separate demonstration definitions.
- `src/domain`: pure planning functions, timeline compiler, monotonic workout engine and future session contract.
- `src/storage`: validated weekly-plan persistence and independent exercise-weight preferences.
- `src/ui`: reusable DOM components, workout details and active-screen controller with lifecycle cleanup; content is inserted as text.
- `src/platform`: optional Web Audio cues generated locally, with failure isolation.
- `src/main.js`: hash routing, event orchestration, storage synchronization, service-worker registration.
- `styles/app.css`: mobile-first styling and fixed bottom navigation.
- `tests`: unit and browser integration tests.
- `manifest.webmanifest`, `service-worker.js`: relative PWA paths and static-only offline cache.

## Scope

Today has seven fixed Monday–Sunday slots. Add/change opens Library in assignment mode; cancel makes no change. The same workout may occupy multiple days. There is no automatic weekly rollover or scheduling. Library supports case-insensitive name search and the Hybrid/Focus type registry. The three sample cards remain explicitly marked **Demo** and originate only in `demo-workouts.js`. The real **KB Focus 001 — Upper Body + ABS** definition lives independently in `focus-001-upper-abs.js` and is composed into `catalog.js`. It specifies a 10-minute Upper EMOM followed by 10 minutes of ABS intervals, with no prescribed load; warm-up is separate. Tuesday is a recommendation only and never changes assignments automatically.

Stats and Dashboard intentionally display empty states. Focus 001 supports Detail → Start Workout → Active Workout → Workout Complete. The three Demo cards retain their original scaffold. No sessions, results or statistics are saved. Additional definitions, result forms, session persistence, authentication and Supabase remain out of scope.

## Data contracts

A workout definition has `id`, positive integer `version`, `name`, `type`, optional `image`, `exercises`, `phases`, `resultFields`, `demo`, and `archived`. The real Focus definition uses exercise IDs with rep/cycle targets, ordered phase references, EMOM/interval timer configuration and future result field descriptors. Empty arrays on the Demo definitions mean **undefined**, not a ready-to-run workout. Exercise targets specify `min`, `max` and `unit`; no completed values or fixed loads are supplied. Future result descriptors cover EMOM minutes, per-exercise/per-round loads and repetitions, modifications, shoulder discomfort, technically correct ABS intervals and perceived exertion 1–10. These descriptors do not collect or persist results.

Identity is the `(id, version)` pair. Do not edit a used version in place: append a new definition. Archive definitions without deleting versions referenced by assignments or sessions. The current catalog has no authoring UI.

Weekly assignments are a separate `{ Monday: {workoutId, version} | null, ... }` mapping stored at `kb2.weekly-plan.v1`. An unavailable definition remains assigned until manually changed. Invalid storage is preserved and planning is disabled rather than silently overwriting it. Write failures are surfaced. Storage events refresh another open tab; simultaneous writes are not transactional and can still race. Local storage is not a backup.

Future completed sessions have their own `kb2.sessions.v1` namespace and must include `workoutId`, `workoutVersion`, a definition snapshot and typed results. The namespace is reserved but not written in phase 1. Editing a workout or a weekly assignment must never rewrite historical results.

Prototype keys (`kbwod_history`, `kbwod_weight_*`) and auth storage are never read, changed or deleted. Old code remains recoverable in Git history. No migration or remote request is performed.

## GitHub Pages and PWA

All application assets use relative URLs; hash navigation needs no server fallback. The root directory can be served by GitHub Pages without a build, but this change does not configure deployment or publish anything.

The worker precaches the static application, including every imported module. It intercepts only known same-origin static URLs, not API requests. It removes only older `kb2-static-*` caches, leaves prototype caches/storage untouched, and waits for existing tabs to close before activation. Increment the cache version and update the complete module list when shipping changed assets. First use requires an online load; offline use requires successful installation and a subsequent controlled page load. Existing prototype workers and installed clients require manual upgrade testing before any future production release. Existing PNG icons are retained provisionally.

## Remaining validation

Automated coverage uses Chromium at mobile and desktop sizes, including widths 320–1280. Manual Safari/iOS and Android installation, accessibility/assistive technology, real device safe areas and upgrades from older production workers remain pending. No production deployment or merge is authorized by this phase.

## Workout timer (phase 3)

Start Workout explicitly creates an in-memory session. A direct active-screen URL shows a ready screen and never autostarts. The initial 3, 2, 1 countdown lasts 3 seconds outside the workout; GO appears at the start of the first EMOM minute. Upper runs ten 60-second minutes, then immediately enters ABS at workout 10:00. ABS runs ten 40-second WORK / 20-second REST intervals; completion occurs at 20:00 after the final rest. The immutable Focus 001 version 1 definition is unchanged.

`compileWorkout` derives segments, exercise order and round positions from `phases`, `exerciseIds` and `timer`. It validates phase/workout durations and currently supports EMOM and work/rest intervals; future formats add a compiler branch. `WorkoutTimer` accepts an injected monotonic clock (default `performance.now`), never counts visual ticks, and excludes paused time. The UI samples every 100 ms; elapsed position and block changes remain correct after delayed callbacks. The paused screen freezes both countdown and workout time, and stops its visual ticker. Completion clears the visual ticker; leaving the session clears timers and audio. Visibility/pageshow refresh the position without adding time or replaying a backlog of sound cues.

Start Workout attempts to enable Web Audio synchronously within its user gesture. Sound On/Off remains available; blocked or missing audio leaves it Off without affecting the timer. Optional cues identify start, the last three seconds of each timed segment, elapsed full minutes, segment/exercise changes and completion. One cue is chosen per update: completion takes precedence over minute, then block/exercise change, then countdown ticks. At 10:00 the minute cue replaces the simultaneous block/exercise cue; at 20:00 only completion sounds. Paused/resumed updates do not repeat cues, and hidden or delayed updates consume missed events without replaying a backlog. Unsupported or blocked audio does not stop the workout. No continuous sound, remote audio asset or vibration dependency is used.

End Workout and in-app departure request confirmation, including while paused or counting down. Hash/Back navigation is guarded and cancelled navigation keeps the same live controller. Reload/close uses the browser's standard beforeunload warning where supported. No active progress is persisted: confirmed reloads, browser process termination or OS eviction lose it. Mobile browsers may suspend audio and callbacks or stop advancing their monotonic clock during device sleep; this is not a promise of continuous execution with a locked screen. Real iOS/Android lock/resume behavior and audible cues need device testing. Pausing before locking is recommended.

Tests use injected clocks and Playwright's simulated clock: no real 20-minute wait is required. They cover every minute/interval boundary, 3-second lead-in, final rest, immediate block transition, pause/resume, late updates, direct-link safety, exit cancellation, missing audio, responsive layouts and offline completion under the project subpath. Demo/library/planning regression tests remain enabled.

## Exercise weight preferences

Workout Detail shows an optional Weight (kg) input beside each exercise. Empty means unspecified, zero is a valid value and nonnegative decimal values are accepted; no default or mandatory load is imposed. Inputs save immediately on valid edits. Clearing a field removes that preference. Invalid input never replaces a previously saved valid value; storage failures are shown in the field. Unreadable/corrupt stored values are preserved and the affected input is disabled rather than silently replacing them.

Each value has its own key: `kb2.weight-preference.v1:<encoded workout ID>:<version>:<encoded exercise ID>`. The active screen uses the same field component and storage key for its current exercise, including repeated rounds. Values are training preferences, not historical/session results, and do not modify the catalog or weekly plan. Existing prototype data and reserved result storage remain untouched. Preferences depend on the browser/origin and are not a backup; simultaneous edits to the same exercise in different tabs are last-write-wins. No Supabase or performance history is implemented.
