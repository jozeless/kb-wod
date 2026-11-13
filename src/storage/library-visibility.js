import { validateVisibility, hiddenWorkoutIds, withoutHiddenWorkouts } from '../domain/library-visibility.js';
import { loadPlan, savePlan, planKey } from './weekly-plan.js';
import { validatePlan } from '../domain/planning.js';
export const visibilityKey = owner => `kb2.library.visibility.v1:${owner ? `user:${owner}` : 'guest'}`;
export function readVisibility(storage, owner) {
  const raw = storage.getItem(visibilityKey(owner));
  return raw === null ? {version: 1, entries: {}} : validateVisibility(JSON.parse(raw));
}
function restoreRaw(storage, key, raw) { if (raw === null) storage.removeItem(key); else storage.setItem(key, raw); }
// Recover before any further workspace mutation, under the shared cross-tab lock.
export function recoverVisibility(storage, owner) {
  const state = readVisibility(storage, owner), journal = state.journal;
  if (!journal) return;
  if (!(journal.beforePlan === null || typeof journal.beforePlan === 'string') || !(journal.afterPlan === null || typeof journal.afterPlan === 'string')) throw new Error('Library recovery data is invalid. Existing data was preserved.');
  for (const raw of [journal.beforePlan, journal.afterPlan]) if (raw !== null) validatePlan(JSON.parse(raw));
  const current = storage.getItem(planKey);
  if (current !== journal.beforePlan && current !== journal.afterPlan) throw new Error('An interrupted Library change conflicts with a newer weekly plan. Both plan copies were retained; no changes were overwritten.');
  if (journal.metadataKey) {
    if (!owner || journal.metadataKey !== `kb2.cloud.account.v1:${owner}`) throw new Error('Invalid Library recovery owner.');
    const metadata = storage.getItem(journal.metadataKey);
    if (metadata !== journal.beforeMetadata && metadata !== journal.afterMetadata) throw new Error('Account plan changed during Library recovery. Both copies were retained.');
    for (const raw of [journal.beforeMetadata, journal.afterMetadata]) if (raw !== null) {
      const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid account plan recovery data.');
      if(parsed.plan){validatePlan(parsed.plan.value);if(parsed.plan.base)validatePlan(parsed.plan.base);}
    }
  }
  if (current !== journal.beforePlan) restoreRaw(storage, planKey, journal.beforePlan);
  if (journal.metadataKey && storage.getItem(journal.metadataKey) !== journal.beforeMetadata) restoreRaw(storage,journal.metadataKey,journal.beforeMetadata);
  storage.setItem(visibilityKey(owner), JSON.stringify({version: 1, entries: state.entries}));
}
// A durable undo journal covers preferences and both local plan records. Failures
// either roll back or retain the complete recovery copy; no optimistic success.
export function commitVisibility(storage, owner, entries, metadataKey = null) {
  recoverVisibility(storage, owner);
  const before = readVisibility(storage, owner), key = visibilityKey(owner);
  validateVisibility({version: 1, entries});
  const loaded = loadPlan(storage); if (loaded.error) throw new Error(loaded.error);
  const next = withoutHiddenWorkouts(loaded.plan, hiddenWorkoutIds(entries));
  const beforePlan = storage.getItem(planKey);
  const changed = JSON.stringify(loaded.plan) !== JSON.stringify(next);
  const beforeMetadata=metadataKey?storage.getItem(metadataKey):null;
  let afterMetadata=beforeMetadata;
  if(metadataKey){
    if(!owner||metadataKey!==`kb2.cloud.account.v1:${owner}`)throw new Error('Invalid Library metadata owner.');
    if(beforeMetadata!==null){const metadata=JSON.parse(beforeMetadata);if(metadata.plan){
      validatePlan(metadata.plan.value);const value=withoutHiddenWorkouts(metadata.plan.value,hiddenWorkoutIds(entries));
      const base=metadata.plan.base?withoutHiddenWorkouts(validatePlan(metadata.plan.base),hiddenWorkoutIds(entries)):metadata.plan.base;
      if(JSON.stringify(value)!==JSON.stringify(metadata.plan.value)||JSON.stringify(base)!==JSON.stringify(metadata.plan.base))afterMetadata=JSON.stringify({...metadata,plan:{...metadata.plan,value,base}});
    }}
  }
  if (!changed && beforeMetadata===afterMetadata && JSON.stringify(before.entries) === JSON.stringify(entries)) return next;
  const afterPlan = changed ? JSON.stringify(next) : beforePlan;
  storage.setItem(key, JSON.stringify({...before, journal: {beforePlan, afterPlan, metadataKey, beforeMetadata, afterMetadata}}));
  try {
    if (changed) savePlan(storage, next);
    if(metadataKey&&beforeMetadata!==afterMetadata)restoreRaw(storage,metadataKey,afterMetadata);
    storage.setItem(key, JSON.stringify({version: 1, entries}));
  } catch (error) {
    try { recoverVisibility(storage, owner); } catch { /* Durable journal remains for recovery. */ }
    throw error;
  }
  return next;
}
