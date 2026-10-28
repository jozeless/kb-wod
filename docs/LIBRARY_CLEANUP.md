# Library cleanup v1

## Public selection: 11 cards → 4

The public Library and every Today Add/Change picker show exactly these existing references, in order:

| Order | ID | Version | Name |
| --- | --- | --- | --- |
| 1 | `monday-paranoid` | 3 | Monday Paranoid |
| 2 | `tuesday-of-spades` | 1 | Tuesday of Spades |
| 3 | `thursday-bells` | 1 | Thursday Bells |
| 4 | `friday-to-black` | 1 | Friday To Black |

`libraryWorkouts` explicitly references the existing definition objects; it does not clone or duplicate them and does not automatically follow unapproved future versions. The count reads `4 workouts`. The search box, type dropdown, filter listeners/update function and demo explanation are removed from this public view. Current HM/KB card components, phase bars, durations, detail/start routes, CSS, header and global navigation remain unchanged. UI v2 is outside this change.

## Complete internal registry and preservation

`workouts` still contains all **15** original definitions/versions; `currentWorkouts` still exposes the previous **11** latest-per-ID entries as a compatibility export. Neither is the public selection anymore. `findWorkout(id, version)` is unchanged and resolves exact historical versions, including Monday v1/v2, old Focus/Hybrid and all demos.

Only `src/data/catalog.js`, `src/ui/views.js` and the service-worker cache version change in runtime code. No legacy definition, result schema/form, timer/cue/audio module, storage layer, cloud module, SQL, media or stylesheet is changed/deleted. No migration, archival flag, version renumbering, data cleanup or automatic weekly reassignment runs.

Today still resolves assigned cards through `findWorkout`, independently of public visibility. Historical assignments remain viewable/removable; Change offers only the four approved references. Cancel leaves the original reference untouched. Seven-day order and user-selected reuse across days remain unchanged. Direct historical workout links, draft Resume actions on their detail screens and saved-session history still work, including offline. No new legacy-browsing directory or replacement UI is introduced.

IndexedDB session records and snapshots, completed measurements, local drafts, local weight preferences, prototype keys, cloud sessions, owner metadata and weekly plans remain in their existing structures. Auth/RLS/cloud synchronization contracts are untouched; old cloud plan references remain valid. Historical card removal from public choices never filters saved histories or rewrites data.

The old domain filter helper/type registry remain for internal compatibility and existing logic tests. Removed controls/listeners were specific to the old Library; unrelated global styles and historical flows are retained rather than broadly refactored.

## PWA and verification

Cache advances from `kb2-static-v17` to `kb2-static-v18`. No precache paths are removed: all legacy definitions, result forms, schemas, timer/audio modules and historical media remain available offline. There are no new runtime modules. The normal waiting-worker activation lifecycle remains unchanged; this branch performs no deployment.

New logic tests assert the four exact tuples/order, object identity with the full registry, uniqueness, unchanged 15-entry registry/11-entry compatibility view and resolvable historical versions.

New browser coverage checks:

- Exactly four approved cards and ordered versioned detail links; all four Start flows still enter their timers.
- No search, type selector or obsolete demo explanation.
- All seven Add/Change pickers offer the same four references.
- Seven existing historical assignments remain unchanged after view/cancel; removal changes only the chosen slot; weight/prototype preferences survive.
- Historical Focus/Hybrid completed records are readable and byte-for-byte object-equal after navigation; their drafts resume offline, advance only when explicitly resumed and preserve form/snapshot/ID.
- Offline public Library, all four approved details, historical Monday v1/v2 and retained cached legacy modules.
- Responsive layouts at 320, 390, 768 and 1280px, keyboard focus and unchanged navigation.

Existing browser tests are adapted without disabling test cases: approved workouts replace demos/legacy options in new-assignment UI tests, while historical tests seed existing assignments or open direct versioned links. Their timer, audio, results, offline recovery, history, account ownership and simulated Supabase synchronization assertions remain enabled. Domain search/filter tests remain enabled even though the public controls are intentionally removed.

Screenshots: `/workspace/artifacts/library-cleanup-mobile.png` (390px) and `library-cleanup-desktop.png` (1280px). Fixed navigation is hidden only for those full-page captures so it does not overlay long screenshots; matching `*-viewport.png` captures show the actual unchanged navigation. This is a test capture option, not an application style change.

Automated browser checks use Chromium mobile/desktop viewports; cloud behavior is exercised with existing mocked Auth/REST tests. No live Supabase/production data is touched. Existing browser/OS persistence limits remain unchanged. No merge, deploy, SQL changes or UI v2 work.

## Final verification

- `npm test`: **79 passed**, zero failures.
- `npx playwright test --reporter=line`: **212 passed**, mobile and desktop projects.
- All **15 pre-existing browser spec files** retain their test declaration counts; no new skip/fixme/only markers. Five new browser test declarations run in both viewport projects.
- Static checks: **91 JavaScript modules** parse; all **52 reachable runtime modules** remain precached and all **62 static paths** exist. No build step is defined for this native ES-module app.
- Independent comparison with fetched main confirms identical full **15-entry registry**, **11-entry latest-version compatibility export**, and all exact `(id, version)` lookups.
- `git diff --check` passes. Diff guards preserve every workout definition, domain/timer/result/audio module, storage/cloud layer, historical renderer/form, universal card/detail component, stylesheet, SQL and historical media.

## Changed files

```text
README.md
docs/LIBRARY_CLEANUP.md
docs/SUPABASE.md
docs/TIMER_AUDIO.md
service-worker.js
src/data/catalog.js
src/ui/views.js
tests/app.spec.js
tests/cloud.spec.js
tests/custom-audio.spec.js
tests/focus-results.spec.js
tests/friday-to-black.spec.js
tests/hybrid-results.spec.js
tests/hybrid.spec.js
tests/library-cleanup.spec.js
tests/library-cleanup.test.js
tests/monday-paranoid-v2.spec.js
tests/monday-paranoid-v3.spec.js
tests/monday-paranoid.spec.js
tests/new-wods-002.spec.js
tests/thursday-bells.spec.js
tests/timer.spec.js
tests/tuesday-of-spades.spec.js
```
