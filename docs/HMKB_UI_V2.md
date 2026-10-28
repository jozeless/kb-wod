# HM/KB UI v2 — PR 01: Design foundations

## Scope and visual reference

The user-provided **Heavy Metal Kettlebell Brand Guide** (image supplied in this conversation, 28 October 2026) is the visual reference: dark neutral background, purple surfaces, lilac accent, yellow highlight, light text; clean geometric UI typography and metal-style branding. Its logo, icon, circular timer and statistics screens are reference concepts, not functionality or assets to implement in this PR.

This first PR defines inactive design tokens only. The application must look and behave exactly as it did at base main `37dc86e`. Existing approved workout detail cards remain valid until their dedicated redesign stage. No fonts, icons, illustrations, framework, brand assets or external styles are downloaded/imported. No PR 02 work starts here.

## Approved palette and naming

| Token | Exact value | Intended future role |
| --- | --- | --- |
| `--hm-bg` | `#212227` | Main dark background |
| `--hm-surface-primary` | `#312F4E` | Primary surface |
| `--hm-surface-secondary` | `#4D4A6A` | Secondary surface |
| `--hm-accent` | `#B37ACB` | Lilac accent |
| `--hm-highlight` | `#EEEF58` | Highlight/CTA/brand emphasis |
| `--hm-text-primary` | `#EDECEE` | Primary light text |

Every token starts with `--hm-`; semantic names describe roles, not particular workout IDs or component selectors. `--hm-text-secondary` currently aliases primary text rather than inventing a new gray or reducing legibility. `--hm-border` aliases the secondary surface. Future variations require measured contrast and explicit review, not an alternative competing palette.

`styles/hm-tokens.css` is loaded **before** `styles/app.css`. Its only rule is `:root`, containing prefixed custom-property definitions. It declares no actual color, background, font, border or layout properties. Nothing in existing application CSS consumes these tokens yet. In particular, legacy `--accent`, `--line`, root text/background and all existing selectors remain untouched. Merely importing the file cannot restyle current screens. Later migrations must opt individual reviewed components into tokens explicitly; no global search/replace or reset.

## Typography roles

- `--hm-font-ui`: local system sans-serif fallback role for labels, descriptions, buttons, inputs and timer numbers. The guide proposes Montserrat or a similar clean sans-serif. Montserrat is not downloaded, imported or applied here.
- `--hm-font-display`: conceptual brand/display role with local Impact/Arial Black/sans-serif fallbacks, **not a claim that these are the approved metal face**. A future approved/licensed brand font belongs in a separately reviewed change, restricted to branding/selected display headings. Never use ornamental lettering for controls, data, exercise instructions or timer digits.
- Sizes: xs `.75rem`, sm `.875rem`, body `1rem`, H2 `1.25rem`, H1 `2rem`, metric `3rem`. These correspond to the guide's 16px body, 20px section, 32px title and 48px metric examples at the default root size; user text scaling must remain supported.
- Weights: regular 400, semibold 600, bold 700. Body line height 1.5; heading line height 1.25. These are available definitions, not newly applied typography.

## Spacing, radius, elevation and focus

Spacing uses a minimal quarter-rem scale: 0, 1, 2, 3, 4, 6, 8 and 12 units, represented as `--hm-space-*`. Prefer gaps/padding from this scale rather than unrelated arbitrary numbers. Radius roles are sm `.375rem`, md `.625rem`, lg `1rem`, pill `999px`.

Elevation has two roles: no shadow, or one restrained raised shadow (`0 .25rem 1rem` with neutral black at 20% opacity). This neutral shadow is not a second brand palette and must not become decorative glow everywhere. Surface separation should remain clear without relying solely on shadows.

Focus foundations define a 3px highlight outline and 4px offset, intended for future dark surfaces. They are not applied to existing focus rules. Do not assume yellow works against a light legacy canvas: review contrast against both adjacent surfaces and use a dark palette outline or a contrasting dual ring when appropriate. Never remove a keyboard indicator without an accessible replacement.

## Mobile-first and accessibility requirements

Design from 320–390px upward, then verify tablet/1280px desktop. Preserve the seven-day plan and four approved public workouts. Exercise names must wrap, not truncate; layouts must not require horizontal scrolling. Keep adequately sized controls (prefer 44px touch targets), explicit labels, readable numeric inputs and predictable keyboard order. Honor zoom, text scaling, reduced-motion and forced-colors needs. No new animation is introduced here.

Target WCAG AA: at least 4.5:1 for normal text, 3:1 for qualifying large text, and 3:1 for meaningful control/state boundaries where required. Do not convey state using color alone. Accessible names, focus order and existing semantics must survive every later component migration.

Measured solid-color contrast ratios using WCAG relative luminance:

| Pair | Ratio | Guidance |
| --- | --- | --- |
| Light text / background | 13.48:1 | Normal text |
| Light text / primary surface | 10.83:1 | Normal text |
| Light text / secondary surface | 7.12:1 | Normal text |
| Dark background text / lilac | 4.96:1 | Normal text |
| Dark background text / yellow | 12.94:1 | Normal text |
| Light text / lilac | 2.72:1 | **Fails text contrast; do not use** |

Recheck actual rendered backgrounds, opacity, gradients, font sizes and interactive states in each future PR. These measurements do not certify the entire reference image or existing app as accessible, and no existing presentation is altered in this foundations-only change.

## Review sequence and data invariants

1. **This PR:** token definitions, safe stylesheet/PWA references, documentation, deterministic visual baselines and targeted tests.
2. Future separately approved PR: scoped shell/theme application; preserve navigation, header/logo behavior and rollback boundaries.
3. Separate component PRs: Library/Today cards, then details/forms, each with reviewed before/after captures. Current approved detail cards remain valid until their turn.
4. Any active-timer visual work must be separate and preserve the monotonic engine, durations, cues, pause/recovery and results behavior. The circular timer is not implemented here.

