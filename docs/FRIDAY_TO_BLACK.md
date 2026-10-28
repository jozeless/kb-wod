# Friday To Black v1

New immutable identity `friday-to-black`, version 1, code `HM/KB Friday`, suggested Friday, approved Hybrid, category `Full Body · Strength & Conditioning`. Adding it to the catalog never replaces a weekly assignment; selection remains manual. No previously released definition or historical session is migrated or rewritten.

## Programming and exact timeline

| Active time | Phase | Programming |
| --- | --- | --- |
| 00:00–08:00 | Strength | Alternate one minute Alternating Floor Press 5–6/arm and one minute Sumo Deadlift 8–10, four rounds |
| 08:00–16:00 | Conditioning | Staggered-Stance Row, Sit-Up + Twist, Front Rack March, Chest-Level Crossover; twice, 40 seconds work / 20 seconds rest |
| 16:00–20:00 | Finisher | Continuous AMRAP: 6 Goblet Squat + Curl combinations, 20 Mountain Climbers total, 6 Burpees |

Exactly **1,200 active seconds**. The initial 3–2–1 countdown, warm-up and cooldown are excluded. Eight EMOM slots, eight complete Conditioning 40/20 intervals including 15:40–16:00 rest, and one continuous four-minute circuit. No five-second transitions, intermediate forms, auto exercise switches or programmed rest inside AMRAP.

Floor Press uses one KB, alternating arms within its minute. Count a completed press for the arm performing it. The benchmark is the fourth Floor Press slot, **06:00–07:00** (seventh Strength minute), not all four sets combined. Conditioning notes recommend evenly working both sides within 40 seconds; 20 seconds per side is optional guidance only, with no extra timer segments or switch cues.

Use one KB for the Goblet Squat + Curl; a complete squat-plus-curl combination counts once. Each Mountain Climber knee drive counts once, alternating legs, for 20 total. Count fully completed Burpees. The user manages the circuit and counts full rounds manually, excluding partial circuits.

## Audio and timer reuse

No timer-engine, cue-router, synthesized-pattern or audio-infrastructure changes. The new AMRAP uses the existing opt-in `audioCue: finisher` metadata.

The exact cue stream is START after countdown; seven MINUTE changes during Strength; eight WORK and eight REST in Conditioning (one WORK at 08:00); one FINISHER at 16:00; one COMPLETE at 20:00. No extra elapsed-minute cues inside intervals/circuit and no overlapping boundary cues. Shared pause/mute/unlock/background suppression remain enabled; audio availability cannot stop the timer.

## Session-specific weights and benchmark

Exactly seven KB weight IDs: `alternating-floor-press`, `sumo-deadlift`, `staggered-stance-row`, `sit-up-twist`, `front-rack-march`, `chest-level-crossover`, `goblet-squat-curl`. Mountain Climbers and Burpees have no weight input or saved weight entry.

At session creation, the existing weight snapshot helper reads this workout/version's preferences. Active edits autosave the last chosen per-exercise weight into IndexedDB and separately attempt future preference writes. A failed preference write retains the session value and reports the failure. Later preferences cannot replace that session's snapshot, including on offline paused recovery. Final corrections change only the session, not future preferences. There is no per-round load history or duplicate benchmark weight.

The dedicated `friday-weights-floorpress-rounds-v1` draft form contains raw `weights`, `fullRounds`, `leftReps`, `rightReps` and `invalid` fields. Left/right/round counts start empty regardless of target prescriptions. Each arm is independent; counts are not summed into a score, inferred from time or treated as all-round totals.

Final form: exactly three groups:

1. Seven editable KB weights (kg).
2. Alternating Floor Press: optional left/right repetitions from the final fourth set, with an explicit reference-set explanation.
3. Complete finisher rounds only (whole 6 / 20 / 6 circuits).

Weights are finite nonnegative numbers or null. The three performance counts are nonnegative integers or null. Blank differs from explicit zero; negative, fractional, malformed and flagged bad numeric inputs cannot be saved. No Conditioning counts, round-by-round repetitions, partial rounds, effort, notes or extra status questions.

## Versioned results contract

Example shape below uses structural nulls, not fabricated measurements:

```json
{
  "exerciseWeights": {
    "alternating-floor-press": null,
    "sumo-deadlift": null,
    "staggered-stance-row": null,
    "sit-up-twist": null,
    "front-rack-march": null,
    "chest-level-crossover": null,
    "goblet-squat-curl": null
  },
  "keyExercise": {
    "exerciseId": "alternating-floor-press",
    "referenceSet": "final",
    "leftReps": null,
    "rightReps": null
  },
  "finisher": {"phaseId": "finisher", "fullRounds": null}
}
```

