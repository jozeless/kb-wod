# HM/KB UI v2 — PR 02: Dark canvas and basic surfaces

Based on merged PR 01 (`b64ba95`). This is the first visible color migration, not the next card/header/navigation/button redesign. All application JavaScript, workout definitions, schemas, storage and cloud modules remain unchanged.

## Exact visual scope

- Document and body canvas: `var(--hm-bg)` (#212227); primary inherited page text: `var(--hm-text-primary)` (#EDECEE). Root/body backgrounds cover margins, scrolling and the area below content. No geometry/font/spacing changes.
- Page heading descriptions, eyebrows, labels, muted page copy and global status text become light. Header structure/logo typography remain unchanged; the old low-contrast green logo span becomes the approved lilac accent, and its separator uses the existing border token.
- Seven existing Today `.day-slot` containers: primary purple surface (#312F4E), existing border token (#4D4A6A), light text. Same grid, rounded corners, controls and assignments. Nested WOD cards are untouched.
- Transparent secondary buttons on dark pages/day surfaces get light labels and token borders. Same sizes, shapes and behavior. Primary green buttons stay unchanged.
- Page-level result/weight error text uses the yellow highlight for contrast. Sync/account status text inherits light page text.
- Existing light navigation retains its white/selected-green backgrounds and original dark labels via an explicit foreground compatibility rule. No navigation structure/colors redesign.
- Retained light timer panels, empty states and legacy exercise/history sections receive explicit original dark foregrounds. Their original muted text, secondary-button colors and weight-error colors stay readable. Existing dark HM/KB detail sections are explicitly exempted from the light-section foreground rule.
- Native light inputs/selects/textareas retain their existing backgrounds and dark text; existing purple detail weight inputs retain their approved styling.

All old `app.css` rules remain byte-for-byte as a prefix. The appended compatibility layer changes **only background, color and border-color**. Legacy `--accent`/`--line` are not globally replaced. Card geometry, metadata, proportional bars, input typography, timer presentation and focus indicators are protected by before/after computed-style/rectangle comparisons. No fonts, libraries, icons, images, stats or circular timer are introduced.

Browser `<meta name=theme-color>` and manifest background/theme colors become #212227 (metadata requires literals rather than CSS variables). Manifest ID, name, short name, start URL, scope, display mode and icon files remain unchanged. The intentionally retained white navigation/input/timer surfaces are components, not accidental light canvas gaps.

## Contrast and compatibility checks

Computed text colors are checked against their nearest opaque rendered surface for visible, enabled text in all seven fixture screens at 320, 390, 768 and 1280px. Normal text must reach 4.5:1; qualifying large text 3:1. Examples: light page text/dark canvas 13.48:1; light/purple day surface 10.83:1; lilac/dark canvas 4.96:1. Light panels keep dark text instead of inheriting the new page foreground. No global yellow focus replacement is applied to the white navigation; existing keyboard indicators remain.

The audit checks visible own-text nodes and solid surfaces, not every native browser pseudo-element, disabled state, forced-colors mode, gradient, opacity or screen reader interaction. It is not a blanket accessibility certification. Existing keyboard/focus/navigation checks remain enabled, alongside the complete functional suite. Last controls are verified reachable above fixed navigation after scrolling to page end. Ordinary content can scroll behind the unchanged fixed bar; sufficient existing bottom space keeps final actions reachable.

## Controlled baselines and screenshots

The PR 01 five-screen suite remains active: Library, fixture Today, Monday v3 details, running timer and fixture results. Its helper is extracted without deleting tests and extended to saved history and a blank account form (test-only public configuration, no login/network request or real credentials).

`tests/fixtures/ui-v2-01-app.css` preserves the previous stylesheet as a **test fixture only**, never an application/PWA asset. Before captures intercept CSS with this snapshot and omit token loading; after captures load the real token-based application. This makes intended background differences explicit rather than requiring old screenshots to stay identical. Both sides use deterministic guest fixtures, clocks, data and viewports in the same browser environment.

Tests require changed overall pixels but **identical protected component geometry and computed styles** for WOD cards, phase bars, navigation, inputs/selects/textareas, active panels and timer digits. Tests separately assert exact intended canvas/day colors, contrast, four Library cards, metadata, no console errors, no horizontal overflow and offline loading. No existing test is disabled. Pixel differences across OS font rasterizers are not functional failures; same-environment structure/contrast and reviewed before/after captures are the gate.

Artifact root: `/workspace/artifacts/ui-v2-02/`. `before/` and `after/` contain `{320,390,768,1280}-{library,today,details,timer,results,history,account}.png`, plus the maintained PR 01 `{mobile,desktop}-…` comparisons. Full-page captures hide the fixed navigation only during capture to avoid painting a viewport-fixed bar across the middle of a long image. Separate `*-viewport.png` captures show the real unchanged navigation at page end; reachability/geometry are measured before any capture styling. This does not change application CSS. All assignments, weights and result counts in screenshots are explicitly synthetic local test fixtures. No production/user data is read or changed.

## Protection and PWA

Library still exposes exactly Monday Paranoid v3, Tuesday of Spades v1, Thursday Bells v1 and Friday To Black v1, in that order. No registry/reference, timing/audio, weight tracking, result form/schema, history rendering logic, IndexedDB, weekly plan, Auth/RLS, ownership, cloud synchronization or routing change.

Cache advances to `kb2-static-v20`, retaining the exact previous precache asset set and waiting-worker activation strategy. Offline tests verify the dark root and four-workout Library with the cached token stylesheet. No migration, merge, deployment or next UI redesign PR is performed.

## Final verification and changed files

- **81 Node tests passed; 220 full-suite browser tests passed.** Final capture/offline assertion run: all **8** targeted cases passed again. No test skipped/disabled.
- **28** controlled seven-screen/four-width before/after pairs differ intentionally in canvas colors while protected component geometry/styles match. Visible solid-surface text passes the stated AA thresholds at mobile and desktop widths; final controls remain reachable above navigation.
- **96 JS modules** parse; all **52 reachable runtime modules** and **63 static assets** remain precached. Asset set is identical to main. Manifest identity fields match main after excluding only the two intended color metadata fields.
- Entire `src/`, token definitions, icons, other assets and SQL are unchanged. The original application CSS remains an exact prefix of the new stylesheet. `git diff --check` passes.
- Capture index: `/workspace/artifacts/ui-v2-02/index.md`; comparison hashes: `/workspace/artifacts/ui-v2-02/comparison.json`.

Application files: `styles/app.css`, `index.html`, `manifest.webmanifest`, `service-worker.js`. Documentation: this document and the PR 02 status note in `docs/HMKB_UI_V2.md`. Tests: `tests/dark-canvas.spec.js`, `tests/dark-canvas.test.js`, `tests/helpers/ui-baseline.js`, `tests/fixtures/ui-v2-01-app.css`, the maintained `tests/ui-foundations.spec.js` / `.test.js`, and cache-version expectations in `tests/custom-audio.spec.js` / `tests/library-cleanup.spec.js`.

Known limits: this is intentionally a mixed dark-canvas/light-legacy-component stage, not a complete dark redesign. Automated coverage is Chromium with synthetic fixtures/mocked cloud, not physical-device/browser-chrome or live Supabase validation. The contrast audit limitations above still apply. No next redesign stage, merge or deployment is started.
