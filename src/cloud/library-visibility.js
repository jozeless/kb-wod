import { authKey } from './auth.js';
import { workspaceKey, accountKey } from './sync.js';
import { withWorkspaceLock } from '../platform/workspace-lock.js';
import { hiddenWorkoutIds, withoutHiddenWorkouts } from '../domain/library-visibility.js';
import { readVisibility, commitVisibility, recoverVisibility } from '../storage/library-visibility.js';

export function createLibraryVisibility(auth, api, {storage, online = () => navigator.onLine, lock = withWorkspaceLock} = {}) {
  let error = '', running = false, rerun = false, conflicts = {}, conflictOwner = null, verifiedOwner = null;
  const listeners = new Set(), owner = () => auth.user?.id || null;
  const commit=(ownerId,entries)=>commitVisibility(storage,ownerId,entries,ownerId?accountKey(ownerId):null);
  const emit = () => listeners.forEach(fn => fn());
  function assertContext(expected) {
    if (owner() !== expected || (storage.getItem(workspaceKey) || null) !== expected ||
      (auth.configured && (JSON.parse(storage.getItem(authKey) || 'null')?.user?.id || null) !== expected)) throw new Error('Account changed. Library settings were not changed.');
  }
  function read() { return readVisibility(storage, owner()); }
  function status() {
    try {
      const current = read(), pending = Object.values(current.entries).some(e => e.dirty);
      return {hiddenIds: hiddenWorkoutIds(current.entries), blocked: Boolean(current.journal), error: error || (current.journal ? 'A Library change was interrupted. Retry synchronization to recover it.' : ''), conflicts: conflictOwner === owner() ? conflicts : {},
        message: !owner() ? 'Saved on this device · Guest' : error ? 'Library sync unavailable · Changes remain on this device' : pending || verifiedOwner !== owner() ? online() ? 'Library sync pending' : 'Library sync pending · Offline' : online() ? 'Library settings synchronized' : 'Library settings cached · Offline'};
    } catch { return {hiddenIds: [], blocked: true, error: 'Library preferences could not be read. Existing data was preserved. Changes are disabled.', conflicts: {}, message: 'Library settings unavailable'}; }
  }
  async function change(id, hidden, expected = owner()) {
    try {
      await lock(() => {
        assertContext(expected); recoverVisibility(storage, expected);
        const current = readVisibility(storage, expected), entry = current.entries[id] || {revision: 0};
        commit(expected, {...current.entries, [id]: {hidden, revision: entry.revision, dirty: Boolean(expected), operationId: expected ? crypto.randomUUID() : null, cleanupToken: expected ? hidden ? crypto.randomUUID() : entry.cleanupToken || null : null}});
      });
      error = ''; emit(); return true;
    } catch (failure) { error = `Library change failed: ${failure.message}. Retry when storage is available.`; emit(); return false; }
  }
  async function synchronize(valid = () => true) {
    if (running) { rerun = true; return; }
    running = true; const expected = owner(), revision = auth.revision;
    const check = () => { assertContext(expected); if (!valid() || revision !== auth.revision) throw new Error('Account changed.'); };
    try {
      await lock(() => { check(); recoverVisibility(storage, expected); });
      if (!expected) { error = ''; return; }
      if (!online()) return;
      const remote = await api.visibility();
      let pending = [];
      await lock(() => {
        check(); const current = readVisibility(storage, expected), entries = {...current.entries};
        conflicts = {}; conflictOwner = expected;
        const seen = new Set();
        for (const row of remote) {
          if (row.user_id !== expected || typeof row.workout_id !== 'string' || !row.workout_id || typeof row.hidden !== 'boolean' || !Number.isSafeInteger(row.revision) || row.revision < 1 || seen.has(row.workout_id)) throw new Error('Invalid cloud Library settings.');
          seen.add(row.workout_id); const local = entries[row.workout_id];
          if (local?.dirty && local.operationId && local.operationId === row.operation_id) {
            if (local.hidden !== row.hidden) throw new Error('Invalid Library operation acknowledgment.');
            entries[row.workout_id] = {hidden: row.hidden, revision: row.revision, dirty: false, operationId: row.operation_id, cleanupToken: null};
            continue;
          }
          if (local?.dirty && (local.hidden !== row.hidden || local.cleanupToken)) {
            if (local.revision !== row.revision && local.hidden !== row.hidden) conflicts[row.workout_id] = row;
            else if (local.hidden === row.hidden) entries[row.workout_id] = {...local, revision: row.revision};
          } else entries[row.workout_id] = {hidden: row.hidden, revision: row.revision, dirty: false, operationId: row.operation_id || null};
        }
        for (const [id, entry] of Object.entries(entries)) {
          if (!seen.has(id) && entry.revision > 0) throw new Error('Cloud Library settings are incomplete. Local settings were preserved.');
          if (entry.dirty && !conflicts[id]) pending.push([id, {...entry}]);
        }
        commit(expected, entries);
      });
      for (const [id, sent] of pending) {
        check(); const row = await api.setVisibility(id, sent.hidden, sent.revision, Boolean(sent.cleanupToken), sent.operationId);
        await lock(() => {
          check(); const current = readVisibility(storage, expected), latest = current.entries[id];
          // A new local action during the request remains queued against the ack.
          const unchanged = latest?.hidden === sent.hidden && latest?.revision === sent.revision;
          const cleanupToken = latest?.cleanupToken === sent.cleanupToken ? null : latest?.cleanupToken;
          commit(expected, {...current.entries, [id]: {...latest, revision: row.revision, cleanupToken, dirty: !unchanged || Boolean(cleanupToken)}});
          if (!unchanged || cleanupToken) rerun = true;
        });
      }
      error = Object.keys(conflicts).length ? 'Library settings changed on another device. Choose which setting to keep below.' : '';
      if (!error) verifiedOwner = expected;
    } catch (failure) {
      if (owner() === expected) error = expected ? `Library sync failed: ${failure.message} Check the Library preferences migration and retry.` : `Library recovery failed: ${failure.message} Retry when storage is available.`;
    } finally { running = false; emit(); if (rerun) { rerun = false; queueMicrotask(() => void synchronize()); } }
  }
  async function resolve(id, useLocal, expected = owner()) {
    const remote = conflictOwner === expected && conflicts[id]; if (!remote) return;
    try {
      await lock(() => {
        assertContext(expected); const current = readVisibility(storage, expected), latest = current.entries[id];
          const dirty=useLocal || Boolean(latest.cleanupToken);
        commit(expected, {...current.entries, [id]: {hidden: useLocal ? latest.hidden : remote.hidden, revision: remote.revision, cleanupToken: latest.cleanupToken || null, operationId: dirty ? crypto.randomUUID() : remote.operation_id || null, dirty}});
      });
      delete conflicts[id]; error = ''; emit();
    } catch (failure) { error = failure.message; emit(); }
  }
  return {change, synchronize, resolve, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, get state() { return status(); },
    refreshStatus: emit,
    assertContext, recover(ownerId) { recoverVisibility(storage, ownerId); },
    hasPendingCleanup(ownerId = owner()) { return Object.values(readVisibility(storage, ownerId).entries).some(entry => Boolean(entry.cleanupToken)); },
    hiddenIdsFor(ownerId) { return hiddenWorkoutIds(readVisibility(storage, ownerId).entries); },
    cleanPlan(plan, ownerId = owner()) { return withoutHiddenWorkouts(plan, hiddenWorkoutIds(readVisibility(storage, ownerId).entries)); },
    workspaceChanged() { error = ''; conflicts = {}; conflictOwner = owner(); emit(); },
  };
}
