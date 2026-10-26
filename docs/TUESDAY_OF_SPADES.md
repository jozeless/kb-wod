# Tuesday of Spades v1

New identity `tuesday-of-spades`, version 1, Hybrid, suggested Tuesday. Catalog/search/assignment use the existing versioned references. Adding the definition never modifies an existing plan.

## Programming and events

| Active time | Programming | Audio at entry |
| --- | --- | --- |
| Initial 3 seconds (excluded) | Countdown 3–2–1 | START only at its end |
| 00:00–08:00 | Renegade Row 4–6/side, Swing 12–15; alternate eight EMOM slots / four rounds | Seven subsequent MINUTE events |
| 08:00–16:00 | Step-Up + Knee Drive; Reverse Lunge + Biceps Curl; Plank Drag; Around the World + Front Raise; two rounds of 40/20 | WORK at 08:00, eight REST and eight WORK in total |
| 16:00–20:00 | AMRAP: 8 complete Thrusters using ONE KB, 8 Hollow-Ups, 10 Jump Squats | FINISHER at 16:00 |
| 20:00 | Final result form | COMPLETE only |

All eight Conditioning rests, including 15:40–16:00, are included. There are no extra transition seconds, rests or per-exercise timer changes inside the AMRAP. `audioCue: finisher` on the new phase opts into the existing FINISHER sound; previously released phases retain their event policy. Audio frequencies, envelopes, durations, cancellation and unlock logic are unchanged.

## Results and durability

Dedicated schema: `execution.schema: tuesday-weights-rounds-v1`. The original IndexedDB schema/version and session envelope are reused. No new table, SQL migration or production access is required.

Draft raw form: `{weights: {exerciseId: string}, fullRounds: string, invalid: {}}`. Exactly seven kettlebell IDs are included; Hollow-Ups and Jump Squats have no weight entries. At creation, preferences are read into the draft. Valid active edits autosave the session and separately update future local preferences. AMRAP's single KB field uses this same session snapshot. Recovery reads the recorded snapshot rather than the latest preferences. Final corrections update only the session. A completed record is independent of subsequent preferences.

Completed `results`:

```json
{
  "exerciseWeights": {
    "renegade-row": null,
    "swing": 0,
    "step-up-knee-drive": 12.5,
    "reverse-lunge-curl": null,
    "plank-drag": null,
    "atw-front-raise": null,
    "thrusters": null
  },
  "finisher": {"phaseId": "cardio-sweat", "fullRounds": null}
}
```

Example only, not generated session data. Weights are finite nonnegative numbers or null; full rounds are a nonnegative integer or null. Blank differs from zero. No effort, notes, partial repetitions, per-exercise counts or completed intervals are requested/stored in this schema. Monday's `weights-finisher-v1` remains unchanged. Whole-duration/all-block completion is required before final save.

The existing local-first, owner-scoped cloud queue uploads `results`, workout snapshot and session envelope as JSONB. A failed/unacknowledged request remains pending; a successful retry confirms the existing stable session ID. Tests mock Supabase; no live data is touched.

## Shared visual design and reference comparison

`components.phaseBar`, `workoutCard`, `workoutDetails` and `workout-presentation` generate presentation from definitions and result fields. No Tuesday-specific HTML or workout-ID styling. Every card uses `.workout-card--hm-kb`; demo cards share the palette but retain explicit DEMO identification and never show APROBADO. Compact Library/Today cards share hierarchy and duration bars; only detailed views show the exercises.

The provided reference is reflected by the #212227 background, softly rounded corners, restrained purple/lilac/yellow palette, bold uppercase title, three proportional 40/40/20 segments, numbered section titles with format on the right, left-aligned names/right-aligned targets, separators and two-group purple results panel. Existing WODs use their own phase counts and durations, including Monday v3's five-second transitions; these are never represented as invented equal thirds.

Intentional functional adaptations to the reference: seven editable preference fields remain available beside exercise rows; compact expandable instructions retain all programming and measurable goals; the existing app header, navigation, Start/History actions, version identity and manual assignment/warm-up guidance remain accessible. This makes the mobile overview taller than the reference, which did not include these controls. No photos, downloaded fonts, effects or new libraries are used. Only card/overview selectors are themed; account, sync and active-training screens remain unchanged.

Screenshots are captured by the Tuesday browser test into `/workspace/artifacts/`: `tuesday-detail-mobile.png`, `tuesday-library-mobile.png` (390px) and `tuesday-detail-wide-mobile.png` (1280px). Real-layout assertions cover 320, 390, 768 and 1280px without horizontal scrolling or truncated names.

## Verification and limits

Unit tests independently assert every programmed movement/target, eight EMOM slots, all 40/20 intervals, final rest, continuous AMRAP and 1,200-second completion. They enumerate exact cue event times, validate optional numbers/null/zero, session/preference independence, and require completed phases before save.

Browser tests run every audio boundary, whole workout to final save, seven working weights, bodyweight exclusions, pause/reload/offline AMRAP recovery, final validation/autosave, history, idempotent save and failed-then-confirmed mocked cloud sync. Shared card tests cover filters, preserved assignments, manual Tuesday assignment, demo badges, proportionate bars for Tuesday/Focus/Monday, keyboard and responsive layouts. Existing workout, historical-schema, account, offline and audio suites remain enabled; legacy visual assertions are updated only for the deliberate shared design/catalog/cache change.

PWA `kb2-static-v15` adds the four new modules and retains historical assets/versions. Existing worker lifecycle waits for old tabs to close after a separately reviewed release. There is no build script: native ES-module syntax, static precache completeness, unit and browser tests are the available checks.

Physical device audio/background restrictions and live Supabase policies require real-device/environment verification; automated runs use Chromium mobile/desktop viewports and mocked Auth/REST. Storage eviction and browser/OS interruption limits remain unchanged. Weights record the selected per-exercise session load, not a per-round weight-change log. No automatic merge or deploy.

Final verification for this branch: `npm test` — **68 passed**; `npx playwright test --reporter=line` — **168 passed** across mobile/desktop projects. Static checks passed for **78 JavaScript modules**, **45 reachable precached runtime modules**, and **55 existing static precache paths**. `git diff --check` passed. Diff guards confirm no changes to released workout files, the timer engine, synthesized audio patterns, cloud modules, session/plan stores, SQL or historical WAV files.
