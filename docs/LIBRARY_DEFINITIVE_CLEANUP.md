# Definitive Library cleanup

Branch: `feature/library-definitive-cleanup`, based on merged main `3cb41b0` (PR #36).

## Current application

Classic Iron v1 is the only registered/available definition. Monday Paranoid, Tuesday of Spades, Thursday Bells, Friday To Black, the three Oldschool WODs, their prior versions and earlier Focus/Hybrid/demo scaffolding are removed from runtime. Old detail/active/result URLs show Workout unavailable and cannot start a timer. The catalog remains a reusable list: future definitions automatically populate Library, its count and assignment pickers.

Application source shrinks from 82 JavaScript modules to 31 reachable modules. The 51 unreachable modules removed include legacy definitions, block/interval UI controllers, obsolete result validators/forms, manual weight preferences, unused sample-loading code and Hide/Restore. Its UI, endpoints, local preference subsystem, SQL migration and dedicated tests are removed. Shared modules actually used by Classic Iron remain.

Classic Iron's definition, monotonic timer, RoundAmrapTimer, active presentation/controller, result validation, round-time display, synthesized audio, session store, Auth, installed icons and general styling remain byte-identical to main. Tests enforce the preserved files' hashes. History now renders only available saved workouts; Progress retains the monthly overview, calendar and fastest-round metric. Weight/finisher analytics used only by removed WODs are retired.

## Planning and safety

`cleanWeeklyPlan` is a retired-ID projection used for Today, assignments, account workspaces, cached plan snapshots/bases, remote plans and conflict choices. References to retired IDs become null; Classic Iron and future references remain. Unknown future IDs/versions are preserved without becoming startable, so an older installed client cannot erase a newer client's assignment. Current workspace cleanup persists the cleaned plan under the shared cross-tab lock, including on plan storage events. Other accounts' caches are sanitized when their workspace is activated.

Outdated remote assignments are cleared through existing owner-scoped weekly-plan upserts. Local/cloud differences between still-available assignments retain the existing explicit conflict choices. Account/revision/workspace guards protect late responses and stale tabs. Failed writes and cloud errors are reported; malformed plan storage is preserved. No database-wide cleanup, bulk session rewrite, IndexedDB schema change or session deletion is performed.

Saved obsolete sessions stay in IndexedDB and Supabase unchanged. They are excluded from History/Progress, explicit import and the upload/download queue, so obsolete result shapes do not block Classic Iron. Frozen synthetic saved snapshots exist only in test fixtures to verify preservation. Existing Classic Iron records without partial reps or round times remain readable without fabricated timing data or local rewrites.

Abandoned Hide/Restore preference keys and journals are not read or deleted, and cannot hide Classic Iron or block the app. Historical static assets remain in Git; the offline manifest lists only reachable runtime modules plus current styling/branding/install assets and retained audio files. Cache advances from v37 to **v38**, with **54** precached URLs. Existing waiting-worker activation behavior is preserved: close old installed-app windows/tabs to activate an update; an already-open old client keeps its old code until then.

## Existing PR #36 database objects

**No production SQL or schema inspection was executed.** Removing a checked-in migration does not uninstall database objects that were already deployed. This app no longer calls the visibility table or RPC.

If `202611130001_library_visibility.sql` was previously applied, have the database owner review retirement of the `kb_plan_library_lock` and `kb_plan_visible_workout` triggers on `kb_weekly_plan` in a separate approved database maintenance step. In particular, a previously hidden Classic Iron row can make the old visibility trigger reject a normal plan assignment. The app reports that write failure; it cannot override that server restriction without a database change. Existing session synchronization is independent of these triggers.

Do not drop tables or delete preference/session rows as part of this application PR. The existing preference table/functions and all saved results may remain until the planned final data cleanup. The original `202610220001_kb_cloud.sql`, Auth and session/weekly-plan RLS are preserved. No replacement SQL migration is introduced or automatically run.

## Validation

The retained suite covers Classic Iron timer/rest/countdown, round/partial-rep validation, precise times, pause/resume, audio/background restrictions, failed saves, account ownership/sync, cross-device plan conflicts, offline and PWA icon identity. Obsolete feature-specific suites and frozen UI baselines are removed; account/cloud fixtures are adapted to Classic Iron without weakening their assertions.

New cleanup tests cover every retired route/version, local/cached/cloud plans, cross-tab stale assignments, unchanged old session snapshots, storage restrictions, ignored old preferences, future catalog registration, cache eviction and layouts at 320/390/768/1280 px and 100%/200% text.

Complete validation: **59 Node tests passed** and **84 Playwright tests passed** across mobile and desktop (1.0 minute), without failures or skipped tests. The preserved-file regression confirms Classic Iron programming, timers, controllers, audio, result validation, storage, Auth and styling remain unchanged. No merge, deployment or production SQL execution is included.
