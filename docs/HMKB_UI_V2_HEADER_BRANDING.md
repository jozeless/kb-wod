# HM/KB UI v2 — PR 03: Header and branding

Base: main `d9cf583`, with PR 02 merged. Branch: `feature/ui-v2-03-header-branding`.

## Approved original and provenance

The user supplied **HMKB_todo_en_un_zip.zip** after the original logo could not be found in the repository. The header uses its exact root entry **`hmkblogo001.png`**, copied byte-for-byte to `assets/branding/hmkblogo001.png`.

- Original: 1254 × 1254 RGB PNG, 1,413,609 bytes.
- SHA-256: `cdc6c25a8f59b0d52d5fe5c716d3284cfeaa24e6c95ba58dd1d0886c02128114`.
- The full artwork, including its original dark/purple background and margins, is retained. No cropping, background removal, color changes, recreation, generated replacement or re-encoding.
- Display size is 56 × 56 CSS pixels with `object-fit: contain`. Intrinsic dimensions are explicit. The image's size on disk is deliberately unchanged to preserve the supplied original exactly.
- The ZIP's transparent derivative, preview and alternative installation icon are **not** installed. Existing root PWA icons remain unchanged and independent of the new branding asset.

## Header composition only

`index.html` replaces the provisional KB 2.0 header link with the approved logo and **HEAVY METAL KB**. The real home link still targets `#today`, with accessible name “Heavy Metal KB home”. Its empty image alt avoids repeating the text already named by the link.

The left lockup uses readable bold system lettering; HEAVY METAL is yellow, KB lilac. No downloaded font, ornamental typeface claim, glow, animation, framework or dependency is added. The source image's existing glow is part of its unchanged artwork. All application typography outside this header remains unchanged.

The right area contains the existing dynamically generated account link and live synchronization text. In `src/main.js`, **only the append target** changes from `.app-header` to `.app-header .header-account`. The same elements, subscriptions, messages, login/account targets, authentication, offline handling, error rendering, account switching and synchronization code remain in use. The tagline appears only at ≥960px when space permits. Long sync messages wrap without truncation; no state is communicated by color alone.

All new rules are in **`styles/hm-header.css`**, loaded after tokens and `app.css`. Every selector is restricted to `.app-header`; `styles/app.css` and `styles/hm-tokens.css` are untouched. The new stylesheet uses the approved palette, radius and focus tokens. Header links have yellow keyboard outlines on the dark background; the account link has a ≥44px touch target. Padding respects top/left/right safe-area insets. The normal-flow header can change the vertical starting position of the page content; it does not overlay the timer or alter its layout.

## Protected behavior and PWA

The four approved Library entries and all historical definitions/versions remain unchanged. Today/week planning, cards, navigation, details, active timer presentation/logic, results/forms, history, Stats/Dashboard, audio, IndexedDB, local weight preferences, Supabase modules/configuration, SQL and all stored data are unchanged. No migration, production request, merge or deployment is performed.

The manifest (including its KB 2.0 installation name), root icon files and identity remain unchanged. Cache advances **v20 → v21**, retaining all 64 existing precache URLs and adding only the header stylesheet and the approved logo (66 URLs / 65 files plus the application root). All 52 reachable runtime ES modules remain cached. The existing waiting-worker activation strategy is unchanged: no `skipWaiting` or `clients.claim` is introduced.

## Deterministic verification

New header tests cover Today, Library, Monday v3 details, active timer, results, saved history and account at **320, 390, 768 and 1280px**, using isolated synthetic fixtures and a frozen clock. There are **28 before/after pairs**. No private user data is captured and no live Supabase service is contacted.

The previous main header is frozen in the test-only `tests/fixtures/ui-v2-02-header.html`. Before captures serve that markup, omit the new header stylesheet and restore the previous append selector in the test response. They otherwise use the same current runtime and fixtures as after captures; source-diff checks independently confirm that the selector is the only runtime JavaScript change.

