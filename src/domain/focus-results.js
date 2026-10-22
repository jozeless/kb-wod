import { readWeight } from '../storage/weight-preferences.js';
export function preferredWeight(storage, workout, exercise) {
  const current = readWeight(storage, workout, exercise);
  // Read-only fallback for existing v1 preferences; never migrate or rewrite them.
  return current === '' && workout.version === 2 ? readWeight(storage, { ...workout, version: 1 }, exercise) : current;
}
export function createDraft(workout, storage, id = crypto.randomUUID(), now = new Date().toISOString()) {
  const form = { upper: {}, abs: {}, perceivedEffort: '', notes: '', invalid: {} };
  for (const phase of workout.phases) for (const exerciseId of phase.exerciseIds) {
    const exercise = workout.exercises.find(ex => ex.id === exerciseId);
    let weightKg = '';
    try { weightKg = preferredWeight(storage, workout, exercise); } catch { /* Unavailable preferences stay unspecified. */ }
    form[phase.id][exerciseId] = phase.id === 'upper' ? { weightKg, round1: '', round2: '' } : { weightKg, intervalsCompleted: '' };
  }
  return { schemaVersion: 1, id, workoutId: workout.id, workoutVersion: workout.version, workoutSnapshot: structuredClone(workout),
    startedAt: now, completedAt: null, activeDurationMs: 0, status: 'draft', stage: 'upper-active', blockIndex: 0,
    checkpointMs: 0, completedBlocks: [], hasStarted: false, soundEnabled: true, form, results: null };
}
export function optionalNumber(raw, label, { integer = false, min = 0, max = Infinity } = {}) {
  if (raw === '') return null;
  const value = Number(raw);
  if (typeof raw !== 'string' || !raw.trim() || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${label}: enter ${integer ? 'a whole number' : 'a number'} from ${min}${Number.isFinite(max) ? ` to ${max}` : ' or greater'}, or leave it blank.`);
  }
  return value;
}
export function blockResults(workout, form, blockId) {
  if (Object.entries(form.invalid || {}).some(([key, value]) => key.startsWith(`${blockId}.`) && value)) throw new Error('Correct the invalid numeric fields before continuing.');
  return workout.phases.find(p => p.id === blockId).exerciseIds.map(exerciseId => {
    const fields = form[blockId][exerciseId];
    const name = workout.exercises.find(ex => ex.id === exerciseId).name;
    const result = { exerciseId, weightKg: optionalNumber(fields.weightKg, `${name} weight`) };
    if (blockId === 'upper') result.rounds = [optionalNumber(fields.round1, `${name} Round 1`, { integer: true }), optionalNumber(fields.round2, `${name} Round 2`, { integer: true })];
    else result.intervalsCompleted = optionalNumber(fields.intervalsCompleted, `${name} intervals`, { integer: true, max: 2 });
    return result;
  });
}
export function finalResults(record) {
  if (record.stage !== 'abs-results' || record.completedBlocks.length !== 2 || record.activeDurationMs !== record.workoutSnapshot.durationSeconds * 1000) throw new Error('Complete both blocks before saving.');
  if (record.form.invalid?.perceivedEffort) throw new Error('Correct perceived effort before saving.');
  return { upper: blockResults(record.workoutSnapshot, record.form, 'upper'), abs: blockResults(record.workoutSnapshot, record.form, 'abs'),
    perceivedEffort: optionalNumber(record.form.perceivedEffort, 'Perceived effort', { integer: true, min: 1, max: 10 }), notes: record.form.notes };
}
