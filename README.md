# KB 2.0 — Foundation

A mobile-first static application built with HTML, CSS and native JavaScript ES modules. No runtime framework, CDN or build step. Supabase is optional; local training needs no backend. This branch replaces the experimental prototype; it does not migrate its data or Supabase integration.

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
- `src/ui`: reusable views, legacy active controller, shared Focus v2 / Hybrid v2 block/results flow and basic saved-session history; content is inserted as text.
- `src/platform`: optional Web Audio cues generated locally, with failure isolation.
- `src/main.js`: hash routing, event orchestration, storage synchronization, service-worker registration.
- `styles/app.css`: mobile-first styling and fixed bottom navigation.
- `tests`: unit and browser integration tests.
- `manifest.webmanifest`, `service-worker.js`: relative PWA paths and static-only offline cache.

## Scope

Today has seven fixed Monday–Sunday slots. Add/change opens Library in assignment mode; cancel makes no change. The same workout may occupy multiple days. There is no automatic weekly rollover or scheduling. Library supports case-insensitive name search and the Hybrid/Focus type registry. The three sample cards remain explicitly marked **Demo** and originate only in `demo-workouts.js`. The real **KB Focus 001 — Upper Body + ABS** retains immutable version 1 (`focus-001-upper-abs.js`, Upper EMOM + ABS intervals). The current Library option is immutable version 2 (`focus-001-v2.js`), with two independent 10-minute 40/20 blocks and results between them. Version 1 remains available through existing weekly assignments and direct versioned URLs. No assignment is upgraded automatically; warm-up remains separate. Tuesday is a recommendation only and never changes assignments automatically.

Stats and Dashboard retain empty states. Focus v2 supports Upper → Upper Results → explicit Continue to ABS → ABS → ABS Results → explicit Save Workout, with a basic local history. Focus v1, Hybrid v1 and the three Demo cards retain their previous execution/scaffold behavior. Advanced statistics remain out of scope. Optional authentication/cloud setup is documented below.

## Data contracts

A workout definition has `id`, positive integer `version`, `name`, `type`, optional `image`, `exercises`, `phases`, `resultFields`, `demo`, and `archived`. The real Focus definition uses exercise IDs with rep/cycle targets, ordered phase references, EMOM/interval timer configuration and future result field descriptors. Empty arrays on the Demo definitions mean **undefined**, not a ready-to-run workout. Exercise targets specify `min`, `max` and `unit`; no completed values or fixed loads are supplied. Future result descriptors cover EMOM minutes, per-exercise/per-round loads and repetitions, modifications, shoulder discomfort, technically correct ABS intervals and perceived exertion 1–10. These descriptors do not collect or persist results.

Identity is the `(id, version)` pair. Do not edit a used version in place: append a new definition. Archive definitions without deleting versions referenced by assignments or sessions. The current catalog has no authoring UI.

Weekly assignments are a separate `{ Monday: {workoutId, version} | null, ... }` mapping stored at `kb2.weekly-plan.v1`. An unavailable definition remains assigned until manually changed. Invalid storage is preserved and planning is disabled rather than silently overwriting it. Write failures are surfaced. Storage events refresh another open tab; simultaneous writes are not transactional and can still race. Local storage is not a backup.

Focus v2 and Hybrid v2 sessions use IndexedDB database `kb2.training.sessions`, schema version 1, object store `sessions` keyed by session UUID and indexed by `workoutId`. The formerly reserved localStorage key `kb2.sessions.v1` remains untouched. Sessions contain identity/version, a deep definition snapshot and actual results. Editing a workout or weekly assignment never rewrites completed history.

Prototype keys (`kbwod_history`, `kbwod_weight_*`) and auth storage are never read, changed or deleted. Old code remains recoverable in Git history. No prototype-data migration is performed; only explicitly configured cloud Auth and data synchronization make remote requests.

## GitHub Pages and PWA

