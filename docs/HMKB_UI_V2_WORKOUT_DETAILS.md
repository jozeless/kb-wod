# HM/KB UI v2 — PR 06: Pre-workout details

Base main: `b7e4fa9`, after GitHub PR #22 merged. Branch: `feature/ui-v2-06-workout-details`.

## Scope and visual changes

Only the real pre-workout detail interface and its existing action controls are redesigned. All generation in `workoutDetails()`, exercise prescriptions, duration formatting, weight-field factories and recording summaries remains byte-identical to main.

- The workout name remains the dominant heading in strong readable system UI lettering. Branding/version text stays visible. The existing category/duration line is highlighted as a purple panel with a restrained yellow edge; its exact text and `formatTime()` calculation are unchanged.
- The proportional phase bar keeps all phase IDs, segments, colors, accessible descriptions and percentages. Its overview presentation is 10px high with more separation from adjacent sections.
- Every existing phase becomes a purple bordered, rounded block. Actual numbered headings, names, durations and formats remain unchanged. Automatic transitions retain their explicit “Automatic rest transition” label and no exercise list/weight fields; they are not converted into exercise blocks. EMOM, intervals, AMRAP, repetition finishers and timed-side formats retain their actual content.
- Exercise names remain complete and wrap naturally. Name/weight groups use wrapping flex layout: input beside the name at all four normal test widths, below it when smaller space or enlarged text requires wrapping. Actual targets remain visible below, followed by original notes/attribution. No target is moved into collapsed instructions.
- Existing number fields have dark backgrounds, lilac borders, readable text and at least 44px height. The field width scales with `rem` and wraps rather than compressing names. No values, labels, attributes, validation, listeners or storage keys are changed. Bodyweight exercises still receive no kettlebell input.
- Native `<details>`/`<summary>` instructions keep the same open/close behavior and full instructions/objectives. A dark summary surface with lilac text, 44px minimum target and visible focus improves separation. No essential previously visible content is hidden.
- The existing workout-specific recording description and `resultFields` labels become a clearly separated purple information panel. These remain descriptions; no result inputs, schemas, stats or achievements are added.
- Original purpose, warm-up, suggested-day and load guidance remain complete. **Start Workout** is now yellow/dark and full-width with a minimum 48px target. Back to Library, saved-session and draft controls retain their original labels, callbacks and destinations, with scoped purple surfaces and visible focus.

No new palette, artwork, icon, typeface, dependency, shadow, gradient or animation. Palette/radius tokens reuse the established roles; matching fallbacks keep token-disabled regression fixtures stable.

## Isolation and protected behavior

`src/ui/views.js` adds only `view.classList.add('hm-detail-view')` inside the existing `w.phases.length && stage === 'workout'` branch. Every new selector in `styles/hm-details.css` begins with `.hm-detail-view`. This confines internal `.hm-workout-overview` styling and page-level controls to pre-workout details.

Real historical workouts with phases receive the same pre-workout treatment while keeping their definitions and behavior. Demo/fallback views, active-ready links, result placeholders and active workout controllers receive no scope class. Tests explicitly exercise these distinctions. Styling is not attached to `main`, general buttons, inputs, `.exercise-list`, `.phase-bar` or `.secondary` globally.

Today, Library, header/navigation, active timers, results, saved sessions/history grids, account, Stats and Dashboard remain protected. All existing CSS/token files remain unchanged. Shared components, `workout-details.js`, `exercise-prescription.js`, `weight-field.js`, `workout-presentation.js`, all storage/data/domain/audio/cloud modules and SQL remain unchanged. The one new scope class does not alter callbacks, routing, weekly assignments, timer initialization or data generation. No production access, migration, merge, deployment or next UI stage.

## Responsive and accessibility checks

The four approved WODs are checked at **320, 390, 768 and 1280px**, with normal and **200% root text**. Flexible headings/format text, full-width targets and wrapping name/input groups prevent overlap. Native summary controls and number fields retain accessible labels and at least 44px targets. Last actions remain reachable above the unchanged fixed bottom navigation. Nothing is made sticky or overlaid on workout content.

Names/metadata and recording guidance use light text on dark/purple surfaces (13.48:1 / 10.83:1). Small lilac labels and summary text sit on dark backgrounds (4.96:1); yellow/dark CTA contrast is 12.94:1. All visible enabled own-text nodes are audited against nearest opaque backgrounds at normal size (4.5:1 normal / 3:1 qualifying large text). This does not certify every native pseudo-element, disabled state or assistive-technology interaction.

Actual Tab/Shift+Tab/Enter tests cover field focus, native accordion behavior and action controls. Outlines are not clipped by hidden containers. Forced-colors mode uses system Canvas/CanvasText, ButtonFace/ButtonText and Highlight. New presentation is static and respects reduced-motion use without introducing animation.

## Weight and functional verification

Dedicated tests confirm exact names, IDs, versions, durations (Monday v3 1270s, Tuesday v1 1200s, Thursday v1 1270s, Friday v1 1200s), phase order, all exercise names/targets/notes, phase percentages, instructions/objectives, recording summaries and guidance. A historical Focus v1 detail is also checked, including offline access.

Weight tests edit independent exercises/workouts with decimal values, persist zero, clear a field, reject negative input without replacing its prior stored value, and verify navigation/reload recovery. Existing `min=0`, `step=any`, `inputmode=decimal` and ARIA labels are asserted. No prescribed/default loads are introduced. Existing unavailable-storage/weight/session suites remain enabled as well.

