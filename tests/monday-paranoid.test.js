import {mondayParanoidV3} from '../src/data/monday-paranoid-v3.js';
import {mondayParanoidV2} from '../src/data/monday-paranoid-v2.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mondayParanoid as monday} from '../src/data/monday-paranoid.js';
import {hybrid002} from '../src/data/hybrid-001-v2.js';
import {currentWorkouts,findWorkout} from '../src/data/catalog.js';
import {filterWorkouts,assignWorkout} from '../src/domain/planning.js';
import {compileWorkout} from '../src/domain/workout-timer.js';
import {supportsResults,createDraft,blockResults,finalResults} from '../src/domain/result-schemas.js';
import {writeWeight,weightKey} from '../src/storage/weight-preferences.js';
test('Monday Paranoid is a separate identity with the approved Hybrid movements, timings and results schema',()=>{
 assert.equal(monday.id,'monday-paranoid');assert.equal(monday.code,'KB Monday Paranoid');assert.equal(monday.name,'Monday Paranoid');assert.equal(monday.type,'hybrid');assert.equal(monday.version,1);assert.equal(monday.suggestedDay,'Monday');assert.equal(monday.durationSeconds,1200);assert.equal(monday.demo,false);assert.equal(monday.presentation.cardStyle,'hm-kb');
 assert.deepEqual(monday.exercises,hybrid002.exercises);assert.deepEqual(monday.phases,hybrid002.phases);assert.deepEqual(monday.resultFields,hybrid002.resultFields);assert.deepEqual(monday.execution,hybrid002.execution);assert.notEqual(monday.exercises,hybrid002.exercises);assert.notEqual(monday.phases,hybrid002.phases);assert.ok(supportsResults(monday));
 const timeline=compileWorkout(monday);assert.equal(timeline.durationMs,1200000);assert.equal(timeline.segments.filter(s=>s.kind==='EMOM').length,8);assert.equal(timeline.segments.filter(s=>s.kind==='WORK').length,8);assert.equal(timeline.segments.filter(s=>s.kind==='REST').length,8);assert.equal(timeline.segments.at(-1).kind,'AMRAP');assert.equal(timeline.segments.at(-1).endMs-timeline.segments.at(-1).startMs,240000);assert.deepEqual(timeline.segments.at(-1).circuit.map(ex=>ex.target.max),[6,8,6]);
 assert.deepEqual(monday.exercises.map(ex=>ex.id),['goblet-squat','push-up-renegade-row','swings','alternating-clean','reverse-lunges','atw-front-raise','thrusters','wood-choppers','lateral-lunge-curl']);
});
test('Library and manual weekly assignment preserve every existing identity and reference',()=>{
 assert.equal(findWorkout('monday-paranoid',1),monday);assert.equal(currentWorkouts.length,8);assert.deepEqual(filterWorkouts(currentWorkouts,'PARANOID','hybrid'),[mondayParanoidV3]);assert.deepEqual(filterWorkouts(currentWorkouts,'paranoid','focus'),[]);
 for(const id of ['focus-001-upper-abs','hybrid-001-strength-sweat'])for(const version of [1,2])assert.equal(findWorkout(id,version).version,version);
 for(const id of ['hybrid-001-strength-sweat','hybrid-002-full-body-engine'])assert.ok(currentWorkouts.some(w=>w.id===id));
 const plan={Monday:{workoutId:hybrid002.id,version:2},Tuesday:{workoutId:'focus-001-upper-abs',version:1}};const updated=assignWorkout(plan,'Sunday',monday);assert.deepEqual(updated.Monday,plan.Monday);assert.deepEqual(updated.Tuesday,plan.Tuesday);assert.deepEqual(updated.Sunday,{workoutId:'monday-paranoid',version:1});assert.equal(plan.Sunday,undefined);
});
test('new results and weight preferences stay independent, keep null/zero and validate all Hybrid fields',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const exercise=monday.exercises[0];writeWeight(storage,hybrid002,exercise,'24');
 let draft=createDraft(monday,storage,'monday-session');assert.equal(draft.form.strength[exercise.id].weightKg,'');writeWeight(storage,monday,exercise,'12.5');draft=createDraft(monday,storage,'monday-session');assert.equal(draft.form.strength[exercise.id].weightKg,'12.5');assert.equal(map.get(weightKey(hybrid002,exercise)),'24');
 assert.throws(()=>finalResults(draft));draft.stage='combo-finisher-results';draft.completedBlocks=monday.phases.map(p=>p.id);draft.blockIndex=2;draft.activeDurationMs=1200000;
 draft.form.strength[exercise.id].round1='0';draft.form.strength[exercise.id].round4='8';draft.form.conditioning.swings.intervalsCompleted='2';draft.form.fullRounds='0';draft.form['combo-finisher'].thrusters.partialReps='6';draft.form['combo-finisher']['wood-choppers'].partialReps='8';draft.form['combo-finisher']['lateral-lunge-curl'].partialReps='6';draft.form.perceivedEffort='8';draft.form.notes='Measured results';
 const result=finalResults(draft);assert.deepEqual(result.strength[0].rounds,[0,null,null,8]);assert.equal(result.strength[0].weightKg,12.5);assert.equal(result.conditioning[0].intervalsCompleted,2);assert.equal(result['combo-finisher'].fullRounds,0);assert.equal(result.perceivedEffort,8);assert.equal(result.notes,'Measured results');
 draft.form.conditioning.swings.intervalsCompleted='3';assert.throws(()=>blockResults(monday,draft.form,'conditioning'));draft.form.conditioning.swings.intervalsCompleted='2';draft.form['combo-finisher'].thrusters.partialReps='7';assert.throws(()=>finalResults(draft));draft.workoutSnapshot.exercises[0].name='Snapshot edit';assert.equal(monday.exercises[0].name,'KB Goblet Squat');assert.equal(hybrid002.exercises[0].name,'KB Goblet Squat');
});