All application assets use relative URLs; hash navigation needs no server fallback. The root directory can be served by GitHub Pages without a build, but this change does not configure deployment or publish anything.

The worker precaches the static application, including every imported module. It intercepts only known same-origin static URLs, not API requests. It removes only older `kb2-static-*` caches, leaves prototype caches/storage untouched, and waits for existing tabs to close before activation. Increment the cache version and update the complete module list when shipping changed assets. First use requires an online load; offline use requires successful installation and a subsequent controlled page load. Existing prototype workers and installed clients require manual upgrade testing before any future production release. Existing PNG icons are retained provisionally.

## Remaining validation

Automated coverage uses Chromium at mobile and desktop sizes, including widths 320–1280. Manual Safari/iOS and Android installation, accessibility/assistive technology, real device safe areas and upgrades from older production workers remain pending. No production deployment or merge is authorized by this phase.

## Legacy workout timer (Focus v1 and Hybrid v1)

Start Workout explicitly creates an in-memory session. A direct active-screen URL shows a ready screen and never autostarts. The initial 3, 2, 1 countdown lasts 3 seconds outside the workout; GO appears at the start of the first EMOM minute. Upper runs ten 60-second minutes, then immediately enters ABS at workout 10:00. ABS runs ten 40-second WORK / 20-second REST intervals; completion occurs at 20:00 after the final rest. The immutable Focus 001 version 1 definition is unchanged.

`compileWorkout` derives segments, exercise order and round positions from `phases`, `exerciseIds` and `timer`. It validates phase/workout durations and supports EMOM, work/rest intervals and continuous AMRAP blocks; future formats add a compiler branch. `WorkoutTimer` accepts an injected monotonic clock (default `performance.now`), never counts visual ticks, and excludes paused time. The UI samples every 100 ms; elapsed position and block changes remain correct after delayed callbacks. The paused screen freezes both countdown and workout time, and stops its visual ticker. Completion clears the visual ticker; leaving the session clears timers and audio. Visibility/pageshow refresh the position without adding time or replaying a backlog of sound cues.

Start Workout attempts to enable Web Audio synchronously within its user gesture. Sound On/Off, pause/resume and restoration remain available. Every controller selects at most one format-specific pattern per event; muted/hidden/late events are consumed without replay. Audio failure does not stop the clock. See the synthesized signal policy below.

End Workout and in-app departure request confirmation, including while paused or counting down. Hash/Back navigation is guarded and cancelled navigation keeps the same live controller. Reload/close uses the browser's standard beforeunload warning where supported. No active progress is persisted: confirmed reloads, browser process termination or OS eviction lose it. Mobile browsers may suspend audio and callbacks or stop advancing their monotonic clock during device sleep; this is not a promise of continuous execution with a locked screen. Real iOS/Android lock/resume behavior and audible cues need device testing. Pausing before locking is recommended.

Tests use injected clocks and Playwright's simulated clock: no real 20-minute wait is required. They cover every minute/interval boundary, 3-second lead-in, final rest, immediate block transition, pause/resume, late updates, direct-link safety, exit cancellation, missing audio, responsive layouts and offline completion under the project subpath. Demo/library/planning regression tests remain enabled.

## Exercise weight preferences

Workout Detail shows an optional Weight (kg) input beside each exercise. Empty means unspecified, zero is a valid value and nonnegative decimal values are accepted; no default or mandatory load is imposed. Inputs save immediately on valid edits. Clearing a field removes that preference. Invalid input never replaces a previously saved valid value; storage failures are shown in the field. Unreadable/corrupt stored values are preserved and the affected input is disabled rather than silently replacing them.

