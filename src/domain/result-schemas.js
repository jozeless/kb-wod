import { isThursdayResults, thursdaySchema, createThursdayDraft, thursdayFinalResults } from './thursday-results.js';
import { isTuesdayResults, tuesdaySchema, createTuesdayDraft, tuesdayFinalResults } from './tuesday-results.js';
import { usesSessionWeights, weightsFinisherSchema, createWeightDraft, weightFinalResults } from './weights-finisher-results.js';
import { continuousSchema, continuousFinalResults } from './continuous-results.js';
import { createDraft as focusDraft, blockResults as focusBlockResults, finalResults as focusFinalResults, preferredWeight } from './focus-results.js';
import { hybridSchema, hybridBlockResults, hybridFinalResults } from './hybrid-results.js';
const focusSchema={weightLabel:'Weight (kg)',blocks:{upper:{kind:'rounds',rounds:2,title:'Upper Results',continueLabel:'Continue to ABS'},abs:{kind:'intervals',max:2,title:'ABS Results'}}};
export function supportsResults(workout){return workout?.execution?.mode==='continuous-results'||workout?.execution?.mode==='two-block-results'||workout?.execution?.schema==='hybrid-001-v2';}
export function resultSchema(workout){return isThursdayResults(workout)?thursdaySchema:isTuesdayResults(workout)?tuesdaySchema:usesSessionWeights(workout)?weightsFinisherSchema:workout.execution?.mode==='continuous-results'?continuousSchema(workout):workout.execution?.schema==='hybrid-001-v2'?hybridSchema:focusSchema;}
export function blockOffset(workout,index){return workout.phases.slice(0,index).reduce((sum,phase)=>sum+phase.durationSeconds*1000,0);}
export function partialLabel(exercise){return exercise.target?.unit.includes('combinations')?'Additional partial combinations':'Additional partial reps';}
export function createDraft(workout,storage,id,now){
  if(isThursdayResults(workout))return createThursdayDraft(workout,storage,id,now);
  if(isTuesdayResults(workout))return createTuesdayDraft(workout,storage,id,now);
  if(usesSessionWeights(workout))return createWeightDraft(workout,storage,id,now);
  if(workout.execution?.mode!=='continuous-results'&&workout.execution?.schema!=='hybrid-001-v2')return focusDraft(workout,storage,id,now);
  // Preserve the existing session envelope, replacing only workout-specific raw fields.
  const envelope=focusDraft({...workout,phases:[]},storage,id,now);
  const form={perceivedEffort:'',notes:'',invalid:{},fullRounds:''};
  for(const phase of workout.phases){
    const config=resultSchema(workout).blocks[phase.id];form[phase.id]={};
    for(const exerciseId of phase.exerciseIds){
      const exercise=workout.exercises.find(ex=>ex.id===exerciseId);let weightKg='';
      try{weightKg=preferredWeight(storage,workout,exercise);}catch{/* Keep unspecified. */}
      const fields={weightKg};
      if(config.kind==='rounds')for(let i=1;i<=config.rounds;i++)fields[`round${i}`]='';
      else if(config.kind==='intervals')fields.intervalsCompleted='';
      else fields.partialReps='';
      form[phase.id][exerciseId]=fields;
    }
  }
  return {...envelope,workoutSnapshot:structuredClone(workout),stage:`${workout.phases[0].id}-active`,form};
}
export const blockResults=(workout,form,id)=>workout.execution?.mode==='continuous-results'?hybridBlockResults(workout,form,id,continuousSchema(workout)):workout.execution?.schema==='hybrid-001-v2'?hybridBlockResults(workout,form,id):focusBlockResults(workout,form,id);
export const finalResults=record=>isThursdayResults(record.workoutSnapshot)?thursdayFinalResults(record):isTuesdayResults(record.workoutSnapshot)?tuesdayFinalResults(record):usesSessionWeights(record.workoutSnapshot)?weightFinalResults(record):record.workoutSnapshot.execution?.mode==='continuous-results'?continuousFinalResults(record):record.workoutSnapshot.execution?.schema==='hybrid-001-v2'?hybridFinalResults(record):focusFinalResults(record);