Each step must be independently reviewable and reversible. Design work must **never change workout definitions/versions, session results, IndexedDB records, preferences, weekly assignments, timers, audio, Auth/RLS or cloud data**. Feature work such as statistics is not implied by a brand-guide mockup and needs its own scope/approval. No merge, deployment or production access is performed.

## Baseline protocol and artifacts

Before changing index/CSS/PWA, the five screens were captured from the fetched main: Library (four workouts), fixture Today plan, Monday Paranoid v3 details, running active timer at 00:50, and a representative Monday result form.

Viewports are exactly **390×844** and **1280×800**. Tests freeze the clock at a fixed UTC instant and use isolated guest contexts with cloud configuration disabled, fixed synthetic weekly assignments and a clearly labeled local results fixture. Audio is deliberately unavailable in these visual fixtures for deterministic Sound Off rendering; the full existing audio suite independently verifies sound behavior. No real credentials/private sessions are captured and no production records are created.

Artifact root: `/workspace/artifacts/ui-v2-01/`.

- `pre-change/{mobile,desktop}-{library,today,details,timer,results}.png`: actual main before adding token references (10 images).
- `before/…`: same-run control with the token stylesheet link removed and service workers blocked.
- `after/…`: equivalent screen with the real new stylesheet loaded.
- `comparison.json`: actual pre-change-main versus after-image equality and hashes.

The test compares all five same-environment before/after PNGs in each viewport. This detects visible regressions without imposing pixel identity across different operating systems or font rasterizers. Do not update a baseline automatically to hide a failure. Persistent cross-platform PNG differences alone are not a functional failure; compare equivalent conditions, investigate and review them. Baseline images are workspace artifacts, not new runtime branding assets.

Additional tests assert exact palette values, prefixed definitions only, stylesheet order, unchanged legacy root roles, keyboard focus, no overflow, no browser errors, four Library cards and offline token availability. Existing navigation/forms/history/timer/cloud/audio suites remain enabled unchanged except for cache-version expectations.

PWA cache advances from `kb2-static-v18` to `kb2-static-v19`, adding only `styles/hm-tokens.css`; every previous static/historical asset and the existing waiting-worker activation strategy remain intact.

## Final verification

- 80 Node logic tests passed; 216 Playwright browser tests passed, with no tests disabled.
- All ten actual-main before/after PNG pairs are byte-identical in this environment, as are all ten same-run control/after pairs.
- 93 JavaScript modules pass syntax checks; all 52 reachable runtime modules remain precached; all 63 static asset paths exist. The only added precache asset is the new stylesheet; no prior asset was removed.
- Diff guards confirm all `src/` modules, `styles/app.css`, manifest/icons, historical assets and SQL remain unchanged. `git diff --check` passes.
- Screenshot index: `/workspace/artifacts/ui-v2-01/baseline-index.md`; comparison data: `/workspace/artifacts/ui-v2-01/comparison.json`.

Added files: `styles/hm-tokens.css`, this document, `tests/ui-foundations.test.js`, `tests/ui-foundations.spec.js`. Modified files: `index.html` (stylesheet ordering), `service-worker.js` (v19 + one precache entry), `tests/custom-audio.spec.js` and `tests/library-cleanup.spec.js` (cache-version expectation only).

## PR 02 status

The foundations-only description above records PR 01. [PR 02 dark canvas and surfaces](HMKB_UI_V2_DARK_CANVAS.md) now opts the page canvas/day containers into these roles with scoped light-component compatibility. The five-screen baseline suite is retained and compares against a frozen PR 01 CSS fixture: intentional colors may differ while protected component geometry/styles must remain identical. This replaces PR 01's whole-page pixel-equality expectation for the deliberate color migration, not its functional or accessibility checks.

## PR 03 status

[PR 03 header and branding](HMKB_UI_V2_HEADER_BRANDING.md) replaces only the provisional header with the exact user-supplied `hmkblogo001.png`, the HEAVY METAL KB name and the existing live account/sync controls. Its separate stylesheet is scoped to `.app-header`; global styles, typography, navigation, cards, timers, results and cloud logic remain unchanged. The source document above continues to record PR 01 rather than describing the later header's active token use. PWA v21 adds only the approved branding PNG and scoped header stylesheet; the installation identity/icons remain unchanged. No later UI v2 stage begins here.

## PR 04 status

[PR 04 Today WOD cards](HMKB_UI_V2_TODAY_CARDS.md) applies the user-approved Today concept through a separate stylesheet scoped to the existing weekly grid. It highlights the original View workout action, preserves all real card content and leaves every runtime JavaScript module unchanged. Header/navigation and all other screens remain protected. PWA v22 adds only the Today stylesheet. No later stage begins in this change.

## PR 05 status

[PR 05 Library cards](HMKB_UI_V2_LIBRARY_CARDS.md) gives only the four regular/assignment Library cards purple surfaces, a top duration row and the existing action in a yellow footer. A Library-specific wrapper scopes all new CSS, protecting Today and the history's shared `.library-grid`. The shared component, routing and assignment behavior remain unchanged; PWA v23 adds only the Library stylesheet. No later stage begins here.

## PR 06 status

[PR 06 pre-workout details](HMKB_UI_V2_WORKOUT_DETAILS.md) styles only real pre-workout pages through one scoped class and a dedicated stylesheet: clearer metadata, purple numbered phase sections, adaptable weight rows, native instructions, recording guidance and yellow Start Workout. Original content/data generation, field events/storage, timer/results/audio/cloud and all other screens remain unchanged. PWA v24 adds only the new stylesheet. No later stage begins here.
