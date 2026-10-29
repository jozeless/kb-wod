# HM/KB UI v2 — PR 09: Bottom Navigation

Branch: `feature/ui-v2-09-bottom-nav`. Base: `5a0347d` (merged PR #25, including muted-draft audio recovery).

## Navigation and reference

The approved footer image guides a compact fixed dark bar, lilac inactive icons, light labels, and a purple active surface with yellow icon, label and short underline. The image is not displayed in the application. The four calendar/dumbbell/bar-chart/history icons are inline SVGs with a shared 24×24 viewBox, 22px display size, 2-unit stroke, round caps/joins and no fill. No icon pack, dependency, font, downloaded asset, shadow or animation is added. Existing app/PWA icons and branding remain unchanged.

| Tab | Destination | Behavior |
| --- | --- | --- |
| Today | `#today` | Existing weekly planning, assignments and cards. |
| Library | `#library` | Existing approved library, assignment and detail flows. |
| Progress | `#progress` | Title and a short coming-later message only. No statistics, charts, achievements, totals or analytics records. |
| History | `#history` | Existing `historyView(undefined, go)` and `listSessions()` display accessible completed sessions. Drafts remain excluded. |

`#history/{workoutId}` retains its workout filter. `#session/{sessionId}` retains the existing saved snapshot/results view; both select History. Workout/detail/active/result routes and assignment queries select Library as before. Legacy `#stats` and `#dashboard` keep their original safe placeholders and select Progress. Account and unknown routes select no footer tab. Only one matching link receives `aria-current="page"`.

The existing history renderer already supported an omitted workout ID, so no history or storage code was changed. Its ownership filter remains intact: unclaimed local completed sessions and the current account's completed sessions are readable; another account's owned sessions and all drafts are excluded. The existing saved-session view independently enforces the same ownership restriction.

## Scope and files

- `index.html`: new four-link footer, decorative SVGs, final stylesheet link and a dedicated class on the existing content reserve.
- `styles/hm-footer.css`: main-navigation selectors plus only `#status.hm-footer-reserve` for necessary bottom clearance.
- `src/main.js`: a Progress placeholder and selected-tab mapping. Existing history branches, `allowExit()`, click interception, hashchange/Back protection, active controllers and auth/sync listeners remain unchanged.
- `service-worker.js`: cache v26 → v27; retain all previous precache URLs and add only the local footer stylesheet. Installation/activation policy stays unchanged.
- `tests/bottom-nav.spec.js`, `tests/bottom-nav.test.js`: routes, SVG consistency, owner separation through real mocked login/logout, session safety, layout, accessibility, offline and visual scope checks.
- `tests/helpers/ui-baseline.js`, `tests/fixtures/ui-v2-08/`: frozen original main/footer for before captures, optional footer comparison, Progress/global-history capture states and content/navigation metrics. Fixtures are test-only, not runtime assets.
- Existing tests: intentional old-footer label/color expectations, new stylesheet order, cache version and artifact paths. Legacy route, data, timer, cue and session assertions remain enabled.

No workout data/version, timer math, countdown, audio/cue module, active presentation, result schema/form, saved-session renderer, drafts/checkpoints, storage schema, weight preference, planning, Auth, Supabase, sync, SQL, identity, logo or existing icon file was modified. The header, cards, details, timer, results and account styles stay unchanged.

## Responsive and accessibility behavior

Four balanced columns remain centered on desktop with the existing maximum item width. Every link is at least 44×44px. Icons stay aligned; labels can wrap at large text sizes. Safe-area insets are reserved at the bottom and sides. The existing 110px content reserve is retained at normal text size and grows with text scaling so footer height cannot cover the last form controls or End/Save buttons at the bottom of the scroll.

The navigation retains `aria-label="Main navigation"`, readable link names and `aria-current`. SVGs are decorative (`aria-hidden="true"`, `focusable="false"`). Yellow focus, the selected surface/underline and heavier label provide visible state beyond color alone. Normal text contrast is checked at AA 4.5:1 and icon contrast at 3:1. Forced colors use system colors, a selected border and a visible underline. There are no animations, including in reduced-motion mode.

## Validation and screenshots

The focused tests cover all four routes, nested and legacy states, empty/global/workout-specific history, saved snapshots, mixed guest/account records, login/account switching, denied foreign session details, keyboard activation, fixed positioning, no horizontal overflow or clipped labels, all four widths (320/390/768/1280), 200% text, forced colors and offline navigation under `/kb-wod/`.

Active-workout tests click the actual SVG children of all four links, cancel leaving, confirm the same live timer continues, pause/resume without duplicated audio, then accept History navigation and recover the same checkpoint and weight values from the draft. Existing full-session/audio/results/cloud tests run unchanged except for the intentional footer/cache expectations.

Before/after capture index: `/workspace/artifacts/ui-v2-09/index.md`. Forty viewport pairs cover Today, Library, Progress, global History, details, active timer, result form, saved-session detail, workout history and account at all four widths. Before captures serve the exact previous `main.js` and old footer, omitting only the new footer stylesheet. The old Stats placeholder is the Progress comparison baseline. The other 36 page-content pairs and every header must remain pixel-identical; all 40 footers intentionally change. Footer crops and complete viewport images show the actual fixed bar. Full-page/content captures hide the fixed bar only for image comparison, avoiding a bar painted through long pages. Additional scaled-text and forced-color captures are under `accessibility/`.

Final validation: **89 Node tests passed; 292 Playwright tests passed (15.0m, original single worker, mobile and desktop), with no failures or skipped cases**. All 40 footer/viewport comparisons passed, with 36 identical protected page bodies, four intended Progress changes, and every header unchanged. Cache verification retained all 71 previous URLs, added only the footer stylesheet, and confirmed all 53 reachable runtime modules remain cached. Capture sessions are synthetic fixed-clock fixtures, not real user results. Hashes and source checks are recorded in the delivery artifacts.

## Limits and delivery

At 200% text on narrow screens, labels may wrap while preserving their full accessible names. Long pages and workouts remain scrollable. Automated Chromium checks do not certify every physical phone, actual device safe-area behavior or every screen reader; no production account, session, SQL or cloud data was used. Progress analytics and a dedicated History redesign remain outside this PR.

No merge, deployment, migration or next PR is included.
