import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tuesdayOfSpades as w} from '../src/data/tuesday-of-spades.js';
import {findWorkout,currentWorkouts} from '../src/data/catalog.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createCueTracker} from '../src/domain/workout-cues.js';
import {createDraft,finalResults,resultSchema} from '../src/domain/result-schemas.js';
import {writeWeight,weightKey} from '../src/storage/weight-preferences.js';
import {assignWorkout,filterWorkouts} from '../src/domain/planning.js';
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function finished(s=storage()){const r=createDraft(w,s,'tuesday','2026-10-26T12:00:00Z');r.stage='cardio-sweat-results';r.blockIndex=2;r.completedBlocks=w.phases.map(p=>p.id);r.activeDurationMs=1200000;return r;}
test('Tuesday v1 catalog, manual assignment and immutable 8+8+4 prescriptions',()=>{
 assert.equal(findWorkout(w.id,1),w);assert.ok(currentWorkouts.includes(w));assert.equal(w.suggestedDay,'Tuesday');assert.equal(w.demo,false);assert.equal(w.durationSeconds,1200);
 assert.deepEqual(filterWorkouts(currentWorkouts,'Tuesday of Spades','hybrid'),[w]);
 const plan={Tuesday:{workoutId:'monday-paranoid',version:2},Monday:{workoutId:'focus-001-upper-abs',version:1}};const next=assignWorkout(plan,'Tuesday',w);assert.equal(plan.Tuesday.version,2);assert.deepEqual(next.Monday,plan.Monday);assert.deepEqual(next.Tuesday,{workoutId:w.id,version:1});
 const {segments,durationMs}=compileWorkout(w);assert.equal(durationMs,1200000);assert.equal(segments.length,25);
 assert.deepEqual(segments.slice(0,8).map(s=>[s.kind,s.exercise.id,s.round,s.endMs-s.startMs]),Array.from({length:8},(_,i)=>['EMOM',i%2?'swing':'renegade-row',Math.floor(i/2)+1,60000]));
 const conditioning=segments.slice(8,24);assert.deepEqual(conditioning.map(s=>s.kind),Array.from({length:16},(_,i)=>i%2?'REST':'WORK'));
 for(let i=0;i<16;i++){assert.equal(conditioning[i].endMs-conditioning[i].startMs,i%2?20000:40000);assert.equal(conditioning[i].exercise.id,w.phases[1].exerciseIds[Math.floor(i/2)%4]);assert.equal(conditioning[i].exercise.target,undefined);}
 assert.equal(conditioning.at(-1).endMs,960000);assert.equal(segments.at(-1).startMs,960000);assert.equal(segments.at(-1).kind,'AMRAP');assert.deepEqual(segments.at(-1).circuit.map(ex=>[ex.name,ex.target.max]),[['KB Thrusters',8],['Hollow-Ups',8],['Jump Squats',10]]);assert.match(w.exercises[6].note,/ONE kettlebell/);
});
test('Tuesday event boundaries emit exactly START, seven MINUTE, eight REST/WORK, FINISHER and COMPLETE',()=>{
 let now=0;const engine=new WorkoutTimer(w,()=>now),cues=createCueTracker(),events=[];engine.start();cues.next(engine.snapshot());
 for(now=100;now<=1203000;now+=100){const cue=cues.next(engine.snapshot());if(cue)events.push([now-3000,cue]);}
 assert.deepEqual(events,[[0,'start'],...Array.from({length:7},(_,i)=>[(i+1)*60000,'minute']),...Array.from({length:8},(_,i)=>[[480000+i*60000,'work'],[520000+i*60000,'rest']]).flat(),[960000,'finisher'],[1200000,'complete']]);
 assert.equal(engine.snapshot().elapsedMs,1200000);assert.equal(cues.next(engine.snapshot()),null);
});
test('Tuesday dedicated results have seven session weights and full rounds only; blanks, zero and invalid entries',()=>{
 const s=storage(),ex=w.exercises[0];writeWeight(s,w,ex,'12.5');const r=finished(s);assert.equal(resultSchema(w).kind,'weights-rounds');assert.equal(Object.keys(r.form.weights).length,7);assert.equal(r.form.weights[ex.id],'12.5');assert.deepEqual(Object.keys(r.form),['weights','fullRounds','invalid']);
 writeWeight(s,w,ex,'24');assert.equal(r.form.weights[ex.id],'12.5');r.form.weights.swing='0';r.form.fullRounds='0';const result=finalResults(r);assert.deepEqual(Object.keys(result),['exerciseWeights','finisher']);assert.equal(Object.keys(result.exerciseWeights).length,7);assert.equal(result.exerciseWeights.swing,0);assert.equal(result.exerciseWeights.thrusters,null);assert.equal(result.exerciseWeights['hollow-ups'],undefined);assert.deepEqual(result.finisher,{phaseId:'cardio-sweat',fullRounds:0});
 r.form.fullRounds='';assert.equal(finalResults(r).finisher.fullRounds,null);for(const value of ['-1','1.5','NaN','Infinity',' ']){r.form.fullRounds=value;assert.throws(()=>finalResults(r));}r.form.fullRounds='2';r.form.weights.swing='-1';assert.throws(()=>finalResults(r));r.form.weights.swing='4.75';assert.equal(finalResults(r).exerciseWeights.swing,4.75);r.form.invalid['weights.swing']=true;assert.throws(()=>finalResults(r));delete r.form.invalid['weights.swing'];r.activeDurationMs=1199999;assert.throws(()=>finalResults(r));
 writeWeight(s,w,ex,'');assert.equal(s.map.get(weightKey(w,ex)),'null');assert.equal(createDraft(w,s).form.weights[ex.id],'');
});
