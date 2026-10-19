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