Each value has its own key: `kb2.weight-preference.v1:<encoded workout ID>:<version>:<encoded exercise ID>`. The active screen uses the same field component and storage key for its current exercise, including repeated rounds. Values are training preferences, not historical/session results, and do not modify the catalog or weekly plan. Existing prototype data and reserved result storage remain untouched. Preferences depend on the browser/origin and are not a backup; simultaneous edits to the same exercise in different tabs are last-write-wins. Optional Supabase synchronization is documented below; weight preferences remain device-local. Focus v2 and Hybrid v2 save session results, separately in IndexedDB.

## KB Hybrid 001 — Strength & Sweat

`src/data/hybrid-001-strength-sweat.js` defines immutable version 1 independently of Focus 001: 8-minute alternating EMOM (four cycles of two movements), 8 minutes of 40/20 conditioning (two rounds of four movements, including the final rest), then a continuous 4-minute AMRAP circuit. Only one initial 3-second countdown is used; transitions at 08:00 and 16:00 add no pauses and completion remains at 20:00.

AMRAP compiles to one timeline segment containing all circuit exercises. There are no invented per-exercise timers, automatic exercise advances, rest intervals or round counts. The active screen shows the full ordered circuit, rep targets and existing weight-preference fields. Weekly assignment is manual, including reuse on Monday and Friday. Future result descriptors are metadata only; no session or performance result is collected.

## Clear synthesized timer audio

All workout controllers share six Web Audio patterns: START (one medium beep), MINUTE (one short beep for an EMOM change), REST (two short beeps), WORK (one strong higher beep), FINISHER (two short then one longer beep for the final KB Thruster minute), and COMPLETE (two longer beeps). Visual countdowns remain; no countdown ticks or independent elapsed-minute alarms play. REST/WORK cannot coincide with MINUTE. Five-second transitions are silent until one clear next-block cue. Stopped result forms are silent; later block lead-ins use WORK, not another START.

Sine tones use short attack/release envelopes, bounded gain, silent sub-note gaps and cancellable single-pattern scheduling. Pause/mute/exit cancel pending notes; foreground recovery skips missed events. Browser audio unlocking and graceful failure remain independent of the workout clock. Historical `assets/audio/start.wav` and `minute.wav` remain byte-for-byte unchanged but are no longer played. The static cache is `kb2-static-v17`; no new sound asset or runtime library is required. See [patterns, timing, tests and device limits](docs/TIMER_AUDIO.md).

## Focus 001 version 2 — results and recovery

Focus v2 uses ten 40-second WORK / 20-second REST intervals in each block, preserving exercise order and rep targets. Upper begins after a 3-second lead-in. At 10:00 it stops completely and opens Upper Results; no ticker runs and no stale cues accumulate while filling the form. Continue to ABS validates and commits the draft before starting a new 3-second countdown and the ABS block. There is no second START signal. ABS ends after its final rest at 20:00 active time, sounds the existing completion cue and opens ABS Results. The block timer begins at 10:00; lead-ins, pauses and result-form time are excluded from `activeDurationMs`.

All interval blocks use the shared double REST and single higher WORK patterns. Intermediate result forms remain silent and subsequent lead-ins use WORK, with no repeated initial START. Timelines, durations, stored results and historical version references are unchanged.

Upper records optional load and actual Round 1/2 counts per exercise. Unilateral targets explain repetitions per arm when both arms match; differences can be written in Workout notes. ABS records optional load and 0/1/2 correctly completed intervals per exercise, optional integer effort 1–10 and notes. No counts or effort are inferred from elapsed time. Blank numeric values are stored as null; explicit zero remains zero. Upper results can be reviewed and corrected from ABS Results before saving.

Session weights are initially prefilled from the current v2 preferences. If absent, existing v1 preferences are read as a fallback; neither preference version is migrated or overwritten by result forms. Actual session loads are separate values. Definition snapshots and completed records remain independent of catalog/preferences.

### IndexedDB lifecycle

