import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mondayParanoidV3 as workout} from '../src/data/monday-paranoid-v3.js';
import {mondayParanoidV2 as v2} from '../src/data/monday-paranoid-v2.js';
import {mondayParanoid as v1} from '../src/data/monday-paranoid.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createDraft,finalResults,blockOffset,resultSchema} from '../src/domain/result-schemas.js';
import {findWorkout,currentWorkouts} from '../src/data/catalog.js';
import {writeWeight,readWeight,readWeightPreference,weightKey} from '../src/storage/weight-preferences.js';
const memory=()=>{const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};};
function completed(storage=memory()) {const record=createDraft(workout,storage,'stable-id','2026-10-25T12:00:00Z');record.stage='finisher-results';record.blockIndex=5;record.completedBlocks=workout.phases.map(p=>p.id);record.activeDurationMs=1270000;return record;}
test('v3 preserves all released programming and adds only two transitions and one 60-second Thruster',()=>{
 assert.equal(workout.durationSeconds,1270);assert.equal(workout.version,3);assert.deepEqual(workout.exercises.slice(0,10),v2.exercises);assert.deepEqual(workout.presentation,v2.presentation);assert.equal(workout.exercises.length,11);assert.equal(workout.exercises.at(-1).name,'KB Thruster');assert.deepEqual(workout.phases.map(p=>[p.format,p.durationSeconds]),[['emom',480],['transition',5],['intervals',360],['transition',5],['emom',360],['amrap-reps',60]]);
 for(const [index,oldIndex]of[[0,0],[2,1],[4,2]])for(const key of ['format','durationSeconds','rounds','timer','exerciseIds'])assert.deepEqual(workout.phases[index][key],v2.phases[oldIndex][key]);
 assert.equal(findWorkout(workout.id,1),v1);assert.equal(findWorkout(workout.id,2),v2);assert.equal(currentWorkouts.find(w=>w.id===workout.id),workout);assert.equal(currentWorkouts.length,11);
 const timeline=compileWorkout(workout);assert.equal(timeline.durationMs,1270000);assert.equal(timeline.segments.filter(s=>s.kind==='TRANSITION').length,2);assert.equal(timeline.segments.filter(s=>s.kind==='REST').length,6);assert.equal(timeline.segments.filter(s=>s.kind==='EMOM').length,14);assert.equal(timeline.segments.at(-1).kind,'AMRAP_REPS');assert.equal(timeline.segments.at(-1).exercise.id,'thruster');assert.equal(timeline.segments.at(-1).startMs,1210000);assert.equal(timeline.segments.at(-2).endMs,1210000);assert.deepEqual([0,1,2,3,4,5,6].map(i=>blockOffset(workout,i)),[0,480000,485000,845000,850000,1210000,1270000]);
 const invalid=structuredClone(workout);invalid.phases[1].exerciseIds=['push-press'];assert.throws(()=>compileWorkout(invalid),/transition/);invalid.phases[1]=structuredClone(workout.phases[1]);invalid.phases.at(-1).exerciseIds.push('push-press');assert.throws(()=>compileWorkout(invalid),/finisher/);
});
test('one engine counts automatic breaks and finisher inside 21:10 and excludes pause/countdown',()=>{
 let now=0;const timer=new WorkoutTimer(workout,()=>now);timer.start();now=2999;assert.equal(timer.snapshot().stage,'countdown');
 for(const [raw,kind,remaining]of[[3000,'EMOM',60000],[483000,'TRANSITION',5000],[487000,'TRANSITION',1000],[488000,'WORK',40000],[848000,'TRANSITION',5000],[853000,'EMOM',60000],[1213000,'AMRAP_REPS',60000]]){now=raw;assert.equal(timer.snapshot().kind,kind);assert.equal(timer.snapshot().remainingMs,remaining);}
 now=1273000;assert.equal(timer.snapshot().stage,'complete');assert.equal(timer.snapshot().elapsedMs,1270000);
 const restored=new WorkoutTimer(workout,()=>now);restored.restorePaused(485000);assert.equal(restored.snapshot().kind,'TRANSITION');assert.equal(restored.snapshot().remainingMs,3000);now+=600000;assert.equal(restored.snapshot().remainingMs,3000);restored.resume();now+=3000;assert.equal(restored.snapshot().kind,'WORK');
});
test('session weights snapshot v2 preferences read-only, preserve zero/clear and independently update v3 preferences',()=>{
 const storage=memory();writeWeight(storage,v2,v2.exercises[0],'16');writeWeight(storage,v2,v2.exercises[1],'0');const record=createDraft(workout,storage,'one');assert.equal(record.form.weights['push-press'],'16');assert.equal(record.form.weights['offset-push-up'],'0');assert.equal(record.form.weights.thruster,'');
 writeWeight(storage,v2,v2.exercises[0],'24');assert.equal(record.form.weights['push-press'],'16');writeWeight(storage,workout,workout.exercises[0],'8');assert.equal(readWeightPreference(storage,workout,workout.exercises[0]),'8');assert.equal(readWeight(storage,v2,v2.exercises[0]),'24');
 writeWeight(storage,workout,workout.exercises[0],'');assert.equal(storage.getItem(weightKey(workout,workout.exercises[0])),'null');assert.equal(readWeightPreference(storage,workout,workout.exercises[0]),'');assert.equal(createDraft(workout,storage,'two').form.weights['push-press'],'');assert.equal(record.form.weights['push-press'],'16');
 storage.setItem(weightKey(v2,v2.exercises[0]),'null');assert.throws(()=>readWeight(storage,v2,v2.exercises[0]));
});
test('simplified results save all eleven weights, one finisher count, optional effort/notes and no duplicated Thruster load',()=>{
 assert.equal(resultSchema(workout).kind,'weights-finisher');assert.deepEqual(resultSchema(workout).blocks,{});
 const record=completed();record.form.weights['push-press']='0';record.form.weights.thruster='12.5';record.form.finisherReps='0';record.form.notes='Measured weights';let result=finalResults(record);assert.equal(Object.keys(result.exerciseWeights).length,11);assert.equal(result.exerciseWeights['push-press'],0);assert.equal(result.exerciseWeights.thruster,12.5);assert.equal(result.exerciseWeights['step-up'],null);assert.deepEqual(result.finisher,{exerciseId:'thruster',reps:0});assert.equal(result.perceivedEffort,null);assert.equal(result.notes,'Measured weights');assert.deepEqual(Object.keys(result),['exerciseWeights','finisher','perceivedEffort','notes']);
 for(const invalid of ['-1','1.5']){record.form.finisherReps=invalid;assert.throws(()=>finalResults(record));}record.form.finisherReps='';assert.equal(finalResults(record).finisher.reps,null);record.form.weights.thruster='-1';assert.throws(()=>finalResults(record));record.form.weights.thruster='';for(const invalid of ['0','11','1.5']){record.form.perceivedEffort=invalid;assert.throws(()=>finalResults(record));}record.form.perceivedEffort='10';assert.equal(finalResults(record).perceivedEffort,10);record.activeDurationMs=1269999;assert.throws(()=>finalResults(record));
});
