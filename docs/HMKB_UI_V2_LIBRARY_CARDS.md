# HM/KB UI v2 — PR 05: Library cards

Base: main `a11fc13`, after PR #21 (Today cards) merged. Branch: `feature/ui-v2-05-library-cards`.

## Exact visual changes

Only the four Library cards and their assignment-mode counterparts are redesigned. They keep the original single-button markup and real content from `libraryWorkouts`:

1. Monday Paranoid v3 — 1270 seconds (21:10).
2. Tuesday of Spades v1 — 1200 seconds (20:00).
3. Thursday Bells v1 — 1270 seconds (21:10).
4. Friday To Black v1 — 1200 seconds (20:00).

Cards use the approved primary purple surface, light text, secondary-purple border and 16px radius. The existing brand/day label is a compact dark capsule with lilac text. Category/type and the real total duration share a top row; duration is aligned right. Titles use strong uppercase system UI lettering at 24–30px at the normal root size. The existing subtitle follows with a lighter weight. No new artwork, fonts, colors, icons, dependency, gradient, glow or shadow is added.

The complete proportional phase bar and real structure description remain. No segment, phase ID, duration, transition or accessible phase description is changed. CSS only changes positioning/margins, not phase colors or proportions. Existing duration formatting is preserved (`21:10 total` / `20 minutes`); there is no new duration calculation.

The bottom footer has yellow background, dark text, a 44px minimum height and token-based rounded corners. Its original text is styled uppercase. Regular mode says **View workout →**; assignment mode says **Assign to [requested day] →**. It is still a span inside the original card button, with no new handler or competing/nested interactive target. The whole card, footer clicks and keyboard activation continue using the existing ARIA name and callback. Workouts start only through the existing detail-page Start Workout action.

## Scope and shared components

`src/ui/views.js` adds **only** `className: 'hm-library-view'` to the root div created by `libraryView()`. All other code in that file, including routing callbacks, selected-day handling, `libraryWorkouts` selection, assignment and cancel behavior, is unchanged. `src/ui/components.js` remains byte-identical to main.

Every selector in the new `styles/hm-library.css` begins with `.hm-library-view`. No rule targets `.workout-card` or `.library-grid` globally. This matters because Today shares the card component and `historyView()` uses `.library-grid` for saved-session buttons. The history list has no Library scope wrapper and is protected explicitly by before/after captures. Today card styling, day containers and all existing stylesheets remain byte-identical.

The stylesheet loads after the existing HM/KB files. Palette and radius roles use existing tokens; fallback values match those roles so older token-disabled visual fixtures remain stable. There are no global resets, wrapper-wide typography changes or architecture refactors. Library page heading/count/cancel styling, header, navigation, details, active timer, results, session history, Stats and Dashboard are outside this CSS scope.

## Responsive behavior and accessibility

The existing one/two/three-column Library breakpoints remain. On small phones the four cards stack vertically. Tablet/desktop cards keep the same hierarchy; grid items align at the top rather than stretching shorter cards into empty space. Names and metadata wrap without ellipsis or hidden text. Card typography uses `rem` sizes so root text enlargement scales the content; grid tracks permit wrapping at 200% text size, including assignment labels.

Normal-text contrast examples: light text/primary purple 10.83:1; lilac label/dark capsule 4.96:1; dark CTA/yellow 12.94:1. The capsule keeps the small lilac label off the lower-contrast purple surface. No information depends on color alone: day/type/duration/phase descriptions and action labels remain text. The inherited phase colors retain their textual accessible description.

Focus uses a visible 3px yellow outline with 4px offset, with enough outer space and no clipped overflow ancestor. Tests navigate using actual Tab/Shift+Tab/Enter, distinguish View/Assign accessible names, and verify there are no nested controls. CTA height is at least 44px and grows for enlarged wrapping text. Hover/active states only alter border color; no animation is introduced. Forced-colors mode uses Canvas/CanvasText, ButtonFace/ButtonText and Highlight rather than fixed brand colors.

Checks cover 320, 390, 768 and 1280px, normal and 200% root text size, and forced-colors/reduced-motion emulation. Solid-background text checks use AA thresholds (4.5:1 normal / 3:1 qualifying large text). This does not certify all native pseudo-elements, disabled states or assistive-technology behavior.

## PWA and protected behavior

Cache advances **v22 → v23**, adding only `styles/hm-library.css`. All 67 previous precache URLs remain (68 total), including every runtime/history module, historical WAV and branding asset. Service-worker handlers and the waiting-worker activation strategy are unchanged. Manifest name/identity/colors and installation icon files are unchanged.