- A UUID is generated once and an initial draft must commit before any training starts. An unavailable database blocks starting with a retryable error.
- Drafts include schemaVersion, workoutId/workoutVersion, workoutSnapshot, startedAt/completedAt, activeDurationMs, status, stage, blockIndex, checkpointMs, completedBlocks, sound/initial-start flags, raw form entries and validated final results. `completedAt` marks the end of the final active block; `savedAt` marks successful final commit.
- Form inputs enqueue ordered draft writes immediately, including invalid/incomplete values so they can be corrected after recovery. The UI says Draft saved locally only when queued writes have completed. Upper is recoverably checkpointed before ABS can start.
- Reloading the session's draft URL restores a result form automatically. Workout Detail also exposes Resume draft actions. Active checkpoints are saved roughly every second and on explicit pause/departure; reload restores the latest committed position **paused**, requiring Resume. Time away is excluded and old cues are never replayed.
- Sudden browser/OS termination may lose uncommitted inputs or the newest active checkpoint. Beforeunload warnings are best-effort; browser storage can also be evicted. IndexedDB is local persistence, not a backup.
- Save Workout validates all blocks, disables editing while saving, and commits the same UUID in a read/write transaction. Confirmation appears only after transaction completion. Repeated saves return the existing completed record; later autosaves cannot overwrite it. Failed commits keep inputs and allow retry without creating another session.
- Saved sessions can be opened from View saved sessions in Focus v2 or Hybrid v2 detail or directly after saving. The basic history renders the stored snapshot and results; there are no graphs or remote sync. Draft writes in separate tabs are last-write-wins until completion; completed records are protected.

Automated tests exercise exact block boundaries and sounds, a long stopped result-form period, the second countdown without a second START signal, numeric validation, null versus zero, per-round/session loads, reload recovery, paused checkpoint restoration, duplicate-save prevention, transaction failure/retry, offline history and unchanged legacy assignments/Hybrid/v1 execution. Mobile/desktop Chromium is covered; Safari/iOS/Android and eviction/lock behavior still require device checks.

## Hybrid 001 version 2 — three-block results

Library selects immutable Hybrid v2 (`src/data/hybrid-001-v2.js`). Its nine movements, targets and 8-minute EMOM / 8-minute 40/20 / 4-minute continuous AMRAP phases are identical to v1. Existing v1 assignments and versioned links remain unchanged. Strength Results and Conditioning Results stop all training time and scheduled cues. Explicit Continue to Conditioning / Continue to Finisher commits the draft before a new three-second lead-in. Finisher Results requires explicit Save Workout. Only active block time counts toward 20 minutes; offsets are calculated from phase durations, not assumed equal.

`src/ui/block-training.js` and `block-result-form.js` share the lifecycle and presentation with Focus v2. `src/domain/result-schemas.js` dispatches separate Focus and Hybrid validators; the old Focus UI module paths remain compatibility exports. The IndexedDB schema and transaction implementation are unchanged. All three active stages restore paused; all three result forms restore their entries. Earlier block results can be reviewed before saving.

Strength stores optional actual kg and four actual counts per exercise, with per-side guidance for the unilateral combination. Conditioning stores optional kg and integer correctly completed intervals from 0 to 2. Finisher stores optional integer full rounds and independent additional partial counts bounded by each target: 0–6 thrusters, 0–8 wood choppers, 0–6 lateral-lunge/curl combinations, plus optional kg per exercise, effort 1–10 and notes. Counts are never inferred or converted automatically. Empty fields persist as null; explicit zero persists as zero.

Hybrid results use keys `strength` (exercise records with four-element `rounds`), `conditioning` (exercise records with `intervalsCompleted`) and `combo-finisher` (`fullRounds` and exercise records with `partialReps`), alongside `perceivedEffort` and `notes`. Snapshot-based history renders each format with its correct labels. Initial weights read v2 preferences with read-only v1 fallback. Subsequent transitions preserve actual session values, and results never write preferences or older sessions.

