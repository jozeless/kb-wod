import test from 'node:test';
import assert from 'node:assert/strict';
import { focus001 } from '../src/data/focus-001-upper-abs.js';
import { focus002 } from '../src/data/focus-001-v2.js';
import { currentWorkouts, findWorkout } from '../src/data/catalog.js';
import { createDraft, optionalNumber, blockResults, finalResults } from '../src/domain/focus-results.js';
import { WorkoutTimer } from '../src/domain/workout-timer.js';
import { weightKey } from '../src/storage/weight-preferences.js';
const empty={getItem:()=>null};
test('Focus v2 is current, v1 remains immutable and both blocks are ten 40/20 intervals',()=>{
 assert.equal(findWorkout(focus001.id,1),focus001);assert.equal(focus001.phases[0].format,'emom');
 assert.equal(currentWorkouts.filter(w=>w.id===focus001.id).length,1);assert.equal(currentWorkouts.find(w=>w.id===focus001.id).version,2);
 assert.deepEqual(focus002.exercises,focus001.exercises);
 for(const phase of focus002.phases){assert.equal(phase.format,'intervals');assert.deepEqual(phase.timer,{workSeconds:40,restSeconds:20,intervals:10});assert.equal(phase.durationSeconds,600);assert.equal(phase.exerciseIds.length,5);}
});
test('optional results distinguish blank/zero and enforce weight, reps, interval and effort limits',()=>{
 assert.equal(optionalNumber('','weight'),null);assert.equal(optionalNumber('0','weight'),0);assert.equal(optionalNumber('12.5','weight'),12.5);
 for(const raw of ['-1','abc','Infinity'])assert.throws(()=>optionalNumber(raw,'weight'));
 assert.throws(()=>optionalNumber('1.5','reps',{integer:true}));assert.throws(()=>optionalNumber('3','intervals',{integer:true,max:2}));
 assert.throws(()=>optionalNumber('0','effort',{min:1,max:10}));
 const draft=createDraft(focus002,empty,'example','2026-01-01T00:00:00Z');draft.form.upper['floor-press'].round1='0';
 assert.deepEqual(blockResults(focus002,draft.form,'upper')[0],{exerciseId:'floor-press',weightKg:null,rounds:[0,null]});
 assert.throws(()=>finalResults(draft));
 draft.stage='abs-results';draft.completedBlocks=['upper','abs'];draft.activeDurationMs=1200000;
 const result=finalResults(draft);assert.equal(result.perceivedEffort,null);assert.equal(result.abs[0].intervalsCompleted,null);
});
test('draft prefills are read-only snapshots, version-2 preference wins over version-1 fallback',()=>{
 const ex=focus002.exercises[0];const map=new Map([[weightKey(focus001,ex),'8']]);
 const storage={getItem:key=>map.get(key)??null};const a=createDraft(focus002,storage,'one');assert.equal(a.form.upper[ex.id].weightKg,'8');
 map.set(weightKey(focus002,ex),'12.5');const b=createDraft(focus002,storage,'two');assert.equal(b.form.upper[ex.id].weightKg,'12.5');
 b.form.upper[ex.id].weightKg='0';assert.equal(map.get(weightKey(focus002,ex)),'12.5');
 b.workoutSnapshot.exercises[0].name='session snapshot';assert.equal(focus002.exercises[0].name,'KB Floor Press');
});
test('paused checkpoint restoration excludes time away, including an interrupted countdown',()=>{
 let now=0;const block={...focus002,phases:[focus002.phases[0]],durationSeconds:600};
 const original=new WorkoutTimer(block,()=>now);original.start();now=43000;const checkpoint=original.elapsed();
 const restored=new WorkoutTimer(block,()=>now);restored.restorePaused(checkpoint);now=100000;
 assert.equal(restored.snapshot().kind,'REST');assert.equal(restored.snapshot().remainingMs,20000);restored.resume();now+=20000;assert.equal(restored.snapshot().kind,'WORK');assert.equal(restored.snapshot().interval,1);
 const lead=new WorkoutTimer(block,()=>now);lead.restorePaused(1000);assert.equal(lead.snapshot().countdown,2);
 assert.throws(()=>lead.restorePaused(-1));assert.throws(()=>lead.restorePaused(999999));
});
