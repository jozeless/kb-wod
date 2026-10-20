import test from 'node:test';
import assert from 'node:assert/strict';
import { days, assignWorkout, filterWorkouts, validatePlan } from '../src/domain/planning.js';
import { demoWorkouts } from '../src/data/demo-workouts.js';
import { loadPlan, savePlan, planKey } from '../src/storage/weekly-plan.js';
test('seven days in calendar order', () => { assert.equal(days.length, 7); assert.equal(days[0], 'Monday'); assert.equal(days[6], 'Sunday'); });
test('search, type, combined filters and archived workouts', () => {
 assert.equal(filterWorkouts(demoWorkouts, '  FLOW ').length, 1);
 assert.equal(filterWorkouts(demoWorkouts, '', 'focus').length, 1);
 assert.equal(filterWorkouts(demoWorkouts, 'flow', 'focus').length, 0);
 assert.equal(filterWorkouts([{...demoWorkouts[0], archived:true}]).length, 0);
});
test('assign, reuse, replace and remove without mutating original', () => {
 const original = {}; const a = assignWorkout(original, 'Monday', demoWorkouts[0]);
 const b = assignWorkout(a, 'Tuesday', demoWorkouts[0]);
 assert.deepEqual(original, {}); assert.deepEqual(b.Monday, b.Tuesday);
 const c = assignWorkout(b, 'Monday', demoWorkouts[1]); assert.equal(c.Tuesday.workoutId, demoWorkouts[0].id);
 assert.equal(assignWorkout(c, 'Monday', null).Monday, null);
 assert.throws(() => assignWorkout({}, 'Invalid', demoWorkouts[0]));
});
test('persistent version references; prototype keys untouched', () => {
 const data = new Map([['kbwod_history', 'original']]);
 const storage = {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const plan = assignWorkout({}, 'Sunday', demoWorkouts[0]); savePlan(storage,plan);
 assert.deepEqual(loadPlan(storage).plan, plan); assert.equal(data.get('kbwod_history'),'original'); assert.equal(data.size,2); assert.equal(planKey,'kb2.weekly-plan.v1');
});
test('invalid storage preserved and errors surfaced', () => {
 const storage = {getItem:()=>'{broken'}; assert.ok(loadPlan(storage).error);
 assert.throws(()=>validatePlan([])); assert.throws(()=>validatePlan({Monday:{workoutId:'x',version:0}}));
 assert.ok(loadPlan({getItem:()=>{throw Error('blocked')}}).error);
 assert.throws(()=>savePlan({setItem:()=>{throw Error('quota')}}, {}));
});

test('real Focus definition: timing, ordered exercises, version and future results', async () => {
 const { workouts, findWorkout } = await import('../src/data/catalog.js');
 const w = findWorkout('focus-001-upper-abs', 1);
 assert.equal(workouts.filter(x=>x.demo).length, 3);assert.equal(w.demo,false);
 assert.equal(new Set(workouts.map(x=>`${x.id}/${x.version}`)).size, workouts.length);
 assert.equal(w.durationSeconds,1200);assert.equal(w.phases.reduce((sum,p)=>sum+p.durationSeconds,0),1200);
 assert.equal(w.warmup.included,false);assert.equal(w.equipment.requiredWeightKg,null);
 assert.deepEqual(w.phases.map(p=>p.rounds),[2,2]);
 assert.equal(w.phases[0].timer.intervalSeconds*w.phases[0].timer.intervals,600);
 const t=w.phases[1].timer;assert.equal((t.workSeconds+t.restSeconds)*t.intervals,600);
 for(const p of w.phases){assert.equal(p.exerciseIds.length,5);for(const id of p.exerciseIds)assert.ok(w.exercises.find(ex=>ex.id===id));}
 assert.deepEqual(w.exercises.map(ex=>ex.name),['KB Floor Press','Supported Single-Arm KB Row','KB Push Press','KB Horn Curls','ATW + Front Rise','KB Dead Bug + Pullover','KB Bear Plank Row + Kick Through','KB V-Up + Pulse','Hollow Flutters + KB Chest Press','KB Sit-Ups']);
 assert.equal(w.exercises.filter(ex=>ex.attribution).length,1);
 assert.ok(w.exercises.every(ex=>ex.equipment==='kettlebell'));
 assert.equal(w.resultFields.find(f=>f.id==='perceivedExertion').max,10);
 assert.equal(w.resultFields.find(f=>f.id==='absIntervalsCompleted').max,10);
});
