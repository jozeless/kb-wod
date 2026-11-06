# Oldschool WODs 005, 006 and 007

Branch: `feature/oldschool-wods-005-007`, from merged main `d6b1bcf` (PR 31). The previous four public releases remain first, followed by Oldschool Sailor, Tiger and Eagle. All 19 previous internal definitions remain available; the registry now contains 22 versions and 19 real workouts. Weekly assignments change only through the existing explicit planning actions.

## Approved programming

| Code | ID / version | Name | Category | Last exercise |
| --- | --- | --- | --- | --- |
| HM/KB WOD 005 | `oldschool-sailor` / 1 | Oldschool Sailor | Full Body / Oldschool Strength | Burpees |
| HM/KB WOD 006 | `oldschool-tiger` / 1 | Oldschool Tiger | Full Body / Oldschool Strength | Mountain Climbers |
| HM/KB WOD 007 | `oldschool-eagle` / 1 | Oldschool Eagle | Full Body / Oldschool Unilateral Strength | High Knees |

Each of the three definition modules explicitly supplies its approved exercise names, equipment and four ordered ID lists. `src/data/oldschool.js` supplies only their shared block boilerplate: Upper, ABS, Legs and Muscle Finisher; 300 seconds each; one round; five intervals; 45 seconds WORK and 15 seconds REST. No repetition targets, transition segments or extra finisher time are added. The initial three-second countdown stays outside the 1200-second program.

The existing compiler produces 40 segments per WOD (20 WORK / 20 REST). Blocks start at 00:00, 05:00, 10:00 and 15:00. The last WORK ends at 19:45; the full final REST is preserved through 20:00. The existing interval cue policy emits START, double REST, higher WORK and COMPLETE, with the current `clear-loud-v1` profile. There is no EMOM minute cue or AMRAP finisher cue in these interval blocks.

Sailor and Tiger each contain 17 unique exercises: 14 kettlebell and three bodyweight. Their first three finisher movements reference earlier exercise IDs directly. Eagle retains the 20 supplied exercise labels: 17 kettlebell and three bodyweight. Unilateral preparation notes explain distributing the 45-second work period between both sides with a manual switch; no extra side timer is introduced.

## Cards and preparation

The existing HM/KB card renders optional data-driven code, `20:00` duration and `45/15` timing for the new releases, plus its normal phase bar, four-block structure and View workout action. Existing cards retain their current metadata and appearance. Library now describes and counts seven selectable workouts.

All 20 slots remain visible in Workout Detail, in the supplied order. An Oldschool-only presentation flag renders one weight editor per unique kettlebell ID. Repeated finisher rows say “Shared weight above” and use that same preference. Bodyweight movements have no weight editor. Preferences retain the existing workout/version/exercise keys, optional blank/zero/decimal handling and local storage behavior. No weight is prescribed and no plan is assigned automatically.

## Minimal result adapter

The new `oldschool-weights-v1` execution schema uses the existing continuous workout controller and completed-only save lifecycle. The adapter constructs the existing in-memory envelope, initializes one optional raw weight per unique kettlebell exercise and validates the whole workout before Save. It returns only:

```js
{exerciseWeights: {exerciseId: numberOrNull}}
```

There are no approved special finisher benchmarks or new progress measurements, so no counts, scores, repetition targets, effort fields or other mandatory performance metrics are added. Blank means unrecorded; explicit zero remains zero. Bodyweight exercises are excluded from the map. Correcting actual weights on the final form does not change future preparation preferences.

The existing `sessionWeightCountForm` is reused with its optional count group omitted. Existing Tuesday/Thursday/Friday configurations still render exactly their previous groups. Result dispatch and saved-session rendering recognize the new schema; all existing schemas, fields and records are retained. Saved Oldschool sessions display unique exercise weights, with the normal History links and account sync status.

