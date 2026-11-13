# Classic Iron v1 — round-controlled AMRAP

This document records the original release. The backward-compatible [additional-repetitions extension](CLASSIC_IRON_PARTIAL_REPS.md) now adds `partialReps` to new results; historical rounds-only sessions remain unchanged.

Branch: `feature/classic-iron-amrap`, based on merged main `0e3903e` (PR #32).

Classic Iron is appended as the eighth public Library card, with identity `classic-iron` / version 1. The seven existing public workouts retain their pinned versions and order. All 22 previous internal definitions remain registered; the registry now has 23 definitions, including 20 real workouts. Weekly assignments still require an explicit planning action.

## Programming and timing

One 20-minute AMRAP circuit contains, in order, KB Swing, KB Thrusters, Single-Arm KB Bent-Over Row, KB Wood Choppers, KB Hollow-Ups, KB Reverse Lunge + Biceps Curl and KB Goblet Squat. Every movement has ten repetitions. Row, Wood Choppers and Reverse Lunge + Biceps Curl use ten total repetitions distributed between sides, rather than ten per side.

The existing `WorkoutTimer` compiles this as one continuous AMRAP segment. `RoundAmrapTimer` composes that engine without modifying it. The three-second initial countdown remains outside the 1,200,000 ms activity duration. There are no automatic exercise changes, WORK/REST intervals or separate finisher.

An accepted **Ronda completa** action immediately increments the integer counter and establishes a rest deadline 20 seconds ahead on the same active elapsed clock. The action is disabled during rest, pause and initial countdown, and the engine independently rejects duplicate calls. Main time continues during rest. Pausing the shared clock freezes both remaining times. The main deadline always wins: a late round may begin a 20-second rest, but completion at 20:00 cancels any remaining rest without extending activity.

`round-amrap-presentation.js` reuses the existing Focus Mode dial, visual state, icon controls and accessibility treatment. Its compact circuit stays in order at all times. The main countdown is always the workout countdown; an additional rest countdown appears only during rest. No active weight fields or interval metrics are introduced. The new stylesheet is scoped to `.hm-round-amrap`.

## Audio

The existing synthesized `clear-loud-v1` audio implementation is reused unchanged. Classic Iron emits START after the initial countdown, REST on an accepted completed-round action, WORK when its rest ends and COMPLETE at the main deadline. It does not emit automatic exercise/minute/finisher cues. Each update consumes at most one event; completion takes precedence over rest ending.

Hidden, late and paused updates consume boundaries silently. Explicit Resume retries browser audio unlocking without replaying cues. Audio enable runs directly in the Start interaction and does not delay the timer if playback is blocked. Existing WOD audio behavior and historical sound assets are unchanged.

## Completed-only results and ownership

The new controller keeps counters and rest state in memory. It performs no draft writes, checkpoint persistence, recovery reads or weight-preference reads. Leaving, refreshing or ending early creates no session. At 00:00, Workout Results displays the actual completed-round count, including zero; partial circuits are never inferred or added. There is no editable performance form.

Only explicit **Save Workout** calls the existing idempotent completed-session transaction. The performance payload is exactly `{completedRounds: <non-negative safe integer>}`. The record also retains schema version, UUID, workout ID/version, immutable workout snapshot, start/completion timestamps, exact active duration, owner, completed status and standard storage timestamps. It has no weight values, per-exercise counts, finisher result, effort, notes or raw form fields.

Duplicate Save calls are guarded synchronously. Storage failure retains the same UUID and count for retry. Ownership is captured at Start and checked again before saving. Existing account changes, local visibility rules, synchronization and JSONB transport remain in force. No schema migration, production SQL or data cleanup is required.

History displays completed rounds and standard session metadata. Existing Progress monthly workout/activity counts include Classic Iron. It contributes no invented weights, repetition estimates or finisher measurements to existing performance series.

## PWA and regression protection

Cache advances from `kb2-static-v33` to `kb2-static-v34`, retaining all 92 prior resources and adding six runtime resources: the definition, timer/cue adapter, result adapter, controller, presentation and scoped stylesheet. Worker activation strategy and manifest identity remain unchanged.

The new Node suite covers programming, countdown duration, round acceptance, double calls, exact rest edges, pause during all states, deadline priority, partial rounds, cues, late/hidden updates, result validation and monthly activity. A baseline hash fixture protects 84 unchanged source/assets files from merged main, including all earlier workout definitions, timing/audio engines, legacy controllers/results, storage/cloud code, branding and existing styles. Earlier integration hash fixtures update only HTML stylesheet inclusion and the new controller route. Other historical assertions remain intact.

Browser regressions exercise explicit rounds, pause/resume, terminal rest, zero rounds, duplicate Save, quota failure/retry, ownership mismatch, early exit, reload, inactive historical draft URLs, hidden/late cues, blocked audio, History, monthly counts, mocked cloud retry/ownership and offline operation. Layout evidence covers 320, 390, 768 and 1280 px at normal and 200% text, with keyboard focus and accessible target sizes.

Validation results and screenshots are recorded in `/workspace/artifacts/classic-iron-amrap/`. Browser cloud tests use a local HTTP fixture; no production database writes or deployment are part of this change.

## Final validation

- `npm test`: **140 passed**, no failures.
- `npx playwright test --workers=2`: **404 passed**, no failures, across mobile and desktop Chromium (11.7 minutes).
- `git diff --check`: clean.
- The complete run includes all seven earlier public WODs, historical versions, native synthesized audio, Focus Mode, completed-only storage, History, Progress, account isolation, mocked cloud transport and offline resources.
- A prior obsolete exact stylesheet-list expectation was updated to include the new scoped stylesheet. The final complete run above passed after that correction.

## Changed files

| Area | Files |
| --- | --- |
| Definition and catalog | `src/data/classic-iron.js`, `src/data/catalog.js` |
| Round timing and results | `src/domain/round-amrap-timer.js`, `src/domain/classic-iron-results.js`, `src/domain/result-schemas.js` |
| Active screen | `src/ui/round-amrap-training.js`, `src/ui/round-amrap-presentation.js`, `styles/hm-round-amrap.css` |
| Existing integration points | `src/main.js`, `src/ui/views.js`, `src/ui/workout-details.js`, `src/ui/session-history.js` |
| PWA | `index.html`, `service-worker.js` |
| Tests | New `tests/classic-iron.test.js`, `tests/classic-iron.spec.js`, baseline hash fixture; existing assertions updated for the eighth card, 23 definitions, exact stylesheet list and cache v34 / 98 resources |
| Documentation | This file |

The complete changed-file list is available in `/workspace/artifacts/classic-iron-amrap/changed-files.json`.