Hybrid uses the shared START, EMOM MINUTE, interval REST/WORK and final COMPLETE patterns. A continuous circuit starts with one WORK cue and has no per-exercise or elapsed-minute alarms. Result-form dwell time stays silent and excluded; recovery, saving, preference preservation and history tests remain enabled.

## Focus 002 and Hybrid 002 — continuous training with final results

`focus-002-lower-abs.js` exports `focus002LowerAbs` (new workout ID `focus-002-lower-abs`, version 1, suggested Thursday). `hybrid-002-full-body-engine.js` exports `hybrid002FullBodyEngine` (new ID `hybrid-002-full-body-engine`, version 1, suggested Friday). These identities are independent of the existing `focus002` and `hybrid002` exports for workout 001 version 2. Both appear alongside the current 001 versions and the three Demo cards. Suggested days never assign or replace a plan automatically.

Both use `execution.mode: continuous-results`: one initial three-second countdown, automatic transitions and results only after 20 active minutes. Focus 002 is ten EMOM minutes (five LEGS movements, two rounds), then ten 40/20 ABS intervals. Hybrid 002 is eight EMOM minutes (two movements, four rounds), eight 40/20 conditioning intervals and a four-minute continuous three-movement AMRAP. Side changes are instructions, never extra timer segments. Push-Ups in the finisher require no kettlebell. Existing workout definitions and the monotonic timer engine are unchanged.

The shared controller runs the complete timeline for continuous mode, checkpoints total elapsed position and derives the current block and remaining block/total time. Recovery pauses at the committed position and excludes time away, including recovery in later phases. It does not insert block result screens or further countdowns. Existing Focus 001 v2 and Hybrid 001 v2 retain their independent block/results flows.

The final Workout Results form shows all blocks together and reuses existing numeric inputs, validation, explicit/idempotent Save Workout and snapshot-based history. Focus records actual kg and two round counts per LEGS exercise, 0–2 correctly completed intervals per ABS exercise, optional effort 1–10 and notes (including left/right differences). Hybrid records four Strength counts, Conditioning intervals and Finisher full rounds plus independent partial repetitions bounded by 6 Cleans, 6 Push-Ups and 8 Goblet Squats. Empty numeric fields are null; measured zero stays zero. No results are inferred from time. Optional actual loads are prefilled once from preferences specific to the new workout/version and never write back to those preferences.

`src/domain/continuous-results.js` derives result schemas from the immutable phases; IndexedDB database/store/schema and final-save transaction implementation are reused unchanged. Completed old sessions and draft formats remain untouched. The PWA cache is now `kb2-static-v17`, including both definitions and the continuous result module. Audio signals use the shared synthesized policy: START, MINUTE only during EMOM changes, double REST/single WORK in interval phases, and COMPLETE at the true workout end. Pause, mute, single-voice playback and stale-event suppression remain shared.

Tests cover ordered movements/targets, durations and rounds, continuous phase/audio boundaries, full-circuit AMRAP, all active-phase recovery positions, final-form recovery, validation, null/zero, preference isolation, preservation of existing Focus/Hybrid drafts and completed history, offline save/read, duplicate saving, assignments and responsive widths 320–1280. Real iOS/Android audio, installation, lock/suspend and storage eviction remain manual checks. No Supabase, statistics, dashboard, deployment or merge is introduced.

## Supabase Auth and local-first cloud synchronization

Optional email/password Auth, verification and password recovery use native fetch against the **existing KB WODS** project. Public connection settings for the existing KB WODS project are in `src/cloud/config.js`; project Auth and SQL activation remain manual as documented. Account and sync controls coexist with local workouts; no new runtime library is required. See [setup, SQL migration, data isolation and testing instructions](docs/SUPABASE.md).

