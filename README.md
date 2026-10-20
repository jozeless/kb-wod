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
- `src/domain`: pure filtering/planning functions and future session contract.
- `src/storage`: validated, versioned local weekly-plan persistence.
- `src/ui`: reusable DOM components, views and data-driven workout-block details; content is inserted as text.
- `src/main.js`: hash routing, event orchestration, storage synchronization, service-worker registration.
- `styles/app.css`: mobile-first styling and fixed bottom navigation.
- `tests`: unit and browser integration tests.
- `manifest.webmanifest`, `service-worker.js`: relative PWA paths and static-only offline cache.

## Scope

Today has seven fixed Monday–Sunday slots. Add/change opens Library in assignment mode; cancel makes no change. The same workout may occupy multiple days. There is no automatic weekly rollover or scheduling. Library supports case-insensitive name search and the Hybrid/Focus type registry. The three sample cards remain explicitly marked **Demo** and originate only in `demo-workouts.js`. The real **KB Focus 001 — Upper Body + ABS** definition lives independently in `focus-001-upper-abs.js` and is composed into `catalog.js`. It specifies a 10-minute Upper EMOM followed by 10 minutes of ABS intervals, with no prescribed load; warm-up is separate. Tuesday is a recommendation only and never changes assignments automatically.

Stats and Dashboard intentionally display empty states. Detail → Active Workout → Save Result is a navigation scaffold. No timer runs, no exercise prescription is invented, and no session or result is saved. Additional real workout definitions, result forms, session persistence, statistics, authentication and Supabase remain out of scope. Focus 001 currently exposes its complete detail only; execution and saving remain future phases.

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
