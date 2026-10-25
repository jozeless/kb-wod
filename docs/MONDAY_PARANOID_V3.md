# Monday Paranoid v3

V3 is a new immutable release under `monday-paranoid`, never an edit or migration of v1/v2. Library offers v3; existing weekday references keep their stored version until manually reassigned. The approved HM/KB card treatment is unchanged. No production SQL or deployment is performed.

## Timeline

| Workout clock | Phase | Format |
| --- | --- | --- |
| 00:00–08:00 | Upper | Four unchanged v2 movements, two EMOM rounds |
| 08:00–08:05 | Transition to ABS | Automatic five-second rest countdown |
| 08:05–14:05 | ABS | Three unchanged v2 timed movements, twice at 40/20 |
| 14:05–14:10 | Transition to Legs | Automatic five-second rest countdown |
| 14:10–20:10 | Legs | Three unchanged v2 movements, two EMOM rounds |
| 20:10–21:10 | Final Finisher | One continuous minute of KB Thruster repetitions |

The initial 3–2–1 is additional. `activeDurationMs` is exactly 1,270,000 at completion, including the two planned transitions and existing work/rest intervals, excluding the lead-in and user pauses. There is no extra rest before/after the finisher and no intermediate results form. Both transitions and the finisher use the same monotonic engine and paused checkpoint recovery as the other workouts. Transition segments have no exercise; `amrap-reps` has exactly one. The ten v2 exercises, targets, order and training timers remain unchanged.

The existing cue tracker and audio assets are unchanged. Start plays once. Full elapsed-minute cues occur at 01:00–21:00; completion occurs at 21:10. The six existing 40/20 rest beeps occur at 08:45, 09:45, 10:45, 11:45, 12:45 and 13:45. Five-second transition clocks remain visible and keep the existing synthesized boundary/countdown cues. Pause/mute and stale-cue suppression remain shared. No new 40/20 WAVs or audio redesign is included.

## Session weights versus preferences

At creation, v3 takes a raw-string snapshot of all eleven selected weights into `form.weights`. A missing v3 preference may read the matching v2 preference for the original ten movement IDs; it does not write or migrate v2. Thruster begins blank unless its own v3 preference exists. Zero and blank remain distinct.

Valid edits to the active exercise's weight update the session draft immediately and separately attempt the normal preference write for future workouts. A preference failure does not discard the in-memory session weight; draft-save status separately confirms the IndexedDB commit. Invalid live inputs leave the last valid value intact and show an error. Repeated rounds and paused recovery read the session snapshot, so later preference changes cannot replace recorded session weights.

Only the new `weights-finisher-v1` preference schema reserves JSON `null` as an explicitly cleared v3 preference. This prevents an older v2 weight from reappearing after the user clears v3. Missing keys may fall back; explicit null never does. Old versions retain their existing preference encoding/validation, including preserving invalid legacy data. This is a version-scoped addition, not a rewrite of old preferences.

The final editable summary has eleven kg inputs, one nonnegative integer Thruster-repetition input, optional integer effort 1–10 (very easy to maximum), and optional notes. No round repetitions, interval counts, status/score or duplicate finisher weight are collected. Corrections in this final summary change only the session; they do not rewrite future preferences. The finisher counts each technically correct complete Thruster once and never estimates repetitions from time.

## Completed result contract

The stored snapshot has `execution.schema: weights-finisher-v1`; it dispatches only this release to the compact form/history renderer. Old snapshots retain their original validators and history views. The normal session UUID/identity/version, timestamps, completion state and local-first transaction remain unchanged.

`results` has:

- `exerciseWeights`: all eleven exercise IDs mapped to a nonnegative kg number or null: `push-press`, `offset-push-up`, `staggered-stance-row`, `overhead-triceps-extension`, `dead-bug-chest-press`, `standing-wood-chop`, `kick-through`, `front-rack-squat`, `swing`, `step-up`, `thruster`.
- `finisher: { exerciseId: 'thruster', reps: number | null }`, where reps is an integer. Its weight exists only at `exerciseWeights.thruster`.
- `perceivedEffort`: integer 1–10 or null.
- `notes`: optional text, empty string if not entered.

Empty numeric fields become null; measured zero remains zero. IndexedDB saves locally first; existing owner-bound pending sync/idempotent upsert uploads the same results and complete session envelope to the current JSONB tables. No SQL schema change is required. Synced appears only after confirmation. Existing login, import, ownership isolation, plan sync and UUID behavior remain unchanged.

## Verification and limits

Unit/browser coverage verifies the exact sequence/duration, ten-movement parity with v2, automatic transitions, both transition recoveries and finisher recovery, all eleven weights and preference isolation, failed preference writes, zero/blank, compact final validation, offline history, v1/v2 saved records and drafts, confirmed mocked cloud retry and existing workout regressions. Static cache v13 includes all definition versions and new schema/form modules.

The session stores the **last recorded working weight per exercise**, not a per-round/load-change event history. Preferences remain device-local; completed session weights synchronize with history. Repetitions are entered manually. Browser/OS eviction can still lose uncommitted writes/checkpoints, as documented for existing sessions; wait for Draft saved locally when testing recovery. Real iOS/Android audio/lock behavior and live-project connectivity remain manual checks. Automated cloud tests use mock endpoints and do not access the real v2 session in Supabase.