Progress already accepts `exerciseWeights`, so it needs no calculation changes: completed sessions contribute to counts and duration, and explicitly recorded kg appear in the existing strength series. An exercise repeated across phases uses the existing whole-workout grouping and is counted once per session. No Oldschool performance totals are fabricated. Supabase continues transporting the existing owned completed-session envelope, immutable snapshot and JSONB results; there are no table, SQL, Auth, sync or IndexedDB schema changes.

## Protection and PWA

The timer, cue/audio engines, active controller, Focus Mode presentation/CSS/SVG controls, mounted-view chrome detection, shared exit guard, completed-only storage behavior, weight storage, original workout modules, result validators/forms, Progress and Auth/sync are preserved. Integration changes are limited to new modules, catalog registration, result dispatch, optional card/preparation presentation and the new-schema History branch. Old snapshot renderers still use their original paths, including the Friday 40-second versus 60-second benchmark distinction.

Cache `kb2-static-v32` advances to `kb2-static-v33`. All 86 prior resources remain in the original order; six runtime modules are added (three definitions, one shared definition helper, one result adapter and one result form), bringing the precache to 92. Waiting/activation/fetch policies, manifest identity, artwork and external dependencies are unchanged.

## Verification

New Node checks use an independent approved sequence fixture and verify exact names/order/IDs/equipment, 45/15 durations, all block boundaries, the last REST, every semantic cue, optional weights and validation, result isolation, Progress compatibility and unchanged main source hashes. Existing count assertions are updated for seven public cards, 22 internal definitions, 14 latest identities and 92 cached resources. Historical identity/timing/audio/result assertions remain enabled. The completed-only source guard explicitly allows the narrow integration files while retaining its unchanged engine/storage/cloud/definition hashes and strict preservation of the original worker after removing only the six added URLs.

New browser checks exercise all three complete programs at every WORK/REST edge, Current/Next across all block boundaries, Pause/Resume, initial weights, no active editors, zero incomplete-session writes, invalid final values, explicit/idempotent Save, failure/retry, early End, old draft URLs, History/Progress and mocked owner-scoped cloud synchronization. Responsive/offline checks cover 320/390/768/1280px and 200% text with screenshots and keyboard controls. The existing Focus Mode screenshot regressions remain enabled.

**Final results:** 131/131 Node tests passed. The complete Playwright suite passed 388/388 (19.8 minutes); the final Oldschool/Library run passed 24/24 (2.7 minutes) after consolidating new code/time metadata into the existing grid cells and adding seven-card non-overlap assertions. Both mobile/desktop projects use the original single worker; no tests were skipped. All 75 protected runtime file hashes match main, including the original definitions and timer/audio/controller/storage/cloud/analytics code. All 92 resources are available offline. Screenshots, logs and the source audit are indexed at `/workspace/artifacts/oldschool-wods-005-007/index.md`. Browser checks use Chromium and synthetic fixtures; physical iOS/Android audio, screen readers and OS eviction remain device-dependent. No production data, merge or deployment is involved.


## Changed-file summary

- `src/data/oldschool-sailor.js`, `oldschool-tiger.js`, `oldschool-eagle.js`: three approved immutable v1 definitions; `oldschool.js`: shared 45/15 block boilerplate.
- `src/data/catalog.js`: append the three public cards and internal identities, preserving existing entries.
- `src/domain/oldschool-results.js`, `result-schemas.js`, `weights-finisher-results.js`: optional unique-weight adapter and schema dispatch.
- `src/ui/oldschool-results-form.js`, `block-result-form.js`, `session-weight-count-form.js`, `session-history.js`: reuse the existing form without an unapproved count group and render new saved snapshots.
- `src/ui/components.js`, `workout-presentation.js`, `workout-details.js`, `views.js`: opt-in card metadata, shared preparation weights, seven-card description. No CSS or active-view changes.
- `service-worker.js`: v33 and six additional runtime modules. Tests, source fixtures and README document and verify the integration.
