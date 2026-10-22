import test from 'node:test';
import assert from 'node:assert/strict';
import { hybrid001 } from '../src/data/hybrid-001-strength-sweat.js';
import { hybrid002 } from '../src/data/hybrid-001-v2.js';
import { focus002 } from '../src/data/focus-001-v2.js';
import { createDraft, blockResults, finalResults, blockOffset } from '../src/domain/result-schemas.js';
import { createDraft as oldFocusDraft } from '../src/domain/focus-results.js';
import { currentWorkouts, findWorkout } from '../src/data/catalog.js';
import { weightKey } from '../src/storage/weight-preferences.js';
const empty={getItem:()=>null};
test('Hybrid v2 is current and leaves all nine targets and 8+8+4 timing definitions unchanged',()=>{
 assert.equal(findWorkout(hybrid001.id,1),hybrid001);assert.deepEqual(hybrid002.exercises,hybrid001.exercises);assert.deepEqual(hybrid002.phases,hybrid001.phases);
 assert.equal(currentWorkouts.find(w=>w.id===hybrid001.id).version,2);assert.deepEqual([0,1,2,3].map(i=>blockOffset(hybrid002,i)),[0,480000,960000,1200000]);
 const focus=createDraft(focus002,empty,'focus','2026-01-01T00:00:00Z');assert.deepEqual(focus,oldFocusDraft(focus002,empty,'focus','2026-01-01T00:00:00Z'));
});
test('Hybrid raw fields prefill weights by version but never fabricate measured counts',()=>{
 const ex=hybrid002.exercises[0];const values=new Map([[weightKey(hybrid001,ex),'16']]);
 const draft=createDraft(hybrid002,{getItem:key=>values.get(key)??null},'hybrid');
 assert.equal(draft.form.strength[ex.id].weightKg,'16');assert.equal(draft.form.strength[ex.id].round4,'');assert.equal(draft.form.fullRounds,'');
 values.set(weightKey(hybrid002,ex),'24');assert.equal(draft.form.strength[ex.id].weightKg,'16');
 draft.form.strength[ex.id].weightKg='12.5';assert.equal(values.get(weightKey(hybrid002,ex)),'24');
});
test('four strength rounds, interval limits and AMRAP partial targets preserve blank versus zero',()=>{
 const d=createDraft(hybrid002,empty,'hybrid');
 d.form.strength['goblet-squat'].round1='0';assert.deepEqual(blockResults(hybrid002,d.form,'strength')[0].rounds,[0,null,null,null]);
 d.form.strength['goblet-squat'].round4='1.5';assert.throws(()=>blockResults(hybrid002,d.form,'strength'));d.form.strength['goblet-squat'].round4='8';
 d.form.conditioning.swings.intervalsCompleted='3';assert.throws(()=>blockResults(hybrid002,d.form,'conditioning'));d.form.conditioning.swings.intervalsCompleted='2';
 for(const [id,max]of[['thrusters',6],['wood-choppers',8],['lateral-lunge-curl',6]]){
  d.form['combo-finisher'][id].partialReps=String(max+1);assert.throws(()=>blockResults(hybrid002,d.form,'combo-finisher'));
  d.form['combo-finisher'][id].partialReps=String(max);assert.equal(blockResults(hybrid002,d.form,'combo-finisher').exercises.find(ex=>ex.exerciseId===id).partialReps,max);
  d.form['combo-finisher'][id].partialReps='';
 }
 assert.equal(blockResults(hybrid002,d.form,'combo-finisher').fullRounds,null);
 d.form.fullRounds='0';assert.equal(blockResults(hybrid002,d.form,'combo-finisher').fullRounds,0);
 d.form.fullRounds='-1';assert.throws(()=>blockResults(hybrid002,d.form,'combo-finisher'));d.form.fullRounds='2.5';assert.throws(()=>blockResults(hybrid002,d.form,'combo-finisher'));
});
test('final Hybrid results require all blocks and keep the same historical envelope',()=>{
 const d=createDraft(hybrid002,empty,'hybrid');assert.throws(()=>finalResults(d));d.stage='combo-finisher-results';d.activeDurationMs=1200000;d.completedBlocks=['strength','conditioning','combo-finisher'];
 let result=finalResults(d);assert.deepEqual(result.strength[0].rounds,[null,null,null,null]);assert.equal(result['combo-finisher'].exercises[0].partialReps,null);
 d.form.perceivedEffort='0';assert.throws(()=>finalResults(d));d.form.perceivedEffort='10';result=finalResults(d);assert.equal(result.perceivedEffort,10);
 const before=structuredClone(d.workoutSnapshot);d.form.notes='actual notes';assert.deepEqual(d.workoutSnapshot,before);
});
