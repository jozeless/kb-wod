# 40/20 workout releases and clearer audio

## Base and draft dependency

Base: merged main `c6dd9d9` (Progress Analytics PR #28). The separate `feature/remove-workout-drafts` work is **not merged in this base**. This PR stays independent: existing draft writes, recovery, result validation, routes, ownership and final-save transactions remain as on main. No other branch is merged/cherry-picked and completed-only persistence is not introduced here.

## Append-only releases

The Library is pinned, in order, to Monday Paranoid **v4**, Tuesday of Spades **v2**, Thursday Bells **v2** and Friday To Black **v2**. All 15 previous definitions stay registered (19 total). Their released data source files remain byte-identical. New modules clone the previous released snapshots via a small pure upgrade factory; exercise IDs, order, targets, rounds, durations and result schema identifiers are retained.

| New release | Normal 40s WORK / 20s REST blocks | Special phases, unchanged | Active duration |
| --- | --- | --- | --- |
| Monday v4 | Upper 8 slots / 8 min; ABS 6 / 6 min; Legs 6 / 6 min | Two automatic 5s transitions; 60s KB Thruster repetitions with no programmed rest | 21:10 |
| Tuesday v2 | Strength 8 / 8 min; Conditioning 8 / 8 min | 4 min AMRAP: 8 KB Thrusters, 8 Hollow-Ups, 10 Jump Squats | 20:00 |
| Thursday v2 | Upper 6 / 6 min; ABS 6 / 6 min; Legs 8 / 8 min | Two automatic 5s transitions; 60s Suitcase High-Knee March, RIGHT 30s / LEFT 30s, automatic WORK cue at the hand switch | 21:10 |
| Friday v2 | Strength 8 / 8 min; Conditioning 8 / 8 min | 4 min AMRAP: 6 Goblet Squat + Curl, 20 Mountain Climbers, 6 Burpees | 20:00 |

Every normal slot includes its full final 20s rest. Existing `WorkoutTimer` interval compilation and semantic cue tracking are reused unchanged. There is only the initial 3s countdown, outside active duration. No extra block countdown/rest is added. The two 5s transitions and each finisher phase are deep-equal to the prior release, including circuit targets and side-hold definitions.

Normal active exercise text leads with **40 seconds work / 20 seconds rest** and controlled technique. It does not show a mandatory numerical target. Details retain the unchanged numerical ranges as **Optional reference** information. Finisher targets, counts and result fields remain meaningful and unchanged. No completed reps are inferred from time; timer progression never waits for a repetition target.

## Friday benchmark context

Friday v2's fourth Floor Press work interval is **06:00–06:40**, followed by rest **06:40–07:00**. The full slot is still **06:00–07:00**. New instructions, exercise notes and recording descriptions state both times. The actual result fields remain `keyExercise.exerciseId`, `referenceSet: final`, `leftReps`, `rightReps`.

A shared read-only formatter uses the saved workout snapshot's phase format/timer. Friday v1 forms/history retain their exact old 06:00–07:00 explanatory strings. V2 forms/history describe the 40-second work interval and the full slot; no old snapshot or stored result is migrated.

Progress keeps weight points aligned across versions where workout/exercise/phase/equipment/target-unit identity remains equivalent. Friday final-set count metrics additionally distinguish **40s work** from historical **60s work**. Their per-arm cumulative counts are shown separately; neither is labeled as total workout presses. The unchanged four-minute finisher circuits can still share completed-round totals across versions. Monday's 60s Thruster and Thursday's 60s step totals retain their existing definitions. No saved analytics records or new stores are introduced.

## Louder audio profile

Only the four new releases declare `audioProfile: clear-loud-v1`. Archived/historical workouts, including old weekly assignments, keep the exact original sine tones, frequencies, durations, gaps and peak levels. Profiles are selected through the existing audio infrastructure, not a settings panel.

The new profile uses one band-limited Web Audio **triangle oscillator** per note, with mild odd harmonics, rather than a quiet sine. Existing pitch/pattern semantics remain distinct:

| Cue | Frequency | Shape | New envelope peak |
| --- | --- | --- | --- |
| START | 640 Hz | One 380ms beep | 0.74 |
| MINUTE (profile compatibility) | 760 Hz | One 120ms beep | 0.64 |
| REST | 520 Hz | Two 110ms beeps, 100ms gap | 0.68 |
| WORK | 1040 Hz | One assertive 230ms beep | 0.78 |
| FINISHER | 880 Hz | Two 110ms beeps, one 360ms beep; 100ms gaps | 0.74 |
| COMPLETE | 620 Hz | Two 400ms beeps, 160ms gap | 0.72 |

New 40/20 phases emit REST/WORK rather than MINUTE. Transitions start silently and the next normal block gets one WORK cue. Finishers and final completion have only their own cue. The original tracker, note lengths/gaps, 12ms attack / 35ms release, 15ms cancellation fade and single-voice scheduling are unchanged. Pause, leaving, mute API and disposal cancel pending notes; returning from background consumes missed cues without replay. Start/Resume/Continue retain browser user-gesture audio unlocking and failure isolation.

Native 48kHz OfflineAudioContext measurements found **2.16–2.38× RMS**, approximately **+6.68–7.52 dB**, relative to the matching historical pattern. Actual rendered absolute peaks were **0.630–0.763**, below the 0.78 envelope cap and below digital clipping at 1.0. Checks cover silent gaps and near-zero onset/end samples, and confirm unchanged old sine levels. Measurements are in the review artifacts, not hardcoded workout results.

These measurements demonstrate a stronger digital signal. They do not override physical media-volume limits, autoplay restrictions, a muted phone, or guarantee audibility on every speaker. Real phone/speaker listening and locked-screen browser behavior remain manual checks. No new WAV/MP3, downloaded audio, music, external libraries or dependencies are added; archived audio files remain untouched.

## Preferences, plans and saved data

New preferences use the existing workout ID/version/exercise key scheme. Each new version declares its immediately previous version as a read-only preference source. Existing valid values and explicit cleared/null preferences can be read without migration; changes and clears write only the new version. Declared source schema metadata allows a cleared preference from a prior weights-based schema to stay blank. The behavior of older source declarations is unchanged. Historical result values are never used as future preferences.

**Existing weekly assignments do not upgrade automatically.** A Monday v3 assignment remains v3 and retains its EMOM programming/old audio. Use Today → Change workout → choose the newest Library card to opt into 40/20 and the louder profile. All seven day slots, cancellation, removal, existing saved snapshots and historical version URLs remain supported. Tests verify changes to one assignment preserve all others.

Storage schema, Supabase/Auth/sync code and all result validation modules/forms (except Friday's snapshot-based explanatory description) are unchanged. New final results are saved through the same existing API and JSONB contract. The existing SQL accepts any positive workout version; no SQL or production changes are needed or executed.

## PWA and scope

The actual base cache v29 advances to **v30**. All **80** existing resources are retained; six modules are added (four release files, the clone/interval factory and Friday's benchmark formatter), **86 resources total**. Service-worker install/activation/fetch handlers are unchanged. No new force activation or client reload behavior is added. Manifest, install icons, header artwork, navigation, CSS and unrelated page designs stay intact.

## Validation and artifacts

**Final complete suites: 121 Node tests passed** (`npm test`) and **338 Playwright tests passed** (`npx playwright test --max-failures=1`, mobile + desktop, 16.9 minutes), with zero failures or skipped cases. All 20 new browser cases passed. The all-details regression now verifies all 16 real versions (the original 12 plus four releases). Focused Node/browser checks cover exact boundaries, exercise/round ordering, complete final rests, finishers, no extra countdowns, one semantic cue per boundary, profile headroom/native rendering, pause/exit/background behavior, old/new Friday labels, weight-series identity, separate benchmark totals, unchanged historical rows, save idempotency, old assignments/manual upgrades, cached modules and offline completion.

Responsive screenshots cover 320, 390, 768 and 1280px: details, WORK, REST, normal and 200% text, keyboard focus, ring/next/remaining labels and footer clearance. They use test-only synthetic state and are not production session data. The artifacts index is `/workspace/artifacts/wod-40-20-louder-audio/index.md`. Chromium desktop/mobile emulation is automated; physical iOS/Android listening, installation and sleep behavior are not certified by these tests.

No merge, deployment, production SQL, workout/session migration or second PR is part of this change.

## Changed-file summary

- New release data: `monday-paranoid-v4.js`, `tuesday-of-spades-v2.js`, `thursday-bells-v2.js`, `friday-to-black-v2.js`, with `workout-40-20.js`; catalog registration/pinning.
- Audio: `src/platform/workout-audio.js` opt-in profile; the two active controllers pass profile and time-first presentation options. Their draft/recovery/persistence/timer flow is unchanged.
- Presentation: `exercise-prescription.js`, Friday result-form explanatory text and snapshot-based saved-history description.
- Measurement context: `src/domain/friday-benchmark.js` and the Friday per-arm aggregation definition in Progress.
- Preferences: `readWeightPreference()` recognizes the declared previous schema's explicit cleared values; no preference rewrite/migration.
- PWA: v30 plus six resources; all previous resources retained.
- New Node/browser regressions, intentional latest-Library/catalog/cache test updates, README and this document. Old direct-version programming, result, recovery and audio assertions remain.
