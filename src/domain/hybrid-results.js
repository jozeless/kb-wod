import { optionalNumber } from './focus-results.js';
// Hybrid-specific schemas and validation; storage remains shared.
export const hybridSchema = {
  weightLabel: 'Actual Weight (kg)',
  blocks: {
    strength: { kind: 'rounds', rounds: 4, title: 'Strength Results', continueLabel: 'Continue to Conditioning' },
    conditioning: { kind: 'intervals', max: 2, title: 'Conditioning Results', continueLabel: 'Continue to Finisher' },
    'combo-finisher': { kind: 'amrap', title: 'Finisher Results' },
  },
};
export function hybridBlockResults(workout, form, blockId, schemas = hybridSchema) {
  const schema = schemas.blocks[blockId];
  if (Object.entries(form.invalid || {}).some(([key,value])=>key.startsWith(`${blockId}.`)&&value)) throw new Error('Correct the invalid numeric fields before continuing.');
  const exercises = workout.phases.find(p=>p.id===blockId).exerciseIds.map(exerciseId=>{
    const exercise=workout.exercises.find(ex=>ex.id===exerciseId), fields=form[blockId][exerciseId];
    const result={exerciseId,weightKg:optionalNumber(fields.weightKg,`${exercise.name} actual weight`)};
    if(schema.kind==='rounds') result.rounds=Array.from({length:schema.rounds},(_,i)=>optionalNumber(fields[`round${i+1}`],`${exercise.name} Round ${i+1}`,{integer:true}));
    else if(schema.kind==='intervals') result.intervalsCompleted=optionalNumber(fields.intervalsCompleted,`${exercise.name} intervals`,{integer:true,max:schema.max});
    else result.partialReps=optionalNumber(fields.partialReps,`${exercise.name} additional partial repetitions`,{integer:true,max:exercise.target.max});
    return result;
  });
  return schema.kind==='amrap'?{fullRounds:optionalNumber(form.fullRounds,'Full rounds completed',{integer:true}),exercises}:exercises;
}
export function hybridFinalResults(record) {
  const workout=record.workoutSnapshot;
  if(record.stage!=='combo-finisher-results'||record.activeDurationMs!==workout.durationSeconds*1000||!workout.phases.every(p=>record.completedBlocks.includes(p.id)))throw new Error('Complete all three blocks before saving.');
  if(record.form.invalid?.perceivedEffort)throw new Error('Correct perceived effort before saving.');
  return {...Object.fromEntries(workout.phases.map(p=>[p.id,hybridBlockResults(workout,record.form,p.id)])),
    perceivedEffort:optionalNumber(record.form.perceivedEffort,'Perceived effort',{integer:true,min:1,max:10}),notes:record.form.notes};
}
