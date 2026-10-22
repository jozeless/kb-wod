import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focus002LowerAbs as focus} from '../src/data/focus-002-lower-abs.js';
import {hybrid002FullBodyEngine as hybrid} from '../src/data/hybrid-002-full-body-engine.js';
import {currentWorkouts,findWorkout} from '../src/data/catalog.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createDraft,finalResults} from '../src/domain/result-schemas.js';
const storage={getItem:()=>null};
for(const workout of [focus,hybrid]) {
 test(`${workout.code}: distinct identity, continuous timing and all ordered targets`,()=>{
  assert.equal(workout.version,1);assert.equal(findWorkout(workout.id,1),workout);assert.ok(currentWorkouts.includes(workout));
  assert.equal(workout.execution.mode,'continuous-results');
  const timeline=compileWorkout(workout);assert.equal(timeline.durationMs,1200000);
  assert.deepEqual(workout.phases.map(p=>p.durationSeconds),workout===focus?[600,600]:[480,480,240]);
  const expected=workout===focus?[['KB Goblet Squat',8,10],['KB Romanian Deadlift (bilateral)',8,10],['KB Reverse Lunges',5,5],['KB Glute Bridge',10,12],['KB Standing Calf Raises',12,15],['KB Suitcase March',40,40],['KB Plank Drag',40,40],['KB Standing Wood Chop',40,40],['KB Reverse Crunch + Hold',40,40],['KB Figure-8 Pass',40,40]]:[['KB Floor Press',6,6],['KB Sumo Deadlift',8,10],['KB Swing',40,40],['KB Front Rack March',40,40],['KB Chest-Level Crossover',40,40],['KB Lateral Lunges',40,40],['KB Cleans',6,6],['Push-Ups',6,6],['KB Goblet Squats',8,8]];
  assert.deepEqual(workout.phases.flatMap(p=>p.exerciseIds),workout.exercises.map(e=>e.id));assert.deepEqual(workout.exercises.map(e=>[e.name,e.target.min,e.target.max]),expected);
  assert.match(workout.exercises.find(e=>e.id==='reverse-lunges'||e.id==='floor-press').target.unit,/per (leg|side)/);
  const emom=timeline.segments.filter(s=>s.kind==='EMOM');assert.equal(emom.length,workout===focus?10:8);assert.ok(emom.every(s=>s.endMs-s.startMs===60000));
  for(let i=0;i<emom.length;i++){assert.equal(emom[i].exercise.id,workout.phases[0].exerciseIds[i%workout.phases[0].exerciseIds.length]);assert.equal(emom[i].round,Math.floor(i/workout.phases[0].exerciseIds.length)+1);}
  assert.equal(timeline.segments.filter(s=>s.kind==='REST').length,workout===focus?10:8);
  assert.ok(timeline.segments.filter(s=>s.kind==='WORK').every(s=>s.endMs-s.startMs===40000));assert.ok(timeline.segments.filter(s=>s.kind==='REST').every(s=>s.endMs-s.startMs===20000));
  if(workout===hybrid){const segment=timeline.segments.at(-1);assert.equal(segment.kind,'AMRAP');assert.equal(segment.endMs-segment.startMs,240000);assert.deepEqual(segment.circuit.map(e=>e.target.max),[6,6,8]);}
  let now=0;const timer=new WorkoutTimer(workout,()=>now);timer.start();for(const phase of workout.phases){now+=phase.durationSeconds*1000; if(now===1200000)now+=3000;const s=timer.snapshot();assert.equal(s.status,now===1203000?'complete':'running');}
 });
 test(`${workout.code}: results validate all blocks, null/zero and read-only preference isolation`,()=>{
  let writes=0;const draft=createDraft(workout,{getItem:key=>key.includes(`:${workout.id}:`)&&key.endsWith(`:${workout.exercises[0].id}`)?'12.5':null,setItem(){writes++;}},'test','now');
  assert.equal(draft.form[workout.phases[0].id][workout.exercises[0].id].weightKg,'12.5');assert.equal(writes,0);assert.throws(()=>finalResults(draft));
  draft.stage=`${workout.phases.at(-1).id}-results`;draft.completedBlocks=workout.phases.map(p=>p.id);draft.activeDurationMs=1200000;
  const fields=draft.form[workout.phases[0].id][workout.exercises[0].id];fields.round1='0';let results=finalResults(draft);assert.equal(results[workout.phases[0].id][0].rounds[0],0);assert.equal(results[workout.phases[0].id][0].rounds[1],null);assert.equal(results.perceivedEffort,null);
  fields.round1='1.5';assert.throws(()=>finalResults(draft));fields.round1='2';fields.weightKg='-1';assert.throws(()=>finalResults(draft));fields.weightKg='0';
  const intervals=draft.form[workout.phases[1].id][workout.phases[1].exerciseIds[0]];intervals.intervalsCompleted='3';assert.throws(()=>finalResults(draft));intervals.intervalsCompleted='2';
  if(workout===hybrid){for(const ex of workout.exercises.slice(6)){const field=draft.form['combo-finisher'][ex.id];field.partialReps=String(ex.target.max+1);assert.throws(()=>finalResults(draft));field.partialReps=String(ex.target.max);}draft.form.fullRounds='0';assert.equal(finalResults(draft)['combo-finisher'].fullRounds,0);}
  draft.form.perceivedEffort='0';assert.throws(()=>finalResults(draft));draft.form.perceivedEffort='10';assert.equal(finalResults(draft).perceivedEffort,10);
  draft.workoutSnapshot.exercises[0].name='Snapshot only';assert.notEqual(workout.exercises[0].name,'Snapshot only');
 });
}
test('existing 001 versions remain current and independently addressable',()=>{for(const id of ['focus-001-upper-abs','hybrid-001-strength-sweat']){assert.equal(currentWorkouts.find(w=>w.id===id).version,2);assert.equal(findWorkout(id,1).version,1);}});
