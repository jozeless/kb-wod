import { createDraft as baseDraft, optionalNumber } from './focus-results.js';
import { readWeightPreference } from '../storage/weight-preferences.js';
import { weightedExercises } from './tuesday-results.js';
export const isThursdayResults = workout => workout?.execution?.schema === 'thursday-weights-steps-v1';
export const thursdaySchema = { kind: 'weights-steps', weightLabel: 'Actual Weight (kg)', blocks: {} };
export function createThursdayDraft(workout, storage, id, now) {
  const envelope = baseDraft({...workout, phases: []}, storage, id, now);
  const weights = {};
  for (const exercise of weightedExercises(workout)) {
    try { weights[exercise.id] = readWeightPreference(storage, workout, exercise); }
    catch { weights[exercise.id] = ''; }
  }
  return {...envelope, workoutSnapshot: structuredClone(workout), stage: `${workout.phases[0].id}-active`, form: {weights, totalSteps: '', invalid: {}}};
}
export function thursdayFinalResults(record) {
  const workout = record.workoutSnapshot;
  if (record.stage !== `${workout.phases.at(-1).id}-results` || record.activeDurationMs !== workout.durationSeconds * 1000 || !workout.phases.every(p => record.completedBlocks.includes(p.id))) throw new Error('Complete the whole workout before saving.');
  if (Object.values(record.form.invalid).some(Boolean)) throw new Error('Correct the invalid numeric fields before saving.');
  return {
    exerciseWeights: Object.fromEntries(weightedExercises(workout).map(ex => [ex.id, optionalNumber(record.form.weights[ex.id], `${ex.name} actual weight`)])),
    finisher: {exerciseId: workout.phases.at(-1).exerciseIds[0], totalSteps: optionalNumber(record.form.totalSteps, 'Total finisher steps', {integer: true})},
  };
}