The original `tests/weights.spec.js` name-left/input-right check is retained unchanged. The name flex basis allows both columns to fit at 320px while enlarged text can wrap the input below the name. This preserves the stricter existing normal-width layout check without narrowing the 7rem field or changing any input logic.

Action tests start each of the four real countdowns, pause, leave a recoverable draft, return to the detail, resume the existing draft and open saved-session history. Dedicated visual fixtures include a readable saved session and the actual history list. Weekly plans remain unchanged. Demo/active-ready/result fallback routes retain their prior styling and never receive the detail class.

## Screenshots and comparison method

Artifact root: `/workspace/artifacts/ui-v2-06/`. `index.md` links all actual viewport before/after images and full-page WOD captures; `comparison.json` records hashes.

- **16 intentional detail pairs:** all four WODs at all four widths. `{width}-{workout-id}-details[-viewport].png` in `before/` and `after/`.
- **28 protected pairs:** Today, Library, running timer, result form, saved session, history list and account at all four widths. `{width}-{screen}[-viewport].png` in both directories.
- Header/navigation images match in all 44 pairs. The four detail pages' `.hm-workout-overview` inner HTML must match exactly before/after: all original content and semantics are preserved. Protected screens require identical viewport/content pixels plus matching styles/relative geometry.

Before captures omit only the new detail stylesheet; the inert scope class remains in both. Fixtures use isolated synthetic local assignments/results and frozen clocks, with audio unavailable solely in visual captures. No private/production data is captured. Full audio behavior is independently checked by the existing full suite.

Actual `*-viewport.png` captures show the unmodified viewport, header and navigation. Full-page captures hide only fixed navigation during capture, avoiding a fixed bar painting across long content. Separate `*-content.png` captures omit header/navigation solely to compare content pixels. These capture-only styles are not application changes. All original visual/functional assertions remain enabled; existing runs write under the current stage's `regressions/` folder.

Known limits: Chromium emulation/local or mocked data does not replace physical Safari/Android, nonzero hardware safe areas, screen-reader or live Supabase testing. Current light navigation/active timer/results styling remains intentional and unchanged. The metadata line retains the existing combined category/duration text rather than introducing a new calculation or statistics field.

An exploratory two-worker run exposed a transient read in an existing Friday audio test: the UI had finished, but its immediate IndexedDB query read a prior draft checkpoint. The unchanged controller queues asynchronous snapshot writes (`showForm(); void persist()`), and that test does not wait for the final write acknowledgment before reading. Neither production persistence/timing nor the audio test is changed here; final verification uses the repository's configured single worker. This parallel observation is separate from the corrected 320px visual alignment, whose original assertion is retained unchanged.

## PWA and changed files

`index.html` adds only the final `hm-details.css` stylesheet link. Cache advances **v23 → v24**, retaining every prior URL (68) and adding only the new stylesheet (69 total). The 52 reachable runtime ES modules and historical/branding/audio assets remain precached. Service-worker install/activate/fetch handlers and the waiting-worker strategy remain unchanged; no `skipWaiting` or `clients.claim`. Manifest identity/name/icons remain unchanged.

Application files: `styles/hm-details.css`, `src/ui/views.js` (one scope-class statement), `index.html` (one stylesheet link), `service-worker.js` (cache version/entry).

Tests: new `tests/workout-details.spec.js` and `tests/workout-details.test.js`; `tests/helpers/ui-baseline.js` adds the stylesheet-only baseline, selected workout ID/version and original detail-markup comparison. Existing cache/order/artifact paths are updated in `tests/custom-audio.spec.js`, `tests/header-branding.spec.js`, `tests/header-branding.test.js`, `tests/library-cards.spec.js`, `tests/library-cards.test.js`, `tests/library-cleanup.spec.js`, `tests/today-cards.spec.js`, `tests/today-cards.test.js` and `tests/ui-foundations.spec.js`. No original case is removed, skipped or disabled.

Documentation: this report and the PR 06 status in `docs/HMKB_UI_V2.md`.

Final verification:

- **87 Node tests passed; all 256 Playwright tests passed** in the final full run using the repository's original one-worker configuration (11.2m). No original tests removed, skipped, disabled or weakened. `tests/weights.spec.js` and the audio helper remain unchanged.
- All 44 comparison pairs are verified: 16 intentional four-WOD detail changes; 28 byte-identical protected viewport/content pairs with matching styles/geometry. Header/navigation match in every pair; detail inner HTML is exactly preserved.
- Exact identities/durations, phase/exercise order, targets, instructions/goals, weights/validation/persistence, draft recovery/history access and unchanged plans pass, including offline and historical/fallback checks.
- Normal/200% text, four widths, no overlap/overflow, accessible field labels, visible keyboard focus, native accordions, reachable actions and forced-colors/reduced-motion checks pass. The active timer and result appearance remain unchanged.
- **106 JavaScript modules** parse; all **52 reachable runtime ES modules** remain cached. All **69 precache URLs** exist, preserving all 68 previous entries.
- Source guards confirm that the only application JS change is the scope-class statement. Detail/prescription/field generation, handlers, data/storage/timers/results/audio/cloud, existing CSS, identity/icons/branding/historical assets and SQL remain unchanged. `git diff --check` passes.

No merge, deployment or next UI stage.
