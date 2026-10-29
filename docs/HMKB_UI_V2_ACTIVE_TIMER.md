# HM/KB UI v2 — PR 08: Active Workout Timer

Branch: `feature/ui-v2-08-active-timer`. Base: `f8a8ab7` (merged PR #24).

## Visual scope

The approved timer image guides the centered composition: strong uppercase workout title, yellow phase context, circular yellow/purple timer, purple Current Exercise card, smaller Next information within that card, and yellow Pause / purple End Workout controls. The app's existing header, navigation and local UI typography remain intact; no new font, icon file, image, sound file or dependency is required. Decorative pause/play/stop marks use CSS.

The four approved WODs use `block-training.js`; historical/simple WODs use `active-workout.js`. Both now reuse `src/ui/active-presentation.js`. It rearranges existing nodes and renders an SVG ring from the existing timer snapshot. It does not own a clock, schedule cues, calculate workout programming or write data. The ring shows the fraction remaining in the current segment (the initial countdown uses its three steps). Existing overall workout progress remains available to accessibility APIs.

The timer retains `role="timer"`, with remaining-time labels. Existing polite phase/exercise/holding-side regions remain. READY, WORK, REST, TRANSITION, AMRAP, AMRAP REPS and PAUSED have explicit text labels. Thursday's right/left hand and automatic handover stay visible. AMRAP uses the existing circuit and actual targets/weight fields; bodyweight entries retain no weight input. Completion leaves the active-only wrapper and displays the original result form or historical completion screen.

## Audio and data protection

There is no visible or hidden Sound button, and no replacement switch elsewhere. Fresh sessions still enable Web Audio from the Start Workout gesture using the unchanged audio infrastructure. Browser audio failure remains nonfatal. Existing `soundEnabled` values are retained for recovered drafts, including historically muted drafts; recovery does not silently rewrite that preference. Pause, resume, audio patterns, cue timing and missed-cue suppression remain unchanged.

No catalog, exercises, durations, phase order, timer engine, audio/cue module, result schema/form, weight storage, session store, IndexedDB schema, Auth, cloud sync, SQL, Today, Library, pre-workout details, header, navigation, Stats or Dashboard code was changed. Persistence, recovery, block continuation, completion and save functions are byte-identical to the base. Existing actual weight inputs and their handlers are moved, not recreated or replaced by sample values.

## Files

- `src/ui/active-presentation.js`: shared active-only presentation and SVG ring.
- `src/ui/block-training.js`, `src/ui/active-workout.js`: connect that presentation; remove visible Sound controls.
- `styles/hm-active.css`: selectors scoped to `.hm-active-view`, HM/KB tokens with local fallbacks.
- `index.html`: load the stylesheet after the existing HM/KB styles.
- `service-worker.js`: cache v25 → v26; retain all 69 previous precache URLs and add the stylesheet and presentation module. Activation policy and app identity are unchanged.
- `tests/active-timer.spec.js`, `tests/active-timer.test.js`: active-state, responsive, visual, scope and offline checks.
- `tests/helpers/ui-baseline.js`, `tests/fixtures/ui-v2-07/`: original-controller comparison fixtures, byte-identical to merged main, served only by screenshot tests. Test fixtures are not production assets.
- Existing tests: update cache/style ordering, artifact paths and intentional Sound-control expectations. Native rendered audio and API mute/unmute coverage remain; unrelated assertions are retained.

## Validation and evidence

Verification uses Chromium mobile/desktop projects with the original single worker, and widths 320, 390, 768 and 1280. The new checks cover circular progress/countdown reset, pause freezing, resume/recovery, exercise-specific weight edits, End Workout, both automatic five-second transitions, 40/20 boundaries, finisher, AMRAP circuits, holding-side switch, original result fields and offline starts of all approved WODs plus historical Focus. Existing full-workout audio tests still check every cue boundary and native Web Audio rendering/envelopes/no overlap. Browser-blocked audio is tested separately.

Responsive checks cover no horizontal overflow, readable exercise/Next content, controls above the fixed navigation at the bottom of the scroll, 44px minimum targets, keyboard/focus, 200% text, forced colors and reduced motion. Controls naturally stack when scaled text needs more room. The ring stays an SVG circle without animations or extra timing loops. Visible text contrast is checked against solid surfaces at AA thresholds; state names do not depend on color.

Screenshots are local review artifacts at `/workspace/artifacts/ui-v2-08/index.md`: countdown, work, rest, AMRAP, paused and completion at all four widths; Today, Library, details, results, saved history/list and account. Baseline captures use the actual main controllers and omit only the new stylesheet. Completed/result/protected screens must remain pixel-identical, including the header and bottom navigation. Capture data is synthetic and fixed-clock; it does not represent real sessions or statistics. Full-page captures hide the fixed navigation only while taking that image; separate viewport captures retain the actual navigation. Additional 200% text captures are under `accessibility/`.

Final validation: **88 Node tests passed; 270 Playwright tests passed (12.8 minutes, one worker, mobile and desktop), with no failures or skipped cases**. All 52 screenshot pairs passed: 20 intentionally changed active states and 32 identical completion/protected screens. All 111 JavaScript files parse; all 53 reachable runtime modules are precached. Pixel hashes and source checks are recorded with the delivery artifacts.

## Limits

The approved mockup's sample exercise, load, reps, duration and round count are not copied: displayed content always comes from the actual WOD and current session. Native UI typography is retained instead of introducing an unapproved display font. Narrow screens and AMRAP lists may scroll; the header and bottom navigation intentionally retain their existing design. Automated browser checks do not certify physical-device audio loudness, all mobile audio policies or every screen reader; no live Supabase or production data was used.

No merge, deployment, data migration or next UI phase is included.