Completed sessions commit locally first and retry owner-scoped idempotent upserts; unclaimed history requires an email/count import confirmation. Drafts remain local. Weekly plans preserve the original format, retain account/guest snapshots and require a choice when local/cloud plans differ. Existing workouts, timers, audio and original versions are unchanged. The cache is `kb2-static-v17`, containing all new static modules; Auth/API responses and tokens are never cached by the service worker. This adds cloud persistence and basic saved-session readback, not Stats/Dashboard analytics. No production SQL, configuration, deployment or merge is performed.

## Monday Paranoid v1 — preserved HM/KB card release

`src/data/monday-paranoid.js` preserves the released immutable `mondayParanoid` identity (`monday-paranoid`, version 1, code KB Monday Paranoid), suggested Monday. It copies the approved Hybrid 001 v2 definition into an independent snapshot: 8-minute alternating EMOM / Strength Results / Continue to Conditioning / 8-minute 40/20 / Conditioning Results / Continue to Finisher / 4-minute continuous AMRAP / Finisher Results / explicit Save Workout. All nine movements, targets, four Strength rounds, Conditioning interval limits and Finisher partial limits remain identical to the source. No timer, result validator, Auth, sync or database implementation changes are required.

The new ID appears alongside all existing workouts in Library, case-insensitive search, Hybrid filtering and manual Today assignments. Suggested Monday never changes a plan; the workout can be selected for any weekday, including today. Preferences, drafts, UUIDs and history remain keyed to the new ID/version. The optional Hybrid weight fallback is deliberately skipped: Monday starts with unspecified loads and uses independent, freely clearable preferences, without reading, migrating or overwriting another WOD's loads. Actual session results remain separate from preferences.

Only this workout's `presentation.cardStyle: hm-kb`, guarded by its exact identity in the shared card component, opts into `.workout-card--monday-paranoid`. Library and Today reuse the same card. The dark textured base, silver/high-contrast italic title, hard border, muted red accents and HM/KB micro-mark use CSS and available system fonts only. The normal detail/results screens and all other cards retain their established styles. There are no external fonts, new images, animation or global theme changes; keyboard focus and forced-color styling remain available.

The PWA precache is `kb2-static-v17` and includes the new definition. Tests cover identity/definition parity, independent weights, search/filter/manual assignment, responsive card and focus behavior, all block/results transitions and audio counts, offline draft recovery/save/history, preservation of existing sessions and confirmed cloud synchronization of the new workout/session IDs using an HTTP mock. Existing WOD/audio/Auth/planning regressions remain enabled. No merge, deployment or production SQL is performed.

## Monday Paranoid v2 — preserved 20-minute programming

`src/data/monday-paranoid-v2.js` exports `mondayParanoidV2`, retaining workout ID `monday-paranoid` and adding immutable version 2. V2 remains available through its versioned URLs and stored references; current Library selection is v3 as documented below. Existing v1/v2 assignments remain unchanged until manually reassigned. No assignment, draft, historical result or cloud record is migrated automatically. The released v1 definition and its 8+8+4 block/results flow remain intact and directly addressable.

The corrected program is **8-minute Upper EMOM** (four exercises twice), **6-minute ABS 40/20** (three exercises twice), then **6-minute Legs EMOM** (three exercises twice). It reuses the continuous-results controller and monotonic timer already used by Focus 002/Hybrid 002: one initial three-second countdown, automatic transitions at active minutes 8 and 14, and one Workout Results screen after exactly 20 active minutes. Upper order is Push Press 4–6 per side, Offset Push-Up 6–8, Staggered-Stance Row 7–8 per side, Overhead Triceps Extension 7–8. ABS is Dead Bug + Chest Press, Standing Wood Chop, Kick-Through, each timed without invented repetition targets. Legs is Front Rack Squat 6–8, Swing 12–15, Step-Up 5 per side.

