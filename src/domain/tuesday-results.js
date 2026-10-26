import { createDraft as baseDraft, optionalNumber } from './focus-results.js';
import { readWeightPreference } from '../storage/weight-preferences.js';
export const isTuesdayResults = workout => workout?.execution?.schema === 'tuesday-weights-rounds-v1';
export const tuesdaySchema = { kind: 'weights-rounds', weightLabel: 'Actual Weight (kg)', blocks: {} };
export const weightedExercises = workout => workout.exercises.filter(ex => ex.equipment !== 'bodyweight');
export function createTuesdayDraft(workout, storage, id, now) {
  const record = baseDraft({...workout, phases: []}, storage, id, now);
  const weights = {};
  for (const exercise of weightedExercises(workout)) {
    try { weights[exercise.id] = readWeightPreference(storage, workout, exercise); }
    catch { weights[exercise.id] = ''; }
  }
  return {...record, workoutSnapshot: structuredClone(workout), stage: `${workout.phases[0].id}-active`, form: {weights, fullRounds: '', invalid: {}}};
}
export function tuesdayFinalResults(record) {
  const workout = record.workoutSnapshot;
  if (record.stage !== `${workout.phases.at(-1).id}-results` || record.activeDurationMs !== workout.durationSeconds * 1000 || !workout.phases.every(p => record.completedBlocks.includes(p.id))) throw new Error('Complete the whole workout before saving.');
  if (Object.values(record.form.invalid).some(Boolean)) throw new Error('Correct the invalid numeric fields before saving.');
  return {
    exerciseWeights: Object.fromEntries(weightedExercises(workout).map(ex => [ex.id, optionalNumber(record.form.weights[ex.id], `${ex.name} actual weight`)])),
    finisher: {phaseId: workout.phases.at(-1).id, fullRounds: optionalNumber(record.form.fullRounds, 'Complete finisher rounds', {integer: true})},
  };
}