The original session envelope, IndexedDB schema/version and idempotent completion transaction are reused. Cloud sync uploads the identical results object in the existing owner-scoped JSONB payload and stays pending until server confirmation. No SQL, RLS, Auth, account ownership, sync-module or production-data changes.

The result dispatcher adds only this schema. Friday history renders the seven actual weights, independent final-set left/right repetitions, complete rounds and existing date, active duration and sync status. All older schemas retain their contracts and rendering. Tests preserve/read back Monday v1/v2/v3, Tuesday and Thursday completed records plus their local drafts without changes.

## Reusable forms and visual design

`session-weight-count-form` accepts optional `extraGroups` containing integer benchmark fields. Existing Tuesday/Thursday wrappers omit it and keep their original labels, controls and two groups. Friday supplies exactly one extra group between weights and full rounds. No separate form engine, card system or active-workout redesign.

Existing HM/KB components generate Library, Today and detail cards from definitions/result metadata. The phase bar is exactly 40% muted purple / 40% lilac / 20% yellow. The detailed purple panel describes seven KB weights, final-set repetitions per arm and complete rounds. Existing palette, CSS, header, navigation, active timer and account screens are unchanged. No photos, decorative assets, fonts, libraries or audio samples are added.

PWA cache `kb2-static-v17` precaches the new workout definition, result module and Friday form wrapper, retaining all historical assets. Existing worker lifecycle waits for old tabs to close after a separately authorized release; this branch does not deploy anything.

## Tests, screenshots and limits

Logic tests independently verify immutable identity, exact targets/order/rounds, bodyweight exclusions, final-set timing, the complete timeline/cue sequence, seven weight snapshots, optional benchmark pair, null/zero, validation and whole-workout completion requirements. Browser tests cover every audio boundary, full training/results/save/history, preference write failure and later-preference independence, offline pause/reload recovery, left/right independence, invalid input persistence, local-first idempotent completion, pending/retried/confirmed mocked cloud sync and preservation of older completed records/drafts.

Layout tests cover 320, 390, 768 and 1280px without horizontal overflow or truncated names. Screenshot artifacts: `/workspace/artifacts/friday-card-mobile.png` (390px compact Library card), `friday-detail-mobile.png` (full actual page), and `friday-overview-mobile.png` (detail component crop, fixed navigation hidden only during capture to avoid overlaying a long screenshot). Matching desktop-project captures are also generated. These are test artifacts, not new runtime assets or stylesheet changes.

Automated browser tests use Chromium mobile/desktop viewports. Supabase Auth/REST are mocked; real-device audio/background behavior and live Supabase require manual/environment verification. Existing browser/OS storage eviction and interruption limits remain. Working weights reflect the final selected per-exercise load, not each round's changes. No physical workout measurements are invented. No merge, deployment or production SQL/data changes.

## Final verification

- `npm test`: **77 passed**, zero failures.
- `npx playwright test --reporter=line`: **202 passed**, mobile and desktop projects.
- Static checks: **89 JavaScript modules** parse, **52 reachable runtime modules** are precached and **62 static asset paths** exist. No build script is defined; native ES modules remain the runtime.
- `git diff --check` passes. Diff guards preserve all previously released definitions, timer/cue/audio modules, active-training/card/detail components, CSS, cloud modules, session/plan stores, SQL and historical WAV assets.
- An independent comparison against fetched main confirms identical draft and completed-result contracts for all **nine prior versions with supported result saving**, including zero counts and session weights.

## Changed files

```text
README.md
docs/FRIDAY_TO_BLACK.md
docs/SUPABASE.md
docs/TIMER_AUDIO.md
service-worker.js
src/data/catalog.js
src/data/friday-to-black.js
src/domain/friday-results.js
src/domain/result-schemas.js
src/domain/weights-finisher-results.js
src/storage/weight-preferences.js
src/ui/block-result-form.js
src/ui/friday-results-form.js
src/ui/session-history.js
src/ui/session-weight-count-form.js
src/ui/workout-presentation.js
tests/app.spec.js
tests/cloud.spec.js
tests/custom-audio.spec.js
tests/friday-to-black.spec.js
tests/friday-to-black.test.js
tests/monday-paranoid-v3.test.js
tests/monday-paranoid.spec.js
tests/monday-paranoid.test.js
tests/thursday-bells.spec.js
tests/tuesday-of-spades.spec.js
```
