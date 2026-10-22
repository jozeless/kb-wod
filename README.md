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
- `src/domain`: planning, timeline compiler, monotonic timer, versioned session/result validation.
- `src/storage`: separate weekly planning, weight preferences and transactional IndexedDB sessions.
- `src/ui`: reusable views, legacy active controller, Focus v2 block/results flow and basic saved-session history; content is inserted as text.
- `src/platform`: optional Web Audio cues generated locally, with failure isolation.
- `src/main.js`: hash routing, event orchestration, storage synchronization, service-worker registration.
- `styles/app.css`: mobile-first styling and fixed bottom navigation.
- `tests`: unit and browser integration tests.
- `manifest.webmanifest`, `service-worker.js`: relative PWA paths and static-only offline cache.

## Scope

Today has seven fixed Monday–Sunday slots. Add/change opens Library in assignment mode; cancel makes no change. The same workout may occupy multiple days. There is no automatic weekly rollover or scheduling. Library supports case-insensitive name search and the Hybrid/Focus type registry. The three sample cards remain explicitly marked **Demo** and originate only in `demo-workouts.js`. The real **KB Focus 001 — Upper Body + ABS** retains immutable version 1 (`focus-001-upper-abs.js`, Upper EMOM + ABS intervals). The current Library option is immutable version 2 (`focus-001-v2.js`), with two independent 10-minute 40/20 blocks and results between them. Version 1 remains available through existing weekly assignments and direct versioned URLs. No assignment is upgraded automatically; warm-up remains separate. Tuesday is a recommendation only and never changes assignments automatically.

Stats and Dashboard retain empty states. Focus v2 supports Upper → Upper Results → explicit Continue to ABS → ABS → ABS Results → explicit Save Workout, with a basic local history. Focus v1, Hybrid and the three Demo cards retain their previous execution/scaffold behavior. Advanced statistics, authentication and Supabase remain out of scope.

## Data contracts

A workout definition has `id`, positive integer `version`, `name`, `type`, optional `image`, `exercises`, `phases`, `resultFields`, `demo`, and `archived`. The real Focus definition uses exercise IDs with rep/cycle targets, ordered phase references, EMOM/interval timer configuration and future result field descriptors. Empty arrays on the Demo definitions mean **undefined**, not a ready-to-run workout. Exercise targets specify `min`, `max` and `unit`; no completed values or fixed loads are supplied. Future result descriptors cover EMOM minutes, per-exercise/per-round loads and repetitions, modifications, shoulder discomfort, technically correct ABS intervals and perceived exertion 1–10. These descriptors do not collect or persist results.

Identity is the `(id, version)` pair. Do not edit a used version in place: append a new definition. Archive definitions without deleting versions referenced by assignments or sessions. The current catalog has no authoring UI.

Weekly assignments are a separate `{ Monday: {workoutId, version} | null, ... }` mapping stored at `kb2.weekly-plan.v1`. An unavailable definition remains assigned until manually changed. Invalid storage is preserved and planning is disabled rather than silently overwriting it. Write failures are surfaced. Storage events refresh another open tab; simultaneous writes are not transactional and can still race. Local storage is not a backup.

Focus v2 sessions use IndexedDB database `kb2.training.sessions`, schema version 1, object store `sessions` keyed by session UUID and indexed by `workoutId`. The formerly reserved localStorage key `kb2.sessions.v1` remains untouched. Sessions contain identity/version, a deep definition snapshot and actual results. Editing a workout or weekly assignment never rewrites completed history.

Prototype keys (`kbwod_history`, `kbwod_weight_*`) and auth storage are never read, changed or deleted. Old code remains recoverable in Git history. No migration or remote request is performed.

## GitHub Pages and PWA

All application assets use relative URLs; hash navigation needs no server fallback. The root directory can be served by GitHub Pages without a build, but this change does not configure deployment or publish anything.

The worker precaches the static application, including every imported module. It intercepts only known same-origin static URLs, not API requests. It removes only older `kb2-static-*` caches, leaves prototype caches/storage untouched, and waits for existing tabs to close before activation. Increment the cache version and update the complete module list when shipping changed assets. First use requires an online load; offline use requires successful installation and a subsequent controlled page load. Existing prototype workers and installed clients require manual upgrade testing before any future production release. Existing PNG icons are retained provisionally.

## Remaining validation

Automated coverage uses Chromium at mobile and desktop sizes, including widths 320–1280. Manual Safari/iOS and Android installation, accessibility/assistive technology, real device safe areas and upgrades from older production workers remain pending. No production deployment or merge is authorized by this phase.

## Legacy workout timer (Focus v1 and Hybrid)

