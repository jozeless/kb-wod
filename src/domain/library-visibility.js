export function validateVisibility(value) {
  if (!value || value.version !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) throw new Error('Library preferences could not be read. Existing data was preserved.');
  for (const [id, entry] of Object.entries(value.entries)) {
    if (!/^[a-z0-9][a-z0-9-]{0,199}$/.test(id) || !entry || typeof entry.hidden !== 'boolean' || typeof entry.dirty !== 'boolean' || !Number.isSafeInteger(entry.revision) || entry.revision < 0 || (entry.cleanupToken != null && typeof entry.cleanupToken !== 'string') || (entry.operationId != null && typeof entry.operationId !== 'string')) throw new Error('Invalid Library preferences. Existing data was preserved.');
  }
  return value;
}
export const hiddenWorkoutIds = entries => Object.keys(entries).filter(id => entries[id].hidden);
export function withoutHiddenWorkouts(plan, ids) {
  const hidden = new Set(ids);
  return Object.fromEntries(Object.entries(plan).map(([day, ref]) => [day, ref && hidden.has(ref.workoutId) ? null : ref]));
}
