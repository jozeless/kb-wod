import { createDraft as baseDraft, optionalNumber } from './focus-results.js';
import { readWeightPreference } from '../storage/weight-preferences.js';
export const weightsFinisherSchema = { kind: 'weights-finisher', weightLabel: 'Actual Weight (kg)', blocks: {} };
export const usesSessionWeights = workout => workout?.execution?.schema === 'weights-finisher-v1';
export function createWeightDraft(workout,storage,id,now) {
  const record=baseDraft({...workout,phases:[]},storage,id,now);
  const weights={};
  for(const exercise of workout.exercises){
    try { weights[exercise.id]=readWeightPreference(storage,workout,exercise); }
    catch { weights[exercise.id]=''; }
  }
  return {...record,workoutSnapshot:structuredClone(workout),stage:`${workout.phases[0].id}-active`,form:{weights,finisherReps:'',perceivedEffort:'',notes:'',invalid:{}}};
}
export function weightFinalResults(record) {
  const workout=record.workoutSnapshot;
  if(record.stage!==`${workout.phases.at(-1).id}-results` || record.activeDurationMs!==workout.durationSeconds*1000 || !workout.phases.every(p=>record.completedBlocks.includes(p.id)))throw new Error('Complete the whole workout before saving.');
  if(Object.values(record.form.invalid).some(Boolean))throw new Error('Correct the invalid numeric fields before saving.');
  return {
    exerciseWeights:Object.fromEntries(workout.exercises.map(ex=>[ex.id,optionalNumber(record.form.weights[ex.id],`${ex.name} actual weight`)])),
    finisher:{exerciseId:workout.phases.at(-1).exerciseIds[0],reps:optionalNumber(record.form.finisherReps,'Thruster repetitions',{integer:true})},
    perceivedEffort:optionalNumber(record.form.perceivedEffort,'Perceived effort',{integer:true,min:1,max:10}),notes:record.form.notes,
  };
}