Start Workout explicitly creates an in-memory session. A direct active-screen URL shows a ready screen and never autostarts. The initial 3, 2, 1 countdown lasts 3 seconds outside the workout; GO appears at the start of the first EMOM minute. Upper runs ten 60-second minutes, then immediately enters ABS at workout 10:00. ABS runs ten 40-second WORK / 20-second REST intervals; completion occurs at 20:00 after the final rest. The immutable Focus 001 version 1 definition is unchanged.

`compileWorkout` derives segments, exercise order and round positions from `phases`, `exerciseIds` and `timer`. It validates phase/workout durations and supports EMOM, work/rest intervals and continuous AMRAP blocks; future formats add a compiler branch. `WorkoutTimer` accepts an injected monotonic clock (default `performance.now`), never counts visual ticks, and excludes paused time. The UI samples every 100 ms; elapsed position and block changes remain correct after delayed callbacks. The paused screen freezes both countdown and workout time, and stops its visual ticker. Completion clears the visual ticker; leaving the session clears timers and audio. Visibility/pageshow refresh the position without adding time or replaying a backlog of sound cues.

Start Workout attempts to enable Web Audio synchronously within its user gesture. Sound On/Off remains available; blocked or missing audio leaves it Off without affecting the timer. Optional cues identify start, the last three seconds of each timed segment, elapsed full minutes, segment/exercise changes and completion. One cue is chosen per update: completion takes precedence over minute, then block/exercise change, then countdown ticks. At 10:00 the minute cue replaces the simultaneous block/exercise cue; at 20:00 only completion sounds. Paused/resumed updates do not repeat cues, and hidden or delayed updates consume missed events without replaying a backlog. Unsupported or blocked audio does not stop the workout. No remote audio asset or vibration dependency is used. Local sample playback is interrupted by a subsequent cue, mute or pause to avoid overlapping signals.

End Workout and in-app departure request confirmation, including while paused or counting down. Hash/Back navigation is guarded and cancelled navigation keeps the same live controller. Reload/close uses the browser's standard beforeunload warning where supported. No active progress is persisted: confirmed reloads, browser process termination or OS eviction lose it. Mobile browsers may suspend audio and callbacks or stop advancing their monotonic clock during device sleep; this is not a promise of continuous execution with a locked screen. Real iOS/Android lock/resume behavior and audible cues need device testing. Pausing before locking is recommended.

Tests use injected clocks and Playwright's simulated clock: no real 20-minute wait is required. They cover every minute/interval boundary, 3-second lead-in, final rest, immediate block transition, pause/resume, late updates, direct-link safety, exit cancellation, missing audio, responsive layouts and offline completion under the project subpath. Demo/library/planning regression tests remain enabled.

## Exercise weight preferences

Workout Detail shows an optional Weight (kg) input beside each exercise. Empty means unspecified, zero is a valid value and nonnegative decimal values are accepted; no default or mandatory load is imposed. Inputs save immediately on valid edits. Clearing a field removes that preference. Invalid input never replaces a previously saved valid value; storage failures are shown in the field. Unreadable/corrupt stored values are preserved and the affected input is disabled rather than silently replacing them.

Each value has its own key: `kb2.weight-preference.v1:<encoded workout ID>:<version>:<encoded exercise ID>`. The active screen uses the same field component and storage key for its current exercise, including repeated rounds. Values are training preferences, not historical/session results, and do not modify the catalog or weekly plan. Existing prototype data and reserved result storage remain untouched. Preferences depend on the browser/origin and are not a backup; simultaneous edits to the same exercise in different tabs are last-write-wins. No Supabase is implemented. Only Focus v2 currently saves session results, separately in IndexedDB.

## KB Hybrid 001 — Strength & Sweat

`src/data/hybrid-001-strength-sweat.js` defines immutable version 1 independently of Focus 001: 8-minute alternating EMOM (four cycles of two movements), 8 minutes of 40/20 conditioning (two rounds of four movements, including the final rest), then a continuous 4-minute AMRAP circuit. Only one initial 3-second countdown is used; transitions at 08:00 and 16:00 add no pauses and completion remains at 20:00.

AMRAP compiles to one timeline segment containing all circuit exercises. There are no invented per-exercise timers, automatic exercise advances, rest intervals or round counts. The active screen shows the full ordered circuit, rep targets and existing weight-preference fields. Weekly assignment is manual, including reuse on Monday and Friday. Future result descriptors are metadata only; no session or performance result is collected.

## Original custom audio

