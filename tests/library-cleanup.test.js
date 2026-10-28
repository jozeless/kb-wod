import {test} from 'node:test';
import assert from 'node:assert/strict';
import {libraryWorkouts,workouts,currentWorkouts,findWorkout} from '../src/data/catalog.js';
test('public Library pins exactly four approved existing versions in release order',()=>{
 assert.deepEqual(libraryWorkouts.map(w=>[w.id,w.version,w.name]),[['monday-paranoid',3,'Monday Paranoid'],['tuesday-of-spades',1,'Tuesday of Spades'],['thursday-bells',1,'Thursday Bells'],['friday-to-black',1,'Friday To Black']]);
 for(const w of libraryWorkouts){assert.equal(w,findWorkout(w.id,w.version));assert.ok(workouts.includes(w));assert.equal(w.demo,false);assert.equal(w.archived,false);assert.equal(w.type,'hybrid');}
 assert.equal(new Set(libraryWorkouts.map(w=>`${w.id}:${w.version}`)).size,4);
});
test('internal registry and latest-version compatibility export retain all historical identities',()=>{
 assert.equal(workouts.length,15);assert.equal(currentWorkouts.length,11);assert.equal(new Set(workouts.map(w=>`${w.id}:${w.version}`)).size,15);
 for(const id of ['focus-001-upper-abs','hybrid-001-strength-sweat'])for(const version of [1,2]){const w=findWorkout(id,version);assert.ok(w);assert.equal(w.version,version);assert.ok(!libraryWorkouts.includes(w));}
 for(const version of [1,2]){assert.ok(findWorkout('monday-paranoid',version));assert.ok(!libraryWorkouts.includes(findWorkout('monday-paranoid',version)));}
 for(const id of ['focus-002-lower-abs','hybrid-002-full-body-engine','demo-hybrid-foundation','demo-focus-strength','demo-hybrid-flow']){const w=findWorkout(id,1);assert.ok(w);assert.ok(!libraryWorkouts.includes(w));}
 assert.equal(workouts.filter(w=>w.demo).length,3);assert.equal(findWorkout('unknown-workout',1),undefined);
});