- Real `*-viewport.png` captures show the entire actual viewport, including the new header and unchanged bottom navigation. Full-page captures are also supplied; only these hide the fixed navigation during capture to avoid a fixed bar painting across the middle of long content.
- Protected geometry, fonts, colors, borders, padding and shadows for **all visible content elements**, global status and navigation are compared exactly. Content positions are relative to the main container so the intentional header-height change does not appear as a component redesign.
- Separate `*-content.png` comparisons require byte-identical main content pixels. For this check only, the header is hidden during the screenshot on both sides to normalize fractional vertical rasterization; navigation is also hidden. The real viewport captures have no such modifications.
- Logo decode/natural dimensions, original-file hash, home/account links, keyboard order/focus, no horizontal overflow, no overlapping/clipped header controls, consistent route rendering and no browser errors are checked.
- Live mocked-cloud tests exercise login, intermediate sync updates, success, server error/retry, offline/reconnection, long plan-conflict status, logout and a second account. Layout is checked at all four widths and with the longer statuses at 320px. No mock is added to application code.
- Real service-worker tests verify cached logo/styles and offline reload/navigation, while retaining the original manifest identity and icons.

The PR 01/02 baseline, contrast, keyboard, navigation and offline suites remain enabled. Their cache expectation advances to v21 and their stylesheet-order assertion includes the new scoped file. Their screenshots now go to the PR 03 `regressions/` directory. No existing test is disabled or skipped.

Artifacts: `/workspace/artifacts/ui-v2-03/`. See `index.md` for before/after viewport links and `comparison.json` for hashes. The new header suites run in both Chromium projects; the seven-route matrices split 320/390px into mobile and 768/1280px into desktop.

Known limits: browser automation uses Chromium with simulated widths, synthetic local sessions and mocked cloud responses. It does not replace physical-device Safari/Android, nonzero hardware safe-area, screen-reader or live Supabase validation. The approved logo is intentionally displayed whole; its original background/margins remain visible at the compact size. The display typeface, navigation and timer redesigns remain future work requiring separate review.

## Delivery verification

Changed application files:

- `index.html`: scoped stylesheet reference and header markup only.
- `src/main.js`: one insertion selector for the existing account/sync nodes.
- `styles/hm-header.css`: new header-only layout, palette and focus rules.
- `assets/branding/hmkblogo001.png`: exact approved original from the user's ZIP.
- `service-worker.js`: v21 and two additional precache URLs only.

Documentation: this report and the PR 03 status in `docs/HMKB_UI_V2.md`.

Tests: new `tests/header-branding.spec.js`, `tests/header-branding.test.js` and `tests/fixtures/ui-v2-02-header.html`; extended shared `tests/helpers/ui-baseline.js`; cache expectations in `tests/custom-audio.spec.js`, `tests/library-cleanup.spec.js` and `tests/ui-foundations.spec.js`, with the latter's stylesheet-order assertion extended as well. Original checks remain active.

Final verification:

- **83 Node tests passed; 226 Playwright tests passed** in the complete final run (5.9 minutes for browser tests). No tests disabled or skipped.
- All 28 viewport pairs intentionally differ in the header; all 28 normalized main-content PNG pairs are byte-identical, with matching protected styles/relative geometry.
- Existing contrast, offline, navigation, planning, historical/current workouts, result recovery/history, audio and cloud suites pass. New account/status tests pass for success, errors/retry, offline/reconnect, a genuine fresh-account plan conflict and account switching.
- **100 JavaScript modules** parse successfully. All 52 reachable runtime modules and all 66 precache URLs exist; no previous entry is removed.
- Diff guards confirm that the single header append selector is the only runtime JS change. Original CSS/tokens, all other runtime modules, manifest/icons, historical audio and SQL remain unchanged. The PNG matches the ZIP entry exactly. `git diff --check` passes.

No next UI v2 stage is started. No merge or deployment.