The user-provided `assets/audio/start.wav` and `assets/audio/minute.wav` are included without altering their bytes. Format, duration and SHA-256 fingerprints are documented in `assets/audio/README.md`. Local preloading, gesture-based Web Audio unlocking, per-context decoding and single-voice playback use the originals. Start plays once at the end of the 3-second countdown, minute at elapsed 01:00–19:00, and only the existing completion signal plays at 20:00. Muting/pausing stops current playback; missed signals are not queued. Missing, corrupt or not-yet-ready samples use the synthesized fallback without changing time or replaying later.

The PWA cache is `kb2-static-v7`. Both WAVs are mandatory precache assets, alongside the application modules, to ensure a successfully installed version has offline audio. The waiting-worker lifecycle and cleanup limited to old `kb2-static-*` caches remain unchanged. New Focus v2 modules are included; general navigation and the visual design remain unchanged.

New browser tests decode the actual PCM files, invoke native buffer-source playback and render the decoded audio through OfflineAudioContext to verify non-silent output. They check one start, 19 minute samples, completion priority, no overlap, pause/mute and offline playback under `/kb-wod/`, plus fallback for corrupt WAV responses. Existing timer, Hybrid, Focus, weights and planning tests remain enabled. Native playback scheduling is automated; speaker audibility and mobile hardware/autoplay/lock behavior still require device validation.

## Focus 001 version 2 — results and recovery

Focus v2 uses ten 40-second WORK / 20-second REST intervals in each block, preserving exercise order and rep targets. Upper begins after a 3-second lead-in. At 10:00 it stops completely and opens Upper Results; no ticker runs and no stale cues accumulate while filling the form. Continue to ABS validates and commits the draft before starting a new 3-second countdown and the ABS block. There is no second start.wav. ABS ends after its final rest at 20:00 active time, sounds the existing completion cue and opens ABS Results. The block timer begins at 10:00; lead-ins, pauses and result-form time are excluded from `activeDurationMs`.

A short 620 Hz beep marks each second-40 REST boundary for v2 only. minute.wav marks active minutes 1–19, including Upper minute 10. Completion wins at minute 20. Existing cue precedence, mute control, foreground catch-up and single-voice playback remain. Hybrid and v1 continue using the same previous timelines and sounds.

Upper records optional load and actual Round 1/2 counts per exercise. Unilateral targets explain repetitions per arm when both arms match; differences can be written in Workout notes. ABS records optional load and 0/1/2 correctly completed intervals per exercise, optional integer effort 1–10 and notes. No counts or effort are inferred from elapsed time. Blank numeric values are stored as null; explicit zero remains zero. Upper results can be reviewed and corrected from ABS Results before saving.

Session weights are initially prefilled from the current v2 preferences. If absent, existing v1 preferences are read as a fallback; neither preference version is migrated or overwritten by result forms. Actual session loads are separate values. Definition snapshots and completed records remain independent of catalog/preferences.

### IndexedDB lifecycle

- A UUID is generated once and an initial draft must commit before any training starts. An unavailable database blocks starting with a retryable error.
- Drafts include schemaVersion, workoutId/workoutVersion, workoutSnapshot, startedAt/completedAt, activeDurationMs, status, stage, blockIndex, checkpointMs, completedBlocks, sound/initial-start flags, raw form entries and validated final results. `completedAt` marks the end of ABS; `savedAt` marks successful final commit.
- Form inputs enqueue ordered draft writes immediately, including invalid/incomplete values so they can be corrected after recovery. The UI says Draft saved locally only when queued writes have completed. Upper is recoverably checkpointed before ABS can start.
- Reloading the session's draft URL restores a result form automatically. Workout Detail also exposes Resume draft actions. Active checkpoints are saved roughly every second and on explicit pause/departure; reload restores the latest committed position **paused**, requiring Resume. Time away is excluded and old cues are never replayed.
- Sudden browser/OS termination may lose uncommitted inputs or the newest active checkpoint. Beforeunload warnings are best-effort; browser storage can also be evicted. IndexedDB is local persistence, not a backup.
- Save Workout validates all blocks, disables editing while saving, and commits the same UUID in a read/write transaction. Confirmation appears only after transaction completion. Repeated saves return the existing completed record; later autosaves cannot overwrite it. Failed commits keep inputs and allow retry without creating another session.
- Saved sessions can be opened from View saved sessions in Focus v2 detail or directly after saving. The basic history renders the stored snapshot and results; there are no graphs or remote sync. Draft writes in separate tabs are last-write-wins until completion; completed records are protected.

Automated tests exercise exact block boundaries and sounds, a long stopped result-form period, the second countdown without a second start.wav, numeric validation, null versus zero, per-round/session loads, reload recovery, paused checkpoint restoration, duplicate-save prevention, transaction failure/retry, offline history and unchanged legacy assignments/Hybrid/v1 execution. Mobile/desktop Chromium is covered; Safari/iOS/Android and eviction/lock behavior still require device checks.
