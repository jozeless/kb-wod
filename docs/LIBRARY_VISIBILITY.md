# Personal Library — Hide and Restore

Branch: `feature/library-hide-restore-wods`, based on merged main `f859b64` (PR #35).

## Behavior

Every public Library card has a separate secondary Hide button, outside its existing View/Assign button. Confirmation uses the requested workout-specific text. Confirmed hiding removes that ID from the visible Library and from every weekly assignment, including historical versions of that ID. The count reflects visible cards. Other cards retain catalog order and their normal actions.

The Hidden workouts disclosure lists hidden public WODs with Restore actions. Restoring returns a card to its original catalog position and does not recreate former assignments. When all eight public WODs are hidden, the empty state directs the user to this disclosure. Classic Iron uses the same behavior.

The static catalog, historical versions, sessions, result schemas, Classic Iron round times/partial reps, Progress, timers, audio and Focus Mode are not filtered, rewritten or deleted. Saved History remains accessible even when its workout is hidden.

## Local persistence and safety

Preferences use `kb2.library.visibility.v1:guest` or `kb2.library.visibility.v1:user:<user-id>`. Guest entries are never imported into an account. Each entry contains the desired visibility, last acknowledged revision, pending flag and operation/cleanup identifiers; definitions and results are not stored here.

All workspace changes share the existing `kb2-cloud-workspace` lock. Web Locks are used when available; an isolated IndexedDB read/write transaction serializes synchronous storage mutations otherwise. This database contains only an empty mutex store, not workout/session data. If safe locking or storage is unavailable, the operation reports failure.

The existing weekly-plan key and `loadPlan`/`savePlan` functions remain in use. Before modifying preferences, the active plan and the owner's cached plan/base, a durable undo journal stores their previous values. Session synchronization acknowledgments and other account snapshots remain intact. A failed write rolls back or keeps the recovery copy. Interrupted work is recovered before another workspace mutation. If recovery discovers an externally changed plan or metadata, it stops, reports the conflict and retains both snapshots instead of overwriting newer data. Corrupt preferences or journals are preserved and unsafe writes are disabled. Clearing the cached plan/base also prevents an offline hide/restore from resurrecting an old assignment on account switch or reload.

Every mutation rechecks the captured account, persisted auth owner and current workspace after acquiring the lock. Stale views and late network responses cannot modify another account's settings or active plan. Assignment actions now wait for the workspace lock and navigate to Today only after persistence succeeds; tests wait for that existing success navigation before reloading.

## Cloud synchronization and conflicts

The inspected checked-in schema, `202610220001_kb_cloud.sql`, defines sessions and weekly plans but no user preference table. This PR therefore includes a new table and narrowly scoped RPC. No production schema query or SQL execution was performed.

`kb_workout_visibility` is keyed by `(user_id, workout_id)`. Its RLS policy allows authenticated users to read only their own rows. Direct client writes and deletes are revoked. The RPC derives the owner from `auth.uid()`; callers cannot supply an owner. It changes one workout preference and clears only that user's matching weekly assignments in the same PostgreSQL transaction.

Each mutation has a compare-and-set revision and a stable operation UUID. Stale revisions are rejected; a lost response can be acknowledged/retried without applying cleanup twice or erasing a later assignment. Hiding and restoring while offline retains the pending cleanup intent, even when the final desired state is visible. Restores never reconstruct old assignments.

An account-scoped transaction lock is acquired before weekly-plan row locks. A plan trigger rejects assignments to hidden WODs, including stale clients using the existing bulk-plan endpoint. Other days and all session records remain untouched. Existing weekly-plan conflict handling remains in place for independent local/cloud plan edits; hidden IDs are removed from either offered plan.

On login, entering Library, returning to the app, reconnecting or pressing Retry, preferences are fetched and pending changes are sent. Different workout IDs merge independently. Concurrent opposite changes to the same ID present explicit Keep my setting / Use cloud setting actions; no stale full preference list overwrites another device.

Library displays its own settings status, separate from existing session/plan synchronization. Offline changes are queued durably. If the preference table/RPC is missing or blocked, Library says synchronization is unavailable, retains local changes and offers Retry. It never labels local-only preferences as synchronized across devices. Until a pending hide/restore cleanup is acknowledged, weekly-plan reconciliation remains visibly pending so an old cloud assignment cannot reappear. Existing session synchronization continues independently of missing preference endpoints, and Library synchronization is attempted before accessing History storage so a blocked session database does not prevent preference synchronization.

## Required manual Supabase setup — after review

1. Use the existing KB WOD Supabase project where the original sessions/weekly-plan migration is already installed. Inspect whether the new preference objects already exist before applying a migration a second time.
2. Review and apply **only** [`202611130001_library_visibility.sql`](../supabase/migrations/202611130001_library_visibility.sql) once through your normal migration workflow or the Supabase SQL editor. It is a transaction adding the new table, owner-scoped RPC, RLS and weekly-plan triggers. It contains no workout/session deletion or existing data rewrite.
3. Keep the existing Project URL and publishable key. No secret/service-role key, client config change or privileged key in JavaScript is required.
4. Allow PostgREST's schema cache to refresh, then open Library and choose Retry Library synchronization. Confirm its own status says Library settings synchronized.
5. Verify with two signed-in devices: hide a WOD assigned on multiple days; refresh/focus the other device; confirm only matching assignments disappear and unrelated days remain. Restore and confirm no old assignment returns. Inspect saved Classic Iron sessions to confirm their original payloads remain intact.

**This migration has not been executed in production.** Without this setup, guest/local preferences work and account preferences remain queued on that device; cross-device preference synchronization is unavailable and the UI reports that explicitly.

## Files

- New `src/domain/library-visibility.js`: preference validation and ID-based plan filtering.
- New `src/storage/library-visibility.js`: scoped keys, local commit/undo journal and recovery.
- New `src/platform/workspace-lock.js`: cross-tab locking and IndexedDB fallback.
- New `src/cloud/library-visibility.js`: account guards, per-workout sync, idempotent operations and conflict resolution.
- `src/cloud/api.js`, `runtime.js`, `sync.js`: authenticated transport, integration and guarded weekly-plan reconciliation.
- `src/main.js`: confirmation, actions, stale-owner guards, refresh/recovery and assignment locking.
- `src/ui/views.js`, `styles/hm-library.css`: sibling Hide actions, count, hidden list, restore and empty/error states.
- `service-worker.js`: v36 → v37; retain the previous 100 resources and precache four new modules (104 total).
- SQL migration, isolated PostgreSQL tests and `scripts/test-rls.sh` concurrency harness.
- New Node/browser feature tests; cache expectations, asynchronous assignment waits and intentional source integration hashes updated. The frozen footer comparison adapts only its Library rendering to include these new controls, preserving its navigation-only comparison.

## Validation

Evidence and logs are collected under `/workspace/artifacts/library-hide-restore/`. Coverage includes confirmation cancellation, every public card, empty Library, reload/PWA/offline use, History visibility with immutable Classic Iron results, guest/account isolation, two devices, same-browser tabs, failed writes and recovery, stale identity, lost responses, CAS conflicts, missing migration, storage-lock fallback and 320/390/768/1280 px at normal and 200% text.

`scripts/test-rls.sh` runs only in an isolated PostgreSQL Docker container with networking disabled. It verifies owner-only reads, denied direct/anonymous writes, atomic cleanup, unchanged historical results, stale revisions, idempotent retries, no restored assignments and two genuinely concurrent connections. The test container contains synthetic users and is removed afterward. No production SQL is run by this command.

Complete validation: **172 Node tests passed**, **436 Playwright tests passed** across mobile and desktop (12.8 minutes), and the isolated PostgreSQL RLS/concurrent-connection suite passed. There were no failures or skipped tests. The focused Hide/Restore browser suite also passed all 20 cases. The exact timer boundary regression uses the existing paused-clock helper, retaining every original deadline assertion; no production timer changes were needed. No merge, deployment or production SQL execution is included.
