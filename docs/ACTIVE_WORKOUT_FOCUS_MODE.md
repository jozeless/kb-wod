# Active Workout Focus Mode — PR 30

Branch: `feature/active-workout-focus-mode`. Base: merged main `bc8f63f` (PR 29).

## Presentation

The user-supplied Focus Mode image is the visual reference, not an application asset. The live screen now follows its exact hierarchy: phase/state; yellow/purple circular countdown; two circular icon-only Pause/Resume and End Workout controls; prominent Block Remaining / Total Remaining values; one Current Exercise / Next card. Existing local UI typography and HM/KB tokens are retained, with flat surfaces and no new dependencies, fonts, images, audio assets or animations.

The global header, account controls, local-save success indicator and bottom navigation disappear only while a `.hm-active-view` is mounted. A child-list observer on `#app` updates an explicit body class. This responds to timer → results → continuation and saved confirmation replacements without requiring a hash change. Normal chrome remains available in preparation, result forms, saved sessions, Today, Library, History, Progress and Account. Existing storage failure messages remain visible; only routine draft-saving/saved messages are hidden during the timer.

The shared presentation consumes the existing snapshot and controller values. Ring geometry and progress arithmetic remain unchanged. Legacy timers bind their Block Remaining value to the existing compiled phase end; no timer, timeline or cue engine changes. Countdown, WORK, REST, TRANSITION, AMRAP, AMRAP REPS and PAUSED remain explicit. The same real current/next exercises update automatically. AMRAP circuits retain compact names and existing repetition targets. Thursday's holding side and automatic LEFT hand handover remain visible.

The two controls retain their original handlers and confirmation flow. Inline SVGs replace visible button text, with dynamic `aria-label="Pause"` / `"Resume"` and `"End Workout"`, keyboard focus and at least 44px touch targets. Existing timer labels, polite phase/side announcements and accessible overall progress are preserved. The UI uses container-relative timer digits, wrapping names and scrolling where needed rather than shrinking important information to force it onto one screen. Metrics sit side by side where there is room and wrap at increased text sizes. Safe-area padding and forced-colors states are included.

## Protected functionality

Active weight editors, repetition explanations, round descriptions and introductory titles are no longer attached to the presentation. Preparation weight preferences and session initialization are unchanged. Final result forms still contain the original actual-weight fields, validations and corrections. Correcting a result does not overwrite the user's future weight preference. Old recovered draft weights remain intact.

Workout definitions, sequencing, 40/20 intervals, durations, automatic transitions, finishers, timer engines, loud audio profiles/cue timing, mute recovery, pause/resume, End confirmations, result validation, save/continue behavior, IndexedDB schemas, ownership, Auth/Supabase sync and Progress are preserved. The separate draft-cleanup feature is not included: merged main still has draft persistence and recovery. Controller changes are limited to displayed nodes, text/accessible-name bindings, compact circuit rendering and the presentation state of the existing storage-status message.

## Files

- `src/ui/active-presentation.js`: shared hierarchy, ring, SVG controls, compact exercise card and snapshot state labels.
- `styles/hm-active.css`: focused presentation and chrome rules gated by `body.hm-training-focus`.
- `src/ui/block-training.js`, `src/ui/active-workout.js`: presentation bindings for current, historical and multi-block workouts; persistence and timer behavior retained.
- `src/main.js`: mounted-view observer for chrome restoration, including same-route replacements.
- `service-worker.js`: v30 → v31, exactly the same 86 precached URLs and unchanged activation policy.
- `tests/active-focus.*`: focused hierarchy, state, weight/result integrity, restoration, failure-message, accessibility and layout regressions.
- Existing regression tests: update only obsolete visible-label/editor/chrome expectations and the cache version. Weight assertions now check prepared values in the draft and corrections in the existing final form. Audio, elapsed time, checkpoint, save, history, ownership and cloud-payload assertions remain.
- `tests/helpers/ui-baseline.js`, `tests/fixtures/ui-v2-29/`: exact main presentation/controller/CSS fixtures for before/after comparison, served only by tests. Historical header/footer comparison harnesses recognize that live timer chrome is intentionally hidden. Fixtures are not precached or shipped as runtime assets.

## Verification and screenshots

Run `npm test` and `npx playwright test` with the repository's original single-worker mobile/desktop configuration. Validation covers current releases and historical Focus/Hybrid versions, both transitions, AMRAP circuits, Thursday handover, complete workouts, every audio boundary, native audio envelopes, historical muted draft Resume, pause/background recovery, final corrections/saving, historical records, mocked cloud sync and the PWA under `/kb-wod/` offline.

Responsive checks cover 320, 390, 768 and 1280px, 200% text, keyboard, forced colors, contrast, touch sizes, horizontal overflow and vertical overlap. Before/after captures use frozen-clock synthetic data and the exact merged-main source fixtures. WORK, REST, PAUSED, countdown, AMRAP and Thruster finisher states intentionally differ; completion and the protected non-active screens remain pixel-identical.

Local evidence: `/workspace/artifacts/active-workout-focus-mode/index.md`. The `comparisons/before` and `comparisons/after` folders contain full-page images at all four widths; after images also include viewport captures. Separate work/text-scaling images include 200% text. Full-page comparison screenshots hide fixed navigation only during capture; separate viewport evidence retains the actual chrome behavior. No screenshot contains actual user session data.

**Final verification:** `npm test`: 122/122 passed. Complete Playwright run: 350/350 passed (16.8m, both projects). After adding the storage-warning regression and extending special-state text-scaling checks, the final Focus Mode / active timer / navigation run passed 42/42 (4.6m). Across these successful runs, all 352 distinct browser cases in the final tree were verified; no test was skipped. The additional run also verifies the web-first wait for asynchronous timer mounting. All 56 screenshot pairs passed: 24 intended changes and 32 identical protected/completed screens. A source audit confirms 80 runtime files outside the six-file UI/cache change remain byte-identical to main; all four baseline fixtures match main exactly. Logs and structured results are included with the local evidence.

## Limits

The reference's sample exercise and clock values are not copied; the real current workout drives the display. Light text is used for small labels on the purple card to meet contrast requirements; the approved purple accent remains on borders, the arrow and stop control. Existing local fonts remain instead of adding a display font. AMRAP lists, long historical exercise names and 200% text may require vertical scrolling. Automated Chromium checks do not certify physical iOS/Android safe-area insets, every screen reader or physical speaker loudness. No production Supabase access, SQL, data migration, deployment or merge is part of this PR.