The final form records optional actual kg and two round counts for each Upper/Legs movement, actual kg and 0–2 correctly completed intervals for ABS, optional effort 1–10 and notes. Per-side guidance is retained. Blank numeric fields stay null; explicit zero remains a measured value, and no performance result is inferred from elapsed time. There are no AMRAP/finisher fields in v2 results. Initial countdowns, pauses and form time remain outside active duration. The shared synthesized policy supplies START once, format-specific EMOM/interval signals, one next-block WORK cue, and COMPLETE at the true end.

V2 starts with fresh exercise preferences: its ten movement IDs differ from the v1 programming, and no mapping or migration of v1 loads is introduced. Each preference remains keyed by workout ID, version and exercise ID; session actual loads never overwrite preferences or older snapshots. Existing IndexedDB transactions, pending-sync queue, import/ownership checks, saved-session history and Supabase schema are reused unchanged. Cloud upserts explicitly carry `workout_version: 2`; historical v1 snapshots retain their original fields and renderer.

The existing HM/KB presentation metadata is retained exactly, so both versions use the same scoped card treatment in Library/Today without CSS or global theme changes. Static cache `kb2-static-v17` includes both definition modules and their dependencies, preserving offline access to v1 and v2. Tests cover approved exercise order/targets, 8/6/6 timings and EMOM rounds, timed ABS, all active-phase recoveries, automatic transitions/audio, final numeric validation/null/zero, offline save/readback, unchanged v1 history/drafts/preferences, explicit reassignment, mocked cloud sync for both versions and mobile card layout. No production SQL, merge or deployment is performed.

## Monday Paranoid v3 — finisher and session-specific weights

Current `monday-paranoid` version 3 keeps all ten approved v2 movements/targets and adds two automatic five-second transitions plus a single 60-second KB Thruster finisher. The continuous clock is **8:00 + 0:05 + 6:00 + 0:05 + 6:00 + 1:00 = 21:10**, excluding the initial countdown and pauses. The existing engine now compiles explicit transition and single-exercise AMRAP-repetition segments; previous workout definitions and timing are unchanged; current audio signals follow the shared synthesized policy.

V3 snapshots and autosaves all eleven working weights during training, including edits and recovery. Missing own preferences may prefill matching v2 loads read-only; clearing v3 explicitly keeps it blank. Its final form is only an editable weight summary, Thruster repetitions, optional effort and notes. Completed results use `exerciseWeights` plus a finisher count, with blank/null distinct from zero and no duplicate Thruster weight or per-round performance fields. Existing IndexedDB/Supabase JSONB persistence and confirmed-sync status are reused without SQL changes. Both historical versions remain readable with their original snapshots and schemas.

The original HM/KB experiment was scoped to Monday Paranoid; the Tuesday release below introduces shared HM/KB presentation. All versions remain cached in `kb2-static-v17`. See [v3 timeline, result contract, preference semantics and limits](docs/MONDAY_PARANOID_V3.md). No merge or deployment is performed.

## Tuesday of Spades v1 and shared HM/KB cards

Tuesday (`tuesday-of-spades`, version 1) is a new manually assigned Hybrid: 8 minutes alternating Renegade Row / Swing EMOM, 8 minutes of four 40/20 movements repeated twice, then a four-minute 8 Thruster / 8 Hollow-Up / 10 Jump-Squat AMRAP. It runs continuously for exactly 20:00, excluding the initial countdown, with no inserted transitions or intermediate forms. The AMRAP begins with the existing FINISHER pattern; other approved synthesized patterns remain unchanged.

Its dedicated `tuesday-weights-rounds-v1` schema snapshots seven kettlebell weights into the local session draft. Bodyweight movements have no kg inputs. Final results contain only `exerciseWeights` and `finisher.fullRounds`, with blank/null distinct from zero. Existing owner sync uploads the unchanged session envelope and JSONB results without SQL changes. Monday's schema, all released programming and existing data remain unchanged.

