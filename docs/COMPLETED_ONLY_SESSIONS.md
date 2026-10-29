# Completed-only workout persistence

## Current policy

A new workout exists only in memory until the full workout has finished, all existing result validation passes and the user explicitly presses **Save Workout**. Starting, ticking, weight edits, Pause/Resume, block transitions, form changes, hiding/leaving the page and End Workout perform no incomplete-session writes to IndexedDB.

Normal **Pause / Resume** keeps the same in-memory timer, entered values, exercise, phase and audio cue tracker. It is not draft recovery. Existing exercise weight preferences remain separate: valid edits may still save those preferences immediately under their existing keys. Final-result corrections do not overwrite future preferences.

The result-envelope builder retains its compatibility name `createDraft()` and existing fields. Its use constructs an object, not a database record. Internal stage/checkpoint fields can still be present in the final completed snapshot; there is no checkpoint persistence or restoration path in the UI.

## Completion and save failures

- The existing result forms, schemas, validation, immutable workout snapshots and completeSession transaction are unchanged.
- Older multi-block workflows retain explicit Continue actions, validation between blocks and silent result-entry time. No database operation gates a block transition.
- Save Workout is enabled only through the existing final result form. It validates all required completion state and optional numeric entries, disables duplicate submissions while committing, and uses the same session UUID on retry.
- Success is shown only after the existing completed-session transaction succeeds. Ownership is captured in memory at Start, preserving what the initial draft transaction previously captured. A final save is blocked if the current identity differs, including during asynchronous account verification. Completed sessions retain their original owner, sync and History/Progress behavior.
- A failed final write leaves the current in-memory fields available, shows the existing retry message and re-enables Save Workout. Keep the page open to retry; reloading discards the unsaved form.
- Training no longer depends on opening IndexedDB. If storage is unavailable, the timer/forms can run, but the final save reports failure rather than claiming success.

## Leaving a workout

End Workout, footer/app links, Back/hash navigation and Return to Today from an unfinished result form use the main router's single existing exit guard:

> End this workout? Your progress will not be saved.

Cancellation keeps the same live controller and clock. Confirmation disposes the timer/audio, releases the unsaved form/state and navigates to the chosen destination (Today for End Workout). There is no second controller-level confirmation. An unsaved final results form remains protected even though the timer has finished.

The existing browser beforeunload warning remains for unfinished sessions where supported. Browser refresh/close, process termination and document departure lose unsaved work. A page restored from the browser back/forward cache is rendered as a ready screen, not a recovered timer. Normal tab/background visibility changes keep the live in-memory timeline and existing missed-cue suppression; no audio or timer calculations change.

## Routing and old data

New sessions use `#active/{workoutId}/{version}`, without a session/draft query parameter. Reloading that URL shows **Ready when you are** and requires Start Workout. An old `?draft={id}` link also shows the ready screen and neither reads nor writes the referenced draft; explicit Start creates a fresh in-memory UUID and uses the normal active URL.

Workout Detail and ready screens have no Resume draft buttons. View saved sessions and all completed-session links remain.

Legacy draft rows are **left untouched and unused**. There is no destructive migration, database clearing, automatic cleanup, schema change or overwrite of historical results. The storage module's compatibility APIs remain available for existing data/tests; the production workout controller does not import or call putDraft/getSession. History and Progress continue filtering accessible completed rows under the unchanged ownership policy. Legacy drafts do not count toward analytics or cloud session upload.

## Implementation scope

- `src/ui/block-training.js`: in-memory state, explicit final save only, no draft recovery/status UI, controller disposal.
- `src/ui/views.js` / `src/ui/session-history.js`: remove draftActions integration/implementation; preserve completed History.
- `src/main.js`: normal active routing, one shared exit guard including results, browser document-departure disposal.
- `service-worker.js`: v29 → v30, retaining all 80 precached resources and the existing waiting/activation policy.
- No workout definitions, timer engine, cue/audio modules, result schemas/forms/validators, storage schema/transaction code, Auth, Supabase or sync logic change. No CSS or visual redesign is introduced.

## Verification

Focused browser regressions instrument session-store writes and verify zero writes before explicit final Save, including edits, pauses, multiple blocks and visibility changes. They also cover cancellation/confirmation, all four footer targets, Back, results exit, refresh/unload warning, old deep links and every detail/ready route, failed-save retry with the same UUID, double-click saving, offline completed History/Progress and byte-identical old draft/completed rows.

Existing recovery tests are intentionally updated to exercise the supported in-memory pause/form behavior and to assert old links stay inactive. Their exercise, phase, duration, validation, load, audio, ownership, offline, historical-snapshot and responsive assertions remain. Screenshot fixtures reach results through real Start and elapsed time instead of recovering seeded drafts. Frozen historical controller comparisons omit only their obsolete draft-status paragraph; historical fixture files are unchanged.

Final full-suite results: **108 Node tests passed** (`npm test`) and **338 Playwright tests passed** (`npx playwright test --max-failures=1`, mobile + desktop, 14.9 minutes), with zero failures or skipped cases. This includes all 20 new completed-only browser cases. The focused route/audio/visual checks passed 26 cases. The reported full browser run completed with exit code 0. Browser coverage uses Chromium at mobile/desktop widths, 200% text, keyboard/forced colors and test-only fixtures/mocked cloud endpoints. Physical browser unload/BFCache/OS process eviction behavior remains platform-dependent; no recoverability is promised.
