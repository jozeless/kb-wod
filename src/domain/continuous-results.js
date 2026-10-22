import { hybridBlockResults } from './hybrid-results.js';
import { optionalNumber } from './focus-results.js';
// Result fields follow each continuous workout's immutable phase definitions.
export function continuousSchema(workout) {
  return {weightLabel:'Actual Weight (kg)',blocks:Object.fromEntries(workout.phases.map(phase=>[phase.id,{
    kind:phase.format==='emom'?'rounds':phase.format==='intervals'?'intervals':'amrap',
    rounds:phase.rounds,max:phase.rounds,title:`${phase.name} Results`,
  }]))};
}
export function continuousFinalResults(record) {
  const workout=record.workoutSnapshot;
  if(record.stage!==`${workout.phases.at(-1).id}-results`||record.activeDurationMs!==workout.durationSeconds*1000||!workout.phases.every(p=>record.completedBlocks.includes(p.id)))throw new Error('Complete all 20 active minutes before saving.');
  if(record.form.invalid?.perceivedEffort)throw new Error('Correct perceived effort before saving.');
  return {...Object.fromEntries(workout.phases.map(p=>[p.id,hybridBlockResults(workout,record.form,p.id,continuousSchema(workout))])),
    perceivedEffort:optionalNumber(record.form.perceivedEffort,'Perceived effort',{integer:true,min:1,max:10}),notes:record.form.notes};
}
