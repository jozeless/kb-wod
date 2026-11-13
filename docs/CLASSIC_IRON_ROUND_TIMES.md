# Classic Iron — automatic round times

Branch: `feature/classic-iron-round-times`, based on merged main `a8848ba` (PR #34).

## Timing

`RoundAmrapTimer` records a duration only when a completed-round action is accepted. The first round starts at activity elapsed time zero, after the initial countdown. Later rounds start at the exact previous rest deadline. The duration is the monotonic active elapsed time at the press minus that start time; UI ticks, delayed renders and background catch-up never define the start time.

The existing main countdown and shared `WorkoutTimer` are unchanged. Rest still consumes 20 seconds of the main workout, while individual round times exclude it. Pausing the shared active clock excludes paused time from both work and rest. A zero-elapsed press is ignored rather than fabricating a positive duration. Duplicate, paused, countdown, rest and post-completion actions add no timing entries. Ending during rest or an unfinished final circuit adds no extra round. `partialReps` never generates a round time.

Snapshots copy the timing array. Durations retain their original millisecond precision. Only presentation rounds to the nearest second and displays `MM:SS`; fastest comparisons use the original values. Equal durations keep the first recorded round.

## Results and History

New completed results contain exactly `completedRounds`, `partialReps` and `roundTimesMs`, together with the existing standard session metadata. There must be one finite, positive duration per completed round, each no greater than the workout duration. Invalid or mismatched timing arrays cannot be saved. Zero completed rounds use an empty array.

Results and History share the same read-only ordered list and highlighted fastest-round renderer. The additional-repetition field remains editable, with the existing 0–69 validation. A timed zero-round session displays “No completed round times”. Historical results without the array display “Round times not recorded”; no duration is inferred and no old record is rewritten. Invalid imported timing arrays also show no fabricated times.

The new array is included only in the existing explicit completed-session Save transaction. Failed saves retain the same UUID, rounds, additional repetitions and exact times for retry. Duplicate-save, account ownership, offline and JSONB synchronization behavior is preserved. No draft persistence, SQL, data cleanup or storage-schema change is introduced.

## Progress

A separate **Classic Iron · Fastest Round — All Time** section is appended after the existing sections, using their current styling. It displays the best recorded duration, workout date and round number. Month selection does not filter this metric.

The projection reuses the existing completed-session/date/authorization filtering and deduplication. It accepts only matching Classic Iron v1 identities with the known 20-minute duration and a valid, complete timing array. Missing, malformed, foreign, unfinished and other-WOD data are excluded. Partial repetitions and rest periods do not contribute. Account changes clear the previous projection and stale asynchronous loads cannot render it for another owner. The existing monthly, consistency, strength and performance sections and calculations are preserved.

## Files and PWA

- `src/domain/round-amrap-timer.js`: exact timing capture on accepted round completion.
- `src/domain/classic-iron-results.js`: timing-array validation, fastest-round selection and display formatting.
- New `src/domain/classic-iron-progress.js`: separate authorized all-time projection.
- New `src/ui/round-times.js`: shared read-only Results/History renderer.
- `src/ui/round-amrap-training.js`, `src/ui/session-history.js`: timing snapshot and renderer integration.
- `src/ui/progress.js`: append the isolated Classic Iron metric.
- `service-worker.js`: v35 → v36; preserve all 98 existing resources and precache the two new modules (100 total).
- Node/browser regressions and cache assertions; existing source-protection fixtures update only the intentionally extended Progress view. The Classic Iron definition and active presentation/styles remain byte-identical.

No workout definition, identity, version, exercise prescription, audio infrastructure, active Focus Mode layout, other result schema, storage or Supabase implementation is changed.

## Validation evidence

Screenshots and test output are available under `/workspace/artifacts/classic-iron-round-times/`. Results layouts cover 320, 390, 768 and 1280 px at normal and 200% text. Tests include exact 70/80/75-second rounds, fractional milliseconds, initial countdown, pauses in work and rest, absent UI ticks, duplicate presses, deadline during rest, zero/unfinished rounds, exact saved payloads, retry, historical records, all-time selection, account switches, offline use and mocked cloud transport.

- `npm test`: **150 passed**, no failures.
- `npx playwright test --workers=2`: **416 passed**, no failures (11.7 minutes), mobile and desktop Chromium.
- Focused Classic Iron/Progress integration: **44 passed**, plus **2 passed** for explicit real mocked account switching.
- `git diff --check`: clean.
- All workout definitions, the main `WorkoutTimer`, active presentation, styles, audio, storage and cloud source files remain unchanged from main.

No production writes, data deletion, merge or deployment are included.
