# Progress analytics foundation

## Scope and source of truth

`#progress` reads `listSessions()` from the existing session store. The domain module is pure: it never opens storage, writes records, reads weight preferences, reads weekly assignments, or calls Supabase. The UI supplies the existing `canReadLocal()` policy. Only accessible `completed` records with a nonempty session ID and a valid `startedAt` participate. Duplicate IDs contribute once, after ownership filtering. Imported/downloaded sessions therefore do not add another workout when the same ID already exists locally.

Guest sessions remain visible alongside the current account's owned sessions, exactly as in History. Other owners' sessions are excluded. No new stores, tables, saved aggregates, achievements, or analytics network requests exist.

## Dates, month and weeks

- The training date is always **startedAt**, never completion, save, import or sync time.
- Parse an explicit ISO timestamp with `Z` or an offset. Validate its Gregorian date/time first, rejecting impossible dates, ambiguous date-only/local strings, missing values and numeric coercion. Fractional seconds are accepted; JavaScript date precision is milliseconds.
- Convert each instant to the browser's current local calendar date. The current local month is selected initially; previous/next controls allow empty historical or future months.
- Monthly completed workouts count sessions with a valid training date. Active days count distinct local dates. Active weeks count Monday–Sunday calendar weeks touching this month with at least one of those dates.
- Calendar rows show Monday–Sunday; padding days outside the selected month are blank. Each row's trained-day count includes **only the selected month's dates**, as stated in the UI. Two sessions on one date count as two workouts and one day.
- Build calendar labels using Gregorian civil arithmetic, not multiples of 24 elapsed hours. DST folds/gaps and historical skipped-date timezone changes cannot duplicate a day cell. Session grouping still uses local time.
- No plan-based adherence denominator or universal training target is assumed.

## Duration and missing values

Sum only explicit, finite, nonnegative numeric `activeDurationMs` values in the selected month. Do not use a workout's planned duration or checkpoint as a fallback. Countdown/result-form times are not added by analytics. An explicit zero is accepted; null, missing, empty, strings, booleans, negatives, NaN and Infinity are not measurements.

If sessions exist but none has a usable duration, display **Not recorded**. With no sessions, display **No sessions**. With incomplete duration coverage, state the number included and the number excluded alongside the valid total. Workouts/days/weeks can still be counted when only duration is missing. Duration display uses whole elapsed seconds without rounding up.

## Recorded weights and identity

Strength and performance panels explicitly use **all saved history**, independently of the selected monthly overview/calendar.

Weight extraction reads only final `results`:

1. Current `results.exerciseWeights` maps.
2. Historical `results[phaseId]` exercise arrays with `exerciseId` and `weightKg`.
3. Historical AMRAP `results[phaseId].exercises` arrays.

This covers saved Focus 001 v2, Hybrid 001 v2, Focus 002, Hybrid 002, Monday v1/v2/v3 and the other current WODs. Snapshot ID/version must match the session and exercise/phase identities must be usable and unique; malformed snapshots cannot supply labels or metrics. No catalog replacement of historical definitions takes place. Unknown or bodyweight exercise entries are excluded.

A series identity consists of **workout ID + exercise ID + phase ID + equipment + target unit**. Different IDs are never merged by similar names. Equivalent same-ID historical records within a workout and phase can align across versions. Different workouts remain separate conservatively. A map value for an exercise appearing in several phases is labeled **Whole workout** and stays separate from actual per-phase measurements; no load is copied into unrecorded phases. Mixed duplicate representations contribute once per session/series (the map is considered first). Distinct phases remain distinct.

Only finite nonnegative numeric saved weights are accepted, including actual zero and decimals. Raw forms, prefilled fields, preferences, targets and prescribed weights are never fallback measurements. Series are ordered by the training instant, then session ID to make exact timestamp ties deterministic. **Latest recorded** is the last actual entry, not a new preference; **Historical maximum** is the largest recorded load, not an estimated one-rep maximum. Same-day measurements remain separate. No interpolation or inferred measurements are saved.

The dependency-free SVG chart has an accessible title/description and an expandable exact-value table (local timestamp, kg, workout version). Exercise and phase names come from saved snapshots. Labels/data use DOM text, not injected HTML.

## Recorded performance definitions

Totals include explicit nonnegative safe-integer final result values only. Blank is unknown, not zero. Each metric reports its number of recorded entries; missing counts never increase that denominator. Values with different units/definitions remain separate:

| Known snapshot schema | Accepted field | Meaning |
| --- | --- | --- |
| Monday `weights-finisher-v1` | `finisher.reps`, `exerciseId: thruster` | Explicit KB Thruster finisher repetitions |
| Thursday `thursday-weights-steps-v1` | `finisher.totalSteps`, `exerciseId: suitcase-high-knee-march` | Explicit total controlled steps, both holding sides |
| Friday `friday-weights-floorpress-rounds-v1` | `keyExercise.leftReps` / `rightReps`, matching exercise and `referenceSet: final` | Separate arm counts from the **final Floor Press set**, never all workout presses |
| Tuesday `tuesday-weights-rounds-v1` / Friday schema above | `finisher.fullRounds`, matching final AMRAP phase ID | Complete rounds of that specific WOD's saved circuit |

