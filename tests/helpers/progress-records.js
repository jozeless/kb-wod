// Synthetic fixtures are test-only; exercise definitions and final result builders
// are the same ones used when a real workout is saved.
import { findWorkout } from '../../src/data/catalog.js';
import { createDraft, finalResults } from '../../src/domain/result-schemas.js';
export function savedRecord({id = 'saved', workoutId = 'monday-paranoid', version = workoutId === 'monday-paranoid' ? 3 : 1, startedAt = '2026-10-05T12:00:00Z', ownerId = null, weight = null, reps = null, steps = null, rounds = null, left = null, right = null} = {}) {
  const workout = findWorkout(workoutId, version), record = createDraft(workout, {getItem: () => null}, id, startedAt);
  record.ownerId = ownerId; record.stage = `${workout.phases.at(-1).id}-results`;
  record.blockIndex = workout.phases.length - 1; record.completedBlocks = workout.phases.map(p => p.id);
  record.activeDurationMs = workout.durationSeconds * 1000; record.completedAt = startedAt;
  const raw = value => value === null ? '' : String(value);
  if (record.form.weights) {
    for (const key of Object.keys(record.form.weights)) record.form.weights[key] = raw(weight);
    if ('finisherReps' in record.form) record.form.finisherReps = raw(reps);
    if ('totalSteps' in record.form) record.form.totalSteps = raw(steps);
    if ('fullRounds' in record.form) record.form.fullRounds = raw(rounds);
    if ('leftReps' in record.form) { record.form.leftReps = raw(left); record.form.rightReps = raw(right); }
  } else {
    for (const phase of workout.phases) for (const exerciseId of phase.exerciseIds) record.form[phase.id][exerciseId].weightKg = raw(weight);
    if ('fullRounds' in record.form) record.form.fullRounds = raw(rounds);
  }
  record.results = finalResults(record); record.status = 'completed';
  return record;
}
export function progressRecords() {
  return [
    savedRecord({id: 'monday-early', weight: 12, reps: 17}),
    savedRecord({id: 'monday-later', startedAt: '2026-10-12T12:00:00Z', weight: 16, reps: 20}),
    savedRecord({id: 'tuesday', workoutId: 'tuesday-of-spades', startedAt: '2026-10-12T16:00:00Z', rounds: 3}),
    savedRecord({id: 'thursday', workoutId: 'thursday-bells', startedAt: '2026-10-15T12:00:00Z', steps: 61}),
    savedRecord({id: 'friday', workoutId: 'friday-to-black', startedAt: '2026-10-16T12:00:00Z', rounds: 4, left: 6, right: 5}),
    savedRecord({id: 'historical-focus', workoutId: 'focus-001-upper-abs', version: 2, startedAt: '2026-09-28T12:00:00Z', weight: 8}),
  ];
}