Reusable HM/KB styling now applies to Library/Today cards and real workout overviews, replacing the ID-specific Monday CSS. The supplied reference informs the dark palette, bold titles, left/right exercise rows, proportional phase bars and purple recording panel. Compact cards omit the exercise breakdown. Demo cards share the dark palette, remain clearly marked and are never approved. Detailed views preserve editable weight preferences and provide expandable instructions and goals; account screens and active training retain their existing styles.

See [Tuesday programming, persistence, visual comparison and verification](docs/TUESDAY_OF_SPADES.md). Offline cache `kb2-static-v17` includes all four new runtime modules. No build step or additional dependency is needed. No merge, deployment or production SQL is performed.

## Thursday Bells v1

Thursday (`thursday-bells`, version 1) is a new approved Hybrid with lower-body priority. It reuses the shared HM/KB cards, session weights and continuous timer: Upper 6:00, automatic rest 0:05, ABS 6:00 (40/20 including the last rest), automatic rest 0:05, Legs 8:00, then Hell's Finisher 1:00. Total **21:10**, excluding countdown, warm-up and cooldown. Assignment is manual; existing Thursday selections are never replaced automatically.

The new opt-in `timed-sides` phase compiles into two halves on the same monotonic timer. Hold the KB in the RIGHT hand from 20:10 to 20:40, then LEFT from 20:40 to 21:10. The current holding side and half's remaining time are visible, alongside whole-block/whole-workout remaining time. FINISHER plays only at entry, WORK at the midpoint, COMPLETE at the end, with existing mute/pause/unlock/background suppression and unchanged synthesized patterns.

Dedicated schema `thursday-weights-steps-v1` stores eleven session weights and one optional nonnegative integer total of controlled marching steps. One knee lift equals one step; there are no round/interval counts, per-side result fields, effort or notes. Weights are recorded in drafts independently of future preferences, including when a preference write fails. Local save/history and owner-scoped JSONB cloud sync reuse existing storage without SQL changes. Monday and Tuesday schemas/programming are preserved.

Cache `kb2-static-v17` includes the new definition, result module, result-form wrapper and shared two-group form module. The shared form extraction preserves Tuesday's labels and contract. The existing card styling is retained; its phase heading can wrap to fit long labels on narrow screens. See [Thursday timeline, schema and verification](docs/THURSDAY_BELLS.md). No merge, deployment or production SQL.

## Friday To Black v1

Friday (`friday-to-black`, version 1, code `HM/KB Friday`) is a new approved Hybrid using the existing HM/KB cards, timer and audio: Strength 8:00 EMOM (Alternating Floor Press 5–6/arm and Sumo Deadlift 8–10, four rounds), Conditioning 8:00 (four movements twice, 40/20 including final rest), then a four-minute 6 Goblet Squat + Curl / 20 Mountain Climber / 6 Burpee AMRAP. Exactly **20:00**, excluding countdown, warm-up and cooldown; no extra transitions or intermediate forms. Users assign it manually without replacing existing plans automatically.

Dedicated `friday-weights-floorpress-rounds-v1` results contain seven session weights, optional independent left/right Floor Press repetitions from the final (fourth) Floor Press working set at 06:00–07:00, and complete finisher rounds. Bodyweight movements have no kg fields. Counts begin blank and are never filled from targets or summed across rounds/arms. There are no partial-round counts, effort or notes. Final corrections change the session only; draft snapshots, preference-write failure handling and offline recovery reuse the existing infrastructure.

The Tuesday/Thursday shared form gains one optional benchmark-group configuration; their existing two-group forms and result contracts are unchanged. Friday history displays weights, the final-set arm pair and complete rounds with existing date/duration/sync status. JSONB local-first/cloud persistence is reused without SQL or ownership changes. Timer/audio modules, all released definitions and HM/KB card/CSS components remain unchanged. Cache `kb2-static-v17` adds the three new runtime modules. See [Friday timeline, schema, screenshots and verification](docs/FRIDAY_TO_BLACK.md). No merge, deployment or production data changes.
