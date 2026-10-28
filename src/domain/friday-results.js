import { createTuesdayDraft, weightedExercises } from './tuesday-results.js';
import { optionalNumber } from './focus-results.js';
export const isFridayResults = workout => workout?.execution?.schema === 'friday-weights-floorpress-rounds-v1';
export const fridaySchema = { kind: 'weights-floorpress-rounds', weightLabel: 'Actual Weight (kg)', blocks: {} };
export function createFridayDraft(workout, storage, id, now) {
  const record = createTuesdayDraft(workout, storage, id, now);
  return {...record, form: {...record.form, leftReps: '', rightReps: ''}};
}
export function fridayFinalResults(record) {
  const workout = record.workoutSnapshot;
  if (record.stage !== `${workout.phases.at(-1).id}-results` || record.activeDurationMs !== workout.durationSeconds * 1000 || !workout.phases.every(p => record.completedBlocks.includes(p.id))) throw new Error('Complete the whole workout before saving.');
  if (Object.values(record.form.invalid).some(Boolean)) throw new Error('Correct the invalid numeric fields before saving.');
  return {
    exerciseWeights: Object.fromEntries(weightedExercises(workout).map(ex => [ex.id, optionalNumber(record.form.weights[ex.id], `${ex.name} actual weight`)])),
    keyExercise: {
      exerciseId: 'alternating-floor-press', referenceSet: 'final',
      leftReps: optionalNumber(record.form.leftReps, 'Floor Press left arm repetitions', {integer: true}),
      rightReps: optionalNumber(record.form.rightReps, 'Floor Press right arm repetitions', {integer: true}),
    },
    finisher: {phaseId: workout.phases.at(-1).id, fullRounds: optionalNumber(record.form.fullRounds, 'Complete finisher rounds', {integer: true})},
  };
}
