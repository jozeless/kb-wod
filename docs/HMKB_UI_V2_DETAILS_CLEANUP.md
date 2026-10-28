# HM/KB — PR 07: Detail footer cleanup

Base main: `d98ae86` (merged PR #23). Branch: `feature/ui-v2-07-details-cleanup`.

The only UI change is removal from `src/ui/workout-details.js` of the rendered recording overview/purple panel and final purpose/warm-up/assignment/load-range paragraphs. The now-unused `recordingSummary` import is removed. No replacement copy or new visible section is added.

The existing header, complete phase-rendering loop, exercises, targets, weight fields, notes/attribution and native instructions/goals are unchanged. The overview now ends with its final phase; its next element remains the original yellow Start Workout button. Existing spacing is sufficient, so **all CSS and the Start/history/draft controls remain unchanged**.

Workout definitions, `resultFields`, warm-up/purpose/equipment data and `recordingSummary()` remain available in their original modules. No exercise, duration, results, weight/storage, timer/audio, plan, cloud/Auth or history logic changes. No text is relocated. This applies to all 12 phase-based definitions (the four current WODs and eight historical versions); demo/fallback routing is unchanged.

`service-worker.js` changes only cache **v24 → v25**. The exact same 69 precache URLs and activation/fetch strategy are retained. Manifest, icons, assets and all other application files remain unchanged.

Tests that previously expected the removed copy now require its absence and check retained data where applicable: `tests/app.spec.js`, `tests/monday-paranoid.spec.js`, `tests/thursday-bells.spec.js`, `tests/friday-to-black.spec.js` and `tests/workout-details.spec.js`. The detail-content case now checks every phase-based historical/current definition, including final-phase/Start adjacency. Its other phase/target/input/instruction/plan assertions remain. Other edits are current-cache expectations and visual artifact paths; no original case is removed or disabled, and unrelated assertions remain unchanged.

Source guards verify that the renderer differs from main only by the requested removal/unused import. Every other `src/` module, all CSS, data, controls, assets, manifest and SQL remain byte-identical. The worker differs only by the version string. All 106 JS files parse.

Verification covers weights (decimal/zero/blank/invalid/persistence), Start/countdown, existing draft recovery/history access, all four WODs, all historical phase definitions, mobile/desktop/200% text, native instructions and offline compatibility. **87 Node tests and 256 Playwright tests passed** in the complete one-worker run (10.9m). A final targeted recheck of the expanded content case passed in both projects (2 tests), retaining the original fixed names/durations for the four approved WODs and historical Focus v1 while adding all other historical phase definitions. No original case is removed or disabled.

Before/after review artifacts are in `/workspace/artifacts/ui-v2-07/`. Before images come from the previous delivered PR 06 capture: the application code/styles/index/worker at `b246450` are identical to merged base `d98ae86`, verified before reuse. Current after captures use the same fixed-clock/synthetic-data protocol. Full-page detail images show the shorter end of the page and unchanged controls. No private or production data is captured. Browser checks use Chromium, not physical-device or live Supabase testing.

No merge, deployment, SQL, migration, next PR or other redesign.

Application files changed: `src/ui/workout-details.js` (presentation/import removal only), `service-worker.js` (version string only). Test changes are limited to intentionally removed UI expectations/retained data, expansion to all historical phase definitions, cache-version expectations and artifact paths. Documentation: this report. No CSS, button, data or unrelated application changes.
