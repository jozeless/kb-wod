export const isClassicIron = workout => workout?.execution?.schema === 'classic-iron-rounds-v1';
export const classicIronSchema = {kind: 'completed-rounds', blocks: {}};

export function parseClassicIronPartialReps(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw) || Number(raw) > 69) throw new Error('Enter a whole number from 0 to 69.');
  return Number(raw);
}

// This envelope is memory-only until the explicit completed-session transaction.
export function createClassicIronSession(workout, storage, id = crypto.randomUUID(), now = new Date().toISOString()) {
  return {schemaVersion: 1, id, workoutId: workout.id, workoutVersion: workout.version,
    workoutSnapshot: structuredClone(workout), startedAt: now, completedAt: null,
    activeDurationMs: 0, status: 'in-progress', results: null};
}
export function classicIronFinalResults(record) {
  if (!isClassicIron(record.workoutSnapshot) || !record.completedAt || record.activeDurationMs !== record.workoutSnapshot.durationSeconds * 1000) throw new Error('Complete the whole workout before saving.');
  const rounds = record.results?.completedRounds;
  if (!Number.isSafeInteger(rounds) || rounds < 0) throw new Error('Completed rounds must be a non-negative whole number.');
  const partialReps = record.results.partialReps === undefined ? 0 : record.results.partialReps;
  if (!Number.isInteger(partialReps) || partialReps < 0 || partialReps > 69) throw new Error('Enter a whole number from 0 to 69.');
  return {completedRounds: rounds, partialReps};
}