Definitions also retain exercise/circuit identity and relevant snapshot metadata. Circuit series include ordered exercise IDs, target definitions, equipment and phase duration; labels identify the actual circuit and targets. Definition comparison canonicalizes object keys so JSONB property-order changes do not split equivalent circuits. Different historical circuit definitions are not silently summed. Older schemas with ambiguous repetition/count meaning have no cumulative count adapter in this PR; their actual weights and monthly activity remain supported. Future count adapters can extend the pure engine without stored aggregates.

Never multiply prescribed reps by intervals, rounds or duration. Never turn partial AMRAP reps, interval completion counts or missing arm values into inferred workout totals.

## Account changes, errors and PWA

Progress subscribes to existing auth/sync notifications and completed-session events. Each asynchronous read captures an identity and generation. Account changes, newer reads and view disposal invalidate old work; a detached view cannot publish late results. Clear displayed data while reloading, including cross-tab auth storage events while new identity verification is pending. Unsubscribe listeners when leaving Progress. Sync completion refreshes downloaded results using the same read-only API.

If IndexedDB cannot be read, display **Progress unavailable** with a retry action; do not render zero overview cards. Invalid-date strings are excluded. The existing session API can itself reject structurally corrupt records (for example, a missing/non-string `startedAt` during its existing sort); that error is surfaced rather than modifying storage or the store API.

Cache **v29** preserves all 77 v28 resources and adds exactly `src/domain/progress-analytics.js`, `src/ui/progress.js` and `styles/hm-progress.css` (80 resources total). The existing waiting/activation/fetch policy is unchanged. Branding, manifest, install icons and all session data remain unchanged. Offline local/account data follows the existing cached identity policy; cloud access is not required for calculations.

## Validation

Final validation: **107 Node tests passed** (`npm test`) and **318 Playwright tests passed** across mobile and desktop (`npx playwright test --max-failures=1`, 15.4 minutes), with no failures or skipped cases. The focused corrected Progress/foundations browser suite also passed all 22 cases. Test fixtures are confined to `tests/` and never seeded by production code. Responsive screenshots at 320, 390, 768 and 1280px, each at normal and 200% text, are supplied in `/workspace/artifacts/progress-analytics/index.md`.

- Node: calendar/leap/year boundaries; Monday–Sunday grouping; Amsterdam DST folds/gaps, New York month offsets and Apia's skipped date; same-day sessions; ID deduplication; draft/owner exclusion; durations and missing numeric values; all historical final weight layouts; phase and exercise identity; actual zero; correct reps/steps/arm/round totals; rejection of inferred counts and corrupt snapshots; CSS scope and PWA contracts.
- Playwright: loading/empty/error/retry states, arbitrary month navigation, saved-session-derived cards, chart/table/exercise switching, data immutability, actual auth changes and mocked cloud downloads/repeated sync, guest/owned separation, delayed old-account reads, cross-tab account verification, logout/offline account recovery, offline new resources, four widths (320/390/768/1280), 200% text, keyboard, contrast, forced colors and footer clearance.
- Existing full Node/Playwright suites protect timer/audio/result/draft recovery, saved history, weekly plan, cloud sync, navigation, existing visuals and icon artwork. Only obsolete Progress-placeholder expectations and intentional cache-version/resource-count assertions are updated.

Browser checks use Chromium and test-only mocked accounts/cloud endpoints. They do not run against production Supabase, certify physical iOS/Android behavior or change production data. Calendar interpretation follows the device's current timezone, including if the device timezone changes later; no per-session timezone is added to saved data. No achievements or additional PR phase is implemented.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/domain/progress-analytics.js` | Pure session filtering, dates/calendar, historical weight normalization and explicit performance adapters |
| `src/ui/progress.js` | Read-only loading, account/generation guards, month navigation, cards/calendar/SVG/table and empty/error states |
| `styles/hm-progress.css` | Page-scoped HM/KB styling and accessibility states |
| `src/main.js` | Replace only the Progress placeholder and dispose its subscriptions on render/navigation |
| `index.html` | Load the new scoped stylesheet |
| `service-worker.js` | v29 and the three new precache resources; retain all existing resources/handlers |
| `tests/progress-analytics.test.js`, `tests/progress.spec.js`, `tests/helpers/progress-records.js` | New pure/domain/browser regressions and test-only saved-session fixtures |
| Existing test files | Update intentional cache-version/resource-count, CSS-list and obsolete Progress-placeholder expectations; retain unrelated assertions |
| `docs/HMKB_PROGRESS_ANALYTICS.md` | Definitions, limits, account/PWA behavior and validation |
