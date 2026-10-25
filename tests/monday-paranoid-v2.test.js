import {mondayParanoidV3} from '../src/data/monday-paranoid-v3.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mondayParanoidV2 as monday} from '../src/data/monday-paranoid-v2.js';
import {mondayParanoid as v1} from '../src/data/monday-paranoid.js';
import {currentWorkouts,findWorkout} from '../src/data/catalog.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createDraft,finalResults,blockOffset,resultSchema} from '../src/domain/result-schemas.js';
import {filterWorkouts,assignWorkout} from '../src/domain/planning.js';
import {writeWeight,weightKey} from '../src/storage/weight-preferences.js';
test('Monday v2 stays addressable without changing v1, old assignments or its card identity',()=>{
 assert.equal(monday.id,'monday-paranoid');assert.equal(monday.version,2);assert.equal(monday.code,'KB Monday Paranoid');assert.equal(monday.name,'Monday Paranoid');assert.equal(monday.type,'hybrid');assert.equal(monday.suggestedDay,'Monday');assert.equal(monday.execution.mode,'continuous-results');assert.deepEqual(monday.presentation,v1.presentation);
 assert.equal(findWorkout(monday.id,1),v1);assert.equal(findWorkout(monday.id,2),monday);assert.equal(currentWorkouts.filter(w=>w.id===monday.id).length,1);assert.deepEqual(filterWorkouts(currentWorkouts,'PARANOID','hybrid'),[mondayParanoidV3]);assert.equal(v1.version,1);assert.deepEqual(v1.phases.map(p=>p.durationSeconds),[480,480,240]);assert.equal(v1.execution.mode,'block-results');
 const oldPlan={Monday:{workoutId:monday.id,version:1},Tuesday:{workoutId:'focus-001-upper-abs',version:1}};assert.equal(findWorkout(oldPlan.Monday.workoutId,oldPlan.Monday.version),v1);const updated=assignWorkout(oldPlan,'Monday',monday);assert.equal(oldPlan.Monday.version,1);assert.equal(updated.Monday.version,2);assert.deepEqual(updated.Tuesday,oldPlan.Tuesday);
});
test('approved programming is exactly Upper 8 / ABS 6 / Legs 6 with timed ABS and two rounds',()=>{
 assert.equal(monday.durationSeconds,1200);assert.deepEqual(monday.phases.map(p=>[p.id,p.durationSeconds,p.format,p.rounds]),[['upper',480,'emom',2],['abs',360,'intervals',2],['legs',360,'emom',2]]);
 const expected=[['KB Push Press',4,6,'reps per side'],['KB Offset Push-Up',6,8,'reps'],['KB Staggered-Stance Row',7,8,'reps per side'],['KB Overhead Triceps Extension',7,8,'reps'],['KB Dead Bug + Chest Press'],['KB Standing Wood Chop'],['KB Kick-Through'],['KB Front Rack Squat',6,8,'reps'],['KB Swing',12,15,'reps'],['KB Step-Up',5,5,'reps per side']];
 assert.deepEqual(monday.exercises.map(ex=>[ex.name,...(ex.target?[ex.target.min,ex.target.max,ex.target.unit]:[])]),expected);assert.deepEqual(monday.phases.flatMap(p=>p.exerciseIds),monday.exercises.map(ex=>ex.id));assert.ok(monday.exercises.slice(4,7).every(ex=>ex.target===undefined));
 const timeline=compileWorkout(monday);assert.equal(timeline.durationMs,1200000);assert.equal(timeline.segments.filter(s=>s.kind==='EMOM').length,14);assert.equal(timeline.segments.filter(s=>s.kind==='WORK').length,6);assert.equal(timeline.segments.filter(s=>s.kind==='REST').length,6);assert.ok(timeline.segments.filter(s=>s.kind==='WORK').every(s=>s.endMs-s.startMs===40000));assert.ok(timeline.segments.filter(s=>s.kind==='REST').every(s=>s.endMs-s.startMs===20000));assert.equal(timeline.segments.filter(s=>s.kind==='AMRAP').length,0);
 for(const phase of [monday.phases[0],monday.phases[2]]){const segments=timeline.segments.filter(s=>s.phase.id===phase.id);segments.forEach((segment,i)=>{assert.equal(segment.exercise.id,phase.exerciseIds[i%phase.exerciseIds.length]);assert.equal(segment.round,Math.floor(i/phase.exerciseIds.length)+1);assert.equal(segment.endMs-segment.startMs,60000);});}
 assert.deepEqual([0,1,2,3].map(i=>blockOffset(monday,i)),[0,480000,840000,1200000]);
});
test('existing monotonic timer transitions automatically with one countdown and restores later phases paused',()=>{
 let now=0;const timer=new WorkoutTimer(monday,()=>now);timer.start();now=2999;assert.equal(timer.snapshot().stage,'countdown');now=3000;assert.equal(timer.snapshot().exercise.id,'push-press');
 now=483000;assert.equal(timer.snapshot().phase.id,'abs');assert.equal(timer.snapshot().kind,'WORK');now=523000;assert.equal(timer.snapshot().kind,'REST');now=843000;assert.equal(timer.snapshot().phase.id,'legs');assert.equal(timer.snapshot().kind,'EMOM');timer.pause();now+=600000;assert.equal(timer.snapshot().elapsedMs,840000);timer.resume();now+=360000;assert.equal(timer.snapshot().stage,'complete');assert.equal(timer.snapshot().elapsedMs,1200000);
 for(const elapsed of [63000,528000,888000]){const restored=new WorkoutTimer(monday,()=>now);restored.restorePaused(elapsed);const before=restored.snapshot();now+=600000;assert.equal(restored.snapshot().elapsedMs,before.elapsedMs);assert.equal(restored.status,'paused');}
});
test('v2 results use two Upper/Legs rounds and ABS intervals, keep fresh independent loads and preserve null/zero',()=>{
 const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 for(const ex of v1.exercises)writeWeight(storage,v1,ex,'24');const oldPrefs=[...entries];let draft=createDraft(monday,storage,'version-two');for(const phase of monday.phases)for(const ex of phase.exerciseIds)assert.equal(draft.form[phase.id][ex].weightKg,'');
 writeWeight(storage,monday,monday.exercises[0],'12.5');draft=createDraft(monday,storage,'version-two');assert.equal(draft.form.upper['push-press'].weightKg,'12.5');assert.deepEqual(oldPrefs.map(([key])=>[key,entries.get(key)]),oldPrefs);assert.notEqual(weightKey(monday,monday.exercises[0]),weightKey(v1,monday.exercises[0]));
 assert.equal(resultSchema(monday).blocks.upper.rounds,2);assert.equal(resultSchema(monday).blocks.legs.rounds,2);assert.equal(resultSchema(monday).blocks.abs.max,2);assert.throws(()=>finalResults(draft));draft.stage='legs-results';draft.blockIndex=2;draft.completedBlocks=['upper','abs','legs'];draft.activeDurationMs=1200000;
 draft.form.upper['push-press'].round1='0';draft.form.upper['push-press'].round2='6';draft.form.abs['dead-bug-chest-press'].intervalsCompleted='2';draft.form.legs['step-up'].round2='0';let result=finalResults(draft);assert.deepEqual(result.upper[0].rounds,[0,6]);assert.deepEqual(result.legs[2].rounds,[null,0]);assert.equal(result.abs[0].intervalsCompleted,2);assert.equal(result.abs[1].intervalsCompleted,null);assert.equal(result.perceivedEffort,null);assert.equal(result['combo-finisher'],undefined);
 for(const invalid of ['-1','1.5']){draft.form.legs['step-up'].round1=invalid;assert.throws(()=>finalResults(draft));}draft.form.legs['step-up'].round1='';draft.form.abs['dead-bug-chest-press'].intervalsCompleted='3';assert.throws(()=>finalResults(draft));draft.form.abs['dead-bug-chest-press'].intervalsCompleted='';draft.form.perceivedEffort='11';assert.throws(()=>finalResults(draft));draft.form.perceivedEffort='8';draft.form.notes='Actual results';result=finalResults(draft);assert.equal(result.perceivedEffort,8);assert.equal(result.notes,'Actual results');
});
