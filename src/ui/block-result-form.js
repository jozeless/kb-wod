import { el, button, heading } from './components.js';
import { prescription } from './exercise-prescription.js';
import { resultSchema, partialLabel } from '../domain/result-schemas.js';
export function resultForm(record, blockId, { changed, continueBlock, continueToAbs, save }) {
  const workout=record.workoutSnapshot, schema=resultSchema(workout), phase=workout.phases.find(p=>p.id===blockId);
  const continuous=workout.execution?.mode==='continuous-results';
  const config=schema.blocks[blockId], final=workout.phases.at(-1).id===blockId;
  const fieldset=el('fieldset',{className:'result-fields'}), message=el('p',{role:'status',className:'result-message'});
  const form=el('form',{novalidate:''},fieldset,message);form.addEventListener('submit',event=>event.preventDefault());
  function number(label,value,key,update,max,integer=false){
    const input=el('input',{type:'number',min:key==='perceivedEffort'?'1':'0',step:integer?'1':'any',inputmode:integer?'numeric':'decimal','aria-label':label});
    if(max!==undefined)input.max=max;input.value=value;
    if(record.form.invalid[key])input.setCustomValidity('Enter a valid number.');
    input.addEventListener('input',()=>{input.setCustomValidity('');record.form.invalid[key]=input.validity.badInput;update(input.value);changed();});
    return el('label',{},label,input);
  }
  function rows(id){
    const block=workout.phases.find(p=>p.id===id), fieldsSchema=schema.blocks[id], root=el('div',{});
    if(fieldsSchema.kind==='amrap')root.append(number('Full rounds completed',record.form.fullRounds,`${id}.fullRounds`,v=>{record.form.fullRounds=v;},undefined,true),el('p',{className:'muted'},'Additional partial-round counts are separate from full rounds. Leave unrecorded values blank.'));
    for(const exerciseId of block.exerciseIds){
      const ex=workout.exercises.find(e=>e.id===exerciseId),fields=record.form[id][exerciseId];
      const grid=el('div',{className:`result-grid ${id} ${fieldsSchema.kind} rounds-${fieldsSchema.rounds||0}`},number(schema.weightLabel,fields.weightKg,`${id}.${exerciseId}.weight`,v=>{fields.weightKg=v;}));
      if(fieldsSchema.kind==='rounds')for(let i=1;i<=fieldsSchema.rounds;i++)grid.append(number(`Round ${i}`,fields[`round${i}`],`${id}.${exerciseId}.round${i}`,v=>{fields[`round${i}`]=v;},undefined,true));
      else if(fieldsSchema.kind==='intervals')grid.append(number('Intervals completed',fields.intervalsCompleted,`${id}.${exerciseId}.intervals`,v=>{fields.intervalsCompleted=v;},fieldsSchema.max,true));
      else grid.append(number(partialLabel(ex),fields.partialReps,`${id}.${exerciseId}.partialReps`,v=>{fields.partialReps=v;},ex.target.max,true));
      const unilateral=ex.target?.unit.includes('per arm')?'arm':ex.target?.unit.includes('per side')?'side':ex.target?.unit.includes('per leg')?'leg':null;
      root.append(el('section',{className:'result-exercise','aria-label':`${ex.name} results`},el('h3',{},ex.name),el('p',{className:'muted'},prescription(ex,block)),unilateral&&fieldsSchema.kind==='rounds'?el('p',{className:'muted'},`Rounds record the count per ${unilateral} when both sides match. Note differences below.`):null,grid));
    }
    return root;
  }
  fieldset.append(el('p',{},'Blank means not entered. Enter 0 only when that is your actual result. Session loads do not update training preferences.'),...(continuous ? workout.phases.flatMap(p=>[el('h2',{},schema.blocks[p.id].title),rows(p.id)]) : [rows(blockId)]));
  if(final){
    fieldset.append(number('Perceived effort',record.form.perceivedEffort,'perceivedEffort',v=>{record.form.perceivedEffort=v;},10,true));
    for(const previous of continuous ? [] : workout.phases.slice(0,-1))fieldset.append(el('details',{},el('summary',{},`Review ${schema.blocks[previous.id].title}`),rows(previous.id)));
  }
  const notes=el('textarea',{'aria-label':'Workout notes',rows:'3'});notes.value=record.form.notes;notes.addEventListener('input',()=>{record.form.notes=notes.value;changed();});
  fieldset.append(el('label',{},'Workout notes',notes),button(final?'Save Workout':config.continueLabel,final?save:continueBlock||continueToAbs));
  return {root:el('div',{},heading(`${workout.code} · VERSION ${workout.version}`,continuous?'Workout Results':config.title,final?'All blocks are complete. Review your actual results and save explicitly.':`${phase.name} is complete. Training is stopped until you continue.`),form),message,setBusy(value){fieldset.disabled=value;}};
}