All 15 internal definitions, prescribed exercises, IDs/versions, timer engine, duration functions, audio, result schemas/forms, weight preferences, IndexedDB, saved sessions, weekly-plan semantics, Auth/Supabase/RLS/cloud sync and SQL remain untouched. No data migration, production access, merge, deployment or next redesign stage is performed.

## Before/after evidence and functional regressions

Artifact root: `/workspace/artifacts/ui-v2-05/`. `index.md` links actual whole-viewport before/after PNGs; `comparison.json` records hashes. Isolated synthetic assignments/results and fixed clocks prevent private-data capture or production requests. Before captures omit only the new Library stylesheet; the nonvisual scope class is present in both. Card inner HTML is compared exactly.

There are **36 pairs** at four widths across nine routes: regular Library, Monday assignment mode, Today, workout detail, running timer, results, a saved session, the actual saved-session `.library-grid` list and account. Only the eight regular/assignment Library pairs intentionally differ. The other 28 pairs require identical viewport/content pixels and matching computed styles/relative geometry. Header/navigation images match in every pair. Today is an explicit unchanged regression, not an updated snapshot.

Actual `*-viewport.png` files contain the unmodified viewport including header/navigation. Full-page images hide only fixed navigation during capture to avoid painting it across the middle of a long page. Separate `*-content.png` comparisons hide header/navigation solely during that capture. No capture styling is installed in the application.

Dedicated browser tests verify exact order/version/ID/duration, phase proportions, whole-card/footer navigation, each real Start Workout countdown, all seven assignment modes, cancel/no automatic plan changes, only the intended day changing, persistence, keyboard focus, enlarged text, forced colors, no overflow and offline Library/assignment/detail compatibility. Historical definitions remain available offline. No completed performance results are invented by the start/exit checks.

All prior test declarations remain enabled. Cache assertions advance to v23; stylesheet ordering includes the new file. One older Monday test expected Library's former dark card background: it now checks the deliberately requested purple and additionally verifies that the preserved historical Today card remains dark after the fixture plan has been loaded. Its content, planning and navigation assertions remain. This is an explicit intended visual change, not a weakened regression check. Existing baseline suites retain their equality/contrast/functional assertions, and current runs write under this stage's `regressions/` directory.

Known limits: Chromium at simulated widths with local/mock data does not replace physical-device Safari/Android, screen-reader or live Supabase validation. Original light navigation, timer and legacy form presentation remain intentional and unchanged. Only the Library redesign is included.

## Changed files and final verification

Application: `styles/hm-library.css`, stylesheet link in `index.html`, Library scope class in `src/ui/views.js`, and cache version/entry in `service-worker.js`. All existing stylesheets and shared components are unchanged.

Tests: new `tests/library-cards.spec.js` and `tests/library-cards.test.js`; `tests/helpers/ui-baseline.js` adds the stylesheet-only baseline, assignment route, saved-history list and card-markup comparison. Updated existing files: `tests/custom-audio.spec.js`, `tests/header-branding.spec.js`, `tests/header-branding.test.js`, `tests/library-cleanup.spec.js`, `tests/today-cards.spec.js`, `tests/today-cards.test.js` and `tests/ui-foundations.spec.js` (current-cache/order/artifact paths); `tests/monday-paranoid.spec.js` (intended Library color and preserved Today assertion). No test removed, skipped or disabled.

Documentation: this report and the PR 05 status in `docs/HMKB_UI_V2.md`.

Final verification:

- **86 Node tests and all 242 Playwright tests passed** in the complete final run (8.7 minutes for browser tests). No tests removed, disabled or skipped.
- All 36 screenshot pairs are verified: eight intended regular/assignment Library changes; 28 protected viewport/content pairs are byte-identical with matching styles/geometry. Today, saved-history grids, details, timer and results remain unchanged. Header/navigation images match in every pair; exact Library card inner HTML is preserved.
- All four correct versions open and Start Workout begins each countdown. All seven assignment actions/cancel/persistence checks pass, as do offline compatibility, focus, normal/200% text and forced-colors checks. Existing workout/result/audio/cloud suites pass.
- **104 JavaScript modules** parse; all **52 reachable runtime ES modules** remain cached. All **68 precache URLs** exist and all 67 previous entries remain.
- Diff guards confirm the only application JS difference is the Library wrapper class. Shared components, all other runtime modules, existing CSS (including Today/header/tokens), assets, manifest/icons and SQL remain unchanged. Service-worker handlers remain unchanged. `git diff --check` passes.

No merge, deployment or next UI stage.
