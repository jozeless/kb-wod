import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {libraryWorkouts,workouts,findWorkout} from '../src/data/catalog.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createCueTracker} from '../src/domain/workout-cues.js';
import {createDraft,finalResults,resultSchema,supportsResults} from '../src/domain/result-schemas.js';
import {analyzeProgress} from '../src/domain/progress-analytics.js';
import {writeWeight,weightKey} from '../src/storage/weight-preferences.js';
const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/oldschool-programs.json',import.meta.url)));
for(const [animal,blocks]of Object.entries(approved)){
 const w=findWorkout(`oldschool-${animal}`,1);
 test(`${w.name}: exact approved programming, 20 slots, 45/15 boundaries, audio and full final rest`,()=>{
  assert.equal(w.version,1);assert.equal(w.durationSeconds,1200);assert.equal(w.demo,false);assert.equal(w.audioProfile,'clear-loud-v1');assert.equal(w.suggestedDay,undefined);assert.ok(supportsResults(w));
  assert.deepEqual(w.phases.map(p=>p.name),['Upper','ABS','Legs','Muscle Finisher']);
  assert.deepEqual(w.phases.map(p=>p.exerciseIds.map(id=>w.exercises.find(e=>e.id===id).name)),blocks);
  assert.equal(new Set(w.exercises.map(e=>e.id)).size,w.exercises.length);
  assert.equal(w.exercises.filter(e=>e.equipment==='bodyweight').length,3);
  for(const ex of w.exercises){assert.equal(ex.equipment,ex.name.startsWith('KB ')?'kettlebell':'bodyweight');assert.equal(ex.target,undefined);}
  for(const p of w.phases){assert.equal(p.durationSeconds,300);assert.equal(p.rounds,1);assert.equal(p.format,'intervals');assert.deepEqual(p.timer,{workSeconds:45,restSeconds:15,intervals:5});assert.equal(p.exerciseIds.length,5);}
  if(animal!=='eagle')assert.deepEqual(w.phases[3].exerciseIds.slice(0,3),[...w.phases[0].exerciseIds.slice(0,2),w.phases[2].exerciseIds[0]]);
  const timeline=compileWorkout(w);assert.equal(timeline.durationMs,1200000);assert.equal(timeline.segments.length,40);
  const order=w.phases.flatMap(p=>p.exerciseIds);
  for(let slot=0;slot<20;slot++){
   const [work,rest]=timeline.segments.slice(slot*2,slot*2+2);assert.equal(work.kind,'WORK');assert.equal(rest.kind,'REST');assert.equal(work.exercise.id,order[slot]);assert.equal(rest.exercise.id,order[slot]);assert.equal(work.startMs,slot*60000);assert.equal(work.endMs,slot*60000+45000);assert.equal(rest.endMs,(slot+1)*60000);
  }
  let now=0;const timer=new WorkoutTimer(w,()=>now),cues=createCueTracker();timer.start();cues.next(timer.snapshot(),false);const heard=[];
  for(now=100;now<=1203000;now+=100){const cue=cues.next(timer.snapshot());if(cue)heard.push(cue);}
  assert.deepEqual(heard,['start',...Array.from({length:19},()=>['rest','work']).flat(),'rest','complete']);
  assert.equal(timer.snapshot().stage,'complete');
 });
 test(`${w.name}: optional unique kettlebell weights only, guarded completion and compatible Progress`,()=>{
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const ex=w.exercises[0];writeWeight(storage,w,ex,'12.5');const record=createDraft(w,storage,`${animal}-session`,'2026-11-06T10:00:00Z');
  assert.equal(resultSchema(w).kind,'weights-only');assert.deepEqual(Object.keys(record.form),['weights','invalid']);assert.equal(record.form.weights[ex.id],'12.5');assert.throws(()=>finalResults(record),/whole workout/);
  record.stage='muscle-finisher-results';record.completedBlocks=w.phases.map(p=>p.id);record.activeDurationMs=1200000;record.completedAt='2026-11-06T10:20:03Z';
  record.form.weights[ex.id]='0';let results=finalResults(record);assert.deepEqual(Object.keys(results),['exerciseWeights']);assert.equal(results.exerciseWeights[ex.id],0);assert.ok(Object.values(results.exerciseWeights).includes(null));assert.equal(Object.keys(results.exerciseWeights).length,w.exercises.length-3);
  record.form.weights[ex.id]='-1';assert.throws(()=>finalResults(record));record.form.weights[ex.id]='13.25';record.form.invalid[`weights.${ex.id}`]=true;assert.throws(()=>finalResults(record),/invalid/);record.form.invalid={};results=finalResults(record);
  assert.equal(storage.getItem(weightKey(w,ex)),'12.5');
  const analysis=analyzeProgress([{...record,status:'completed',results}],{year:2026,month:11},()=>true);assert.equal(analysis.month.workouts,1);assert.equal(analysis.month.activeDurationMs,1200000);assert.equal(analysis.strength.length,1);assert.equal(analysis.strength[0].points.length,1);assert.equal(analysis.strength[0].current,13.25);assert.deepEqual(analysis.performance,[]);
 });
}
test('seven public cards append three immutable identities and keep all 19 original versions; protected main logic remains exact',()=>{
 assert.equal(libraryWorkouts.length,7);assert.deepEqual(libraryWorkouts.slice(4).map(w=>w.id),['oldschool-sailor','oldschool-tiger','oldschool-eagle']);assert.equal(workouts.length,22);
 const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/oldschool-main-protected.json',import.meta.url)));
 for(const [file,sha]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),sha,file);
});
