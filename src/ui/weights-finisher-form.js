import { el,button,heading } from './components.js';
export function weightsFinisherForm(record,{changed,save}) {
  const workout=record.workoutSnapshot;
  const fields=el('fieldset',{className:'result-fields simple-results'}),message=el('p',{role:'status',className:'result-message'});
  function number(label,key,raw,update,{integer=false,min=0,max}={}){
    const input=el('input',{type:'number',min:String(min),step:integer?'1':'any',inputmode:integer?'numeric':'decimal','aria-label':label});input.value=raw;if(max!==undefined)input.max=String(max);
    if(record.form.invalid[key])input.setCustomValidity('Enter a valid number.');
    input.addEventListener('input',()=>{input.setCustomValidity('');record.form.invalid[key]=input.validity.badInput;update(input.value);changed();});return input;
  }
  fields.append(el('h2',{},'Exercise weights (kg)'),el('p',{className:'muted'},'Edit session weights below. Blank = not entered; 0 is valid.'));
  for(const exercise of workout.exercises)fields.append(el('label',{className:'session-weight-row'},el('span',{},exercise.name),number(`${exercise.name} actual weight (kg)`,`weights.${exercise.id}`,record.form.weights[exercise.id],v=>{record.form.weights[exercise.id]=v;})));
  fields.append(el('h2',{},'Finisher — KB Thruster'),el('label',{},'Total completed repetitions',number('Thruster repetitions','finisherReps',record.form.finisherReps,v=>{record.form.finisherReps=v;},{integer:true})),
    el('label',{},'Perceived effort',number('Perceived effort','perceivedEffort',record.form.perceivedEffort,v=>{record.form.perceivedEffort=v;},{integer:true,min:1,max:10})),el('p',{className:'muted'},'Optional: 1 = very easy · 10 = maximum effort.'));
  const notes=el('textarea',{'aria-label':'Workout notes',rows:'3'});notes.value=record.form.notes;notes.addEventListener('input',()=>{record.form.notes=notes.value;changed();});fields.append(el('label',{},'Workout notes',notes),button('Save Workout',save));
  const form=el('form',{novalidate:''},fields,message);form.addEventListener('submit',e=>e.preventDefault());
  return {root:el('div',{},heading(`${workout.code} · VERSION ${workout.version}`,'Workout Results','Review recorded weights and your final Thruster repetitions, then save.'),form),message,setBusy(value){fields.disabled=value;}};
}
