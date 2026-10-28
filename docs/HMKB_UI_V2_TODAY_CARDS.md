# HM/KB UI v2 — PR 04: Today WOD cards

Base: main `fafe743`, after the header/branding PR was merged. Branch: `feature/ui-v2-04-today-cards`.

## Visual scope

The user-supplied **HM/KB / Today Cards** concept image guides this change: dark inner WOD cards on purple day containers, readable strong titles, restrained secondary information and a clear workout-detail action. It is visual direction, not a replacement for real catalog data, durations, phase structure or interaction.

All new presentation lives in `styles/hm-today.css`. Every selector is scoped to the existing **`.week-grid`**, which is used only by Today. No runtime JavaScript or component markup changes are needed; Library continues using the exact same shared card component and its existing presentation.

- Day containers use the primary purple surface, 20px corners and 16px padding. Their seven day headings remain real headings and use compact uppercase styling with a lilac left accent.
- WOD cards use the approved dark background, secondary-surface border, 14px corners and 16px padding. Titles use the existing system UI font, bold at 24–30px with natural wrapping. No metal display font, remote typeface or dependency is added.
- Brand micro-labels use lilac on dark; workout type/demo/approval badges keep their real existing text and yellow emphasis. Subtitles, exact duration labels and phase descriptions remain present, with lighter font weights and smaller secondary text.
- The existing **View workout →** footer is emphasized with a yellow background, dark text and a 44px minimum height. It remains a noninteractive span inside the original single clickable card button; there is no nested button, new route, new handler or invented START WOD action. Starting a workout still happens explicitly on its detail page.
- Existing phase bars, their proportional durations, phase IDs, colors and accessible descriptions are unchanged. No phase count, repetitions, result, statistic or workout data is invented.
- Change/Add/Remove remain separate real controls outside the WOD button. Their touch targets remain at least 44px; labels, order, handlers and disabled behavior are unchanged. Empty/unavailable assignments retain their existing messages and actions.
- Hover/active states use simple border/surface colors; keyboard focus uses a clear yellow outline. No shadow, animation, 3D effect, generated icon or image is introduced. Forced-colors rules preserve system text, button and focus colors.

The whole weekly grid keeps its existing one/two/three-column breakpoints. The header, logo, navigation, Today page heading/copy and page-wide spacing are untouched. Card content can wrap and the existing page bottom space keeps the final actions reachable above navigation.

## Contrast decisions

The concept uses lilac small day labels on purple. Here day labels use light text on purple plus a lilac accent line, preserving the visual direction while retaining normal-text contrast. Lilac micro-labels sit on the dark inner card (4.96:1), light text on primary purple reaches 10.83:1, and dark CTA text on yellow reaches 12.94:1. Secondary text uses smaller typography rather than low opacity. Enabled visible own-text nodes are checked against nearest solid backgrounds at all four widths (4.5:1 normal / 3:1 qualifying large text).

That audit does not certify every native pseudo-element, disabled state, gradient, screen reader or device. Actual browser keyboard behavior is tested separately. Palette fallbacks equal the approved token values and keep the retained pre-token baseline fixtures rendering stable; production uses the existing tokens.

## Protected application behavior

The entire `src/` tree is byte-identical to main: no changes to definitions, versions, durations, timers, audio cues, result forms or schemas, history, IndexedDB, weight preferences, assignments, navigation, Auth or Supabase synchronization. Existing stylesheets, approved logo and PWA icons, manifest identity, historical audio and SQL also remain byte-identical. No production access, data migration, merge, deployment or later redesign stage is performed.

`index.html` adds only the Today stylesheet link after the existing header styles. `service-worker.js` advances **v21 → v22** and adds only `styles/hm-today.css`, retaining all 66 previous precache URLs (67 total). Worker installation/activation/fetch behavior is unchanged; no immediate activation or cache identity change outside the existing version is introduced.

## Verification and screenshots

`tests/today-cards.spec.js` captures seven deterministic routes at 320, 390, 768 and 1280px (28 before/after pairs): Today, Library, Monday v3 details, active timer, results, history and account. These use isolated synthetic assignments/results, a fixed clock and no production cloud data. Before captures omit only the new stylesheet; after captures load it normally. Existing card HTML is compared exactly on Today.

- Today intentionally changes in four viewport pairs; all 24 other route/width pairs must retain identical viewport pixels, main-content pixels, geometry and computed styles.
- Header and navigation image comparisons must match in every pair. Fixed navigation is captured with a viewport clip to avoid element-screenshot scrolling artifacts. Real `*-viewport.png` files show the entire page viewport with no elements hidden.
- Full-page images hide only the fixed navigation during capture so it does not paint across the middle of a long page. Separate `*-content.png` files hide header/navigation during capture for content comparison; these capture-only styles do not change runtime CSS. Actual viewport screenshots remain unmodified.
- Tests cover exact four assigned WODs, seven days, no overflow, readable contrast, real keyboard focus/activation, mouse/CTA navigation to the correct versioned detail, no timer auto-start, proportional phase bars and separate planning controls.
- Assignment/cancel/add/remove/reload checks use the existing UI. Offline tests verify cached Today styling, detail navigation, a historical Focus assignment and preserved unavailable references.
- All previous suites remain enabled, including baseline/contrast, header/account/sync, Library, workouts, results/history, timers and audio. Only current-cache expectations and stylesheet ordering are updated. Existing visual artifact output is moved under the current stage's `regressions/` directory to keep these runs separate from previous-stage delivery captures.

Artifacts: `/workspace/artifacts/ui-v2-04/index.md` links before/after actual viewports; `comparison.json` records hashes. No real personal data is captured.

Known limits: verification uses Chromium at simulated mobile/tablet/desktop widths and local/mocked data. It does not replace physical Safari/Android or live Supabase validation. The existing fixed bottom navigation and mixed light legacy timer/forms remain intentional and unchanged.

## Changed files and final checks

Application: new `styles/hm-today.css`; stylesheet link in `index.html`; cache/version entry in `service-worker.js`. No application JavaScript changes.

Tests: new `tests/today-cards.spec.js` and `tests/today-cards.test.js`; shared capture-helper additions in `tests/helpers/ui-baseline.js`; cache assertions in `tests/custom-audio.spec.js`, `tests/library-cleanup.spec.js`, `tests/header-branding.test.js`, `tests/header-branding.spec.js` and `tests/ui-foundations.spec.js`; stylesheet-order assertion in the last file. The header matrix's artifact directory moves under this stage's regression folder.

Documentation: this report and the PR 04 status note in `docs/HMKB_UI_V2.md`.

Final verification:

- **84 Node tests passed; all 232 Playwright tests passed** in the final full run (7.2 minutes for browser tests). No tests disabled or skipped.
- 28 before/after pairs: four intended Today changes, 24 other-screen pairs with byte-identical viewport/content PNGs and equal geometry/styles. Header/navigation comparisons match in every pair; Today card HTML is exactly preserved. Visible enabled text passes the stated solid-background contrast thresholds.
- The four current Today cards navigate correctly via keyboard and CTA at all four widths. Assignment/cancel/add/remove persistence, legacy/unavailable references, offline styling/detail navigation and all original workout/timer/audio/results/cloud suites pass.
- **102 JavaScript modules** parse. All **52 reachable runtime ES modules** remain cached. All **67 precache URLs** exist, preserving all 66 prior entries.
- The complete `src/` tree, existing CSS/token/header files, logo/other assets, manifest/icons and SQL are byte-identical to main. `index.html` changes only by the added stylesheet link; service-worker handlers are unchanged. `git diff --check` passes.

No next UI v2 stage begins here. No merge or deployment.
