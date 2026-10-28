# Thursday Bells v1

Identity: `thursday-bells`, version 1, approved Hybrid, suggested Thursday, category `Full Body · Lower Priority`. New independent catalog identity; users assign it manually. No existing assignment, preference, historical record or released workout definition is migrated or rewritten.

## Programming and time

| Active time | Phase | Programming |
| --- | --- | --- |
| 00:00–06:00 | Upper | EMOM, Crush Press 6–8; Staggered-Stance Row 6–8/side; Halo 4–6/direction, twice |
| 06:00–06:05 | Transition | Automatic visible five-second rest |
| 06:05–12:05 | ABS | Tall-Kneeling Press-Out; Half-Kneeling Diagonal Chop; Sit-Up + Press-Out, twice, 40/20 |
| 12:05–12:10 | Transition | Automatic visible five-second rest |
| 12:10–20:10 | Legs | EMOM, Goblet Squat 8–10; Swing 12–15; Lateral Lunge 5/side; Standing Calf Raise 12–15, twice |
| 20:10–20:40 | Hell's Finisher | KB Suitcase High-Knee March, KB in RIGHT hand |
| 20:40–21:10 | Same finisher | KB in LEFT hand |

Exactly **1,270 active seconds**. The initial 3–2–1 countdown, warm-up and cooldown are excluded. All six ABS rests are included, including 11:45–12:05. No intermediate forms, manual continuation, extra rests or AMRAP circuit. The single final form opens at 21:10.

## One timer, automatic hand change

The version-safe opt-in format `timed-sides` compiles `timer.holds` into two `SIDE_HOLD` segments sharing the same phase and exercise. Compilation validates one exercise, two distinct valid holding sides, positive finite durations and exact phase totals. Old formats compile identically. There is no secondary timer, midpoint timeout or manual switch button.

The snapshot carries `holdingSide` and current segment remaining time. Active UI displays a prominent RIGHT/LEFT instruction, half remaining time, whole-block remaining time and total workout remaining time. At entry these are RIGHT / 00:30 / 01:00 / 01:00; the hand changes to LEFT and the half clock reads 00:30 at 20:40. It refers to the holding hand; one controlled knee lift counts as one marching step across both halves.

Pause/reload recovery restores the same persisted checkpoint as a paused session. Time away is excluded. Resuming before the midpoint reaches the left instruction automatically; recovering after it retains LEFT. A browser returning late from the background computes the correct side immediately but consumes missed sound events silently.

Audio uses unchanged existing patterns: START after countdown; MINUTE only for Upper/Legs intra-phase EMOM changes; six REST and six WORK in ABS; WORK at automatic Legs entry; FINISHER once at 20:10; one WORK at 20:40; COMPLETE once at 21:10. Transition entries are silent; their countdowns remain visible. Cue priority prevents simultaneous/duplicate events; mute, pause, gesture unlocking and unavailable-audio behavior remain shared.

## Session results

New schema: `thursday-weights-steps-v1`. Draft form: `{weights: {exerciseId: string}, totalSteps: string, invalid: {}}`. It snapshots only this workout/version's saved preferences at creation. It never prescribes or automatically selects a load; the discussed 12–16 kg range is not used as a default or a validation requirement.

All eleven working weights are editable during their exercise, including the same finisher field across both hands. Valid changes autosave the session draft and independently attempt a future preference write. A failed preference write preserves the session value and reports the failure. Subsequent preferences cannot replace the session's snapshot. Final corrections affect only the session. Only the last selected load per exercise is retained, not a per-round change history.

Final UI has exactly two groups: eleven editable kg fields and one total finisher step count. Weights are finite nonnegative numbers or null. Total steps is a nonnegative integer or null. Zero is explicit; blank is unknown. No repetitions per round, intervals completed, finisher rounds, separate side counters, effort or notes.

Results structure (nulls are structural examples, never invented measurements):

```json
{
  "exerciseWeights": {
    "crush-press": null,
    "staggered-stance-row": null,
    "halo": null,
    "tall-kneeling-press-out": null,
    "half-kneeling-diagonal-chop": null,
    "sit-up-press-out": null,
    "goblet-squat": null,
    "swing": null,
    "lateral-lunge": null,
    "standing-calf-raise": null,
    "suitcase-high-knee-march": null
  },
  "finisher": {"exerciseId": "suitcase-high-knee-march", "totalSteps": null}
}
```

The session envelope, IndexedDB database/store/version, completed-save transaction and owner-scoped Supabase JSONB queue are unchanged. Upload stays pending until acknowledgment; retries use the same ID. No SQL or production access is needed. History renders all eleven weights and total steps. Monday's `weights-finisher-v1` and Tuesday's `tuesday-weights-rounds-v1` keep their original fields and meanings.

The two-group form mechanics are extracted from Tuesday into `session-weight-count-form.js`; Tuesday delegates with the exact previous labels and fields. Thursday supplies its own labels and steps key. No universal card fork or unrelated screen redesign.

## Shared design and PWA

Library, Today and detail use the existing HM/KB components and palette. Phase widths derive from `[360,5,360,5,480,60] / 1270`; transition segments remain included. Exercise names and targets retain the shared alignment, and metadata generates the purple eleven-weights/total-steps summary. One responsive wrapping rule lets long existing phase headings/format labels fit narrow screens without truncation. No new fonts, audio assets, images or libraries.

Static cache `kb2-static-v16` precaches all four new runtime modules and retains all historical assets. Existing worker activation waits for old app tabs to close after a separately authorized release. No merge or deployment is performed.

## Verification and limits

Logic tests assert exact targets/order/rounds, six Upper minutes, six 40/20 ABS intervals including final rest, eight Legs minutes, both transitions, right/left half boundaries, exact completion, compiler validation, the entire cue stream, pause/background handling, eleven independent weights and steps validation (null, zero, positive integers, negative/fractional/invalid inputs).

Browser tests exercise every cue boundary, full training/edit/save/history, visible automatic transitions, RIGHT and LEFT offline paused recovery, preference write failure, later-preference independence, preservation/readback of Monday/Tuesday sessions and drafts, totalSteps validation, a blank/null save, no extra result fields, manual assignment, shared card rendering and failed-then-acknowledged mocked Supabase sync. Layout checks cover 320, 390, 768 and 1280px without horizontal scrolling or truncated names. Existing full workout/audio/Auth/planning/PWA suites remain enabled.

An independent comparison against the fetched main checks all ten previously released real workout versions: compiled timelines, every 100ms timer snapshot and emitted cue stream remain identical.

Screenshots: `/workspace/artifacts/thursday-card-mobile.png` (Library card at 390px) and `/workspace/artifacts/thursday-detail-mobile.png` (full detail); matching desktop-project captures are also generated. Screenshots are artifacts, not new runtime assets.

Automated browser coverage uses Chromium mobile/desktop viewports, and cloud testing uses mocked Auth/REST. Real-device audio/background behavior and live Supabase remain manual/environment checks. Browser storage eviction and OS interruption limits are unchanged. No physical workout results are fabricated.

## Final verification

- `npm test`: **72 passed**, zero failures.
- `npx playwright test --reporter=line`: **184 passed**, mobile and desktop projects.
- Static checks: **84 JS modules** parse; **49 reachable runtime modules** are precached; **59 static asset paths** exist.
- `git diff --check` passes; diff guards preserve all released workout definitions, cloud modules, session/plan stores, synthesized audio patterns, SQL and historical WAV assets.
- Independent main comparison: all ten released real workout versions have identical compiled timelines, snapshots at every 100ms and emitted cue streams.

## Changed files

```text
README.md
docs/SUPABASE.md
docs/THURSDAY_BELLS.md
docs/TIMER_AUDIO.md
service-worker.js
src/data/catalog.js
src/data/thursday-bells.js
src/domain/result-schemas.js
src/domain/thursday-results.js
src/domain/weights-finisher-results.js
src/domain/workout-cues.js
src/domain/workout-timer.js
src/storage/weight-preferences.js
src/ui/block-result-form.js
src/ui/block-training.js
src/ui/exercise-prescription.js
src/ui/session-history.js
src/ui/session-weight-count-form.js
src/ui/thursday-results-form.js
src/ui/tuesday-results-form.js
src/ui/workout-details.js
src/ui/workout-presentation.js
styles/app.css
tests/app.spec.js
tests/cloud.spec.js
tests/custom-audio.spec.js
tests/helpers/timer-beeps.js
tests/monday-paranoid-v3.test.js
tests/monday-paranoid.spec.js
tests/monday-paranoid.test.js
tests/thursday-bells.spec.js
tests/thursday-bells.test.js
tests/tuesday-of-spades.spec.js
```
