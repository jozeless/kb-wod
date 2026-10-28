import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fridayToBlack as w} from '../src/data/friday-to-black.js';
import {findWorkout,currentWorkouts} from '../src/data/catalog.js';
import {filterWorkouts,assignWorkout} from '../src/domain/planning.js';
import {compileWorkout,WorkoutTimer} from '../src/domain/workout-timer.js';
import {createCueTracker} from '../src/domain/workout-cues.js';
import {createDraft,finalResults,resultSchema} from '../src/domain/result-schemas.js';
import {writeWeight,weightKey} from '../src/storage/weight-preferences.js';
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function finished(s=memory()){const r=createDraft(w,s,'friday','2026-10-28T12:00:00Z');r.stage='finisher-results';r.blockIndex=2;r.completedBlocks=w.phases.map(p=>p.id);r.activeDurationMs=1200000;return r;}
test('Friday v1 independent identity, approved prescriptions, bodyweight exclusions and manual planning',()=>{
 assert.equal(findWorkout('friday-to-black',1),w);assert.ok(currentWorkouts.includes(w));assert.equal(w.version,1);assert.equal(w.code,'HM/KB Friday');assert.equal(w.suggestedDay,'Friday');assert.equal(w.type,'hybrid');assert.equal(w.category,'Full Body · Strength & Conditioning');assert.equal(w.demo,false);assert.equal(w.archived,false);assert.equal(w.equipment.requiredWeightKg,null);assert.deepEqual(filterWorkouts(currentWorkouts,'FRIDAY TO BLACK','hybrid'),[w]);
 const plan={Friday:{workoutId:'thursday-bells',version:1},Tuesday:{workoutId:'tuesday-of-spades',version:1}},next=assignWorkout(plan,'Friday',w);assert.deepEqual(plan.Friday,{workoutId:'thursday-bells',version:1});assert.deepEqual(next.Tuesday,plan.Tuesday);assert.deepEqual(next.Friday,{workoutId:w.id,version:1});
 assert.deepEqual(w.exercises.map(ex=>ex.id),['alternating-floor-press','sumo-deadlift','staggered-stance-row','sit-up-twist','front-rack-march','chest-level-crossover','goblet-squat-curl','mountain-climbers','burpees']);assert.ok(w.exercises.slice(0,7).every(ex=>ex.equipment==='kettlebell'));assert.ok(w.exercises.slice(7).every(ex=>ex.equipment==='bodyweight'));
 assert.deepEqual(w.exercises[0].target,{min:5,max:6,unit:'repetitions per arm'});assert.match(w.exercises[0].note,/ONE kettlebell/);assert.match(w.exercises[0].note,/final \(fourth\).*06:00–07:00/);assert.deepEqual(w.exercises[1].target,{min:8,max:10,unit:'repetitions'});assert.ok(w.exercises.slice(2,6).every(ex=>ex.target===undefined));assert.match(w.exercises[2].note,/both sides evenly/);assert.match(w.exercises[4].note,/no|without adding|guidance/i);
 assert.deepEqual(w.exercises.slice(6).map(ex=>ex.target.max),[6,20,6]);assert.match(w.exercises[6].note,/complete squat-plus-curl/);assert.match(w.exercises[7].note,/One knee drive/);assert.match(w.exercises[8].note,/fully completed burpee/);
});
test('Friday 8+8+4 timeline: eight alternating EMOM slots, final Conditioning rest, continuous exact 6/20/6 circuit',()=>{
 const t=compileWorkout(w);assert.equal(t.durationMs,1200000);assert.equal(w.durationSeconds,1200);assert.deepEqual(w.phases.map(p=>[p.format,p.durationSeconds]),[['emom',480],['intervals',480],['amrap',240]]);assert.equal(t.segments.length,25);
 assert.deepEqual(t.segments.slice(0,8).map(s=>[s.exercise.id,s.round,s.startMs,s.endMs]),Array.from({length:8},(_,i)=>[i%2?'sumo-deadlift':'alternating-floor-press',Math.floor(i/2)+1,i*60000,(i+1)*60000]));assert.equal(t.segments[6].exercise.id,'alternating-floor-press');assert.equal(t.segments[6].startMs,360000);assert.equal(t.segments[6].endMs,420000);
 const intervals=t.segments.slice(8,24);for(let i=0;i<16;i++){assert.equal(intervals[i].kind,i%2?'REST':'WORK');assert.equal(intervals[i].endMs-intervals[i].startMs,i%2?20000:40000);assert.equal(intervals[i].exercise.id,w.phases[1].exerciseIds[Math.floor(i/2)%4]);}assert.equal(intervals.at(-1).startMs,940000);assert.equal(intervals.at(-1).endMs,960000);
 assert.deepEqual(t.segments.at(-1).circuit.map(ex=>[ex.id,ex.target.max]),[['goblet-squat-curl',6],['mountain-climbers',20],['burpees',6]]);assert.equal(t.segments.at(-1).startMs,960000);assert.equal(t.segments.at(-1).endMs,1200000);assert.equal(t.segments.at(-1).kind,'AMRAP');assert.ok(!t.segments.some(s=>s.kind==='TRANSITION'||s.kind==='SIDE_HOLD'));
});
test('Friday cue stream is exact and unique with no independent global-minute or circuit-switch cues',()=>{
 let now=0;const timer=new WorkoutTimer(w,()=>now),cues=createCueTracker(),events=[];timer.start();cues.next(timer.snapshot());for(now=100;now<=1203000;now+=100){const cue=cues.next(timer.snapshot());if(cue)events.push([now-3000,cue]);}
 assert.deepEqual(events,[[0,'start'],...Array.from({length:7},(_,i)=>[(i+1)*60000,'minute']),...Array.from({length:8},(_,i)=>[[480000+i*60000,'work'],[520000+i*60000,'rest']]).flat(),[960000,'finisher'],[1200000,'complete']]);assert.equal(timer.snapshot().elapsedMs,1200000);assert.equal(cues.next(timer.snapshot()),null);
});
test('Friday snapshot weights and benchmark pair are independent, blank by default and never filled from prescribed targets',()=>{
 const s=memory(),floor=w.exercises[0];writeWeight(s,w,floor,'12.5');const r=finished(s);assert.equal(resultSchema(w).kind,'weights-floorpress-rounds');assert.equal(Object.keys(r.form.weights).length,7);assert.equal(r.form.leftReps,'');assert.equal(r.form.rightReps,'');assert.equal(r.form.fullRounds,'');assert.equal(r.form.weights['alternating-floor-press'],'12.5');writeWeight(s,w,floor,'24');assert.equal(r.form.weights['alternating-floor-press'],'12.5');
 assert.deepEqual(finalResults(r),{exerciseWeights:{'alternating-floor-press':12.5,'sumo-deadlift':null,'staggered-stance-row':null,'sit-up-twist':null,'front-rack-march':null,'chest-level-crossover':null,'goblet-squat-curl':null},keyExercise:{exerciseId:'alternating-floor-press',referenceSet:'final',leftReps:null,rightReps:null},finisher:{phaseId:'finisher',fullRounds:null}});
 r.form.leftReps='0';r.form.rightReps='7';r.form.fullRounds='3';r.form.weights['sumo-deadlift']='0';r.form.weights['goblet-squat-curl']='8.5';let result=finalResults(r);assert.deepEqual(result.keyExercise,{exerciseId:'alternating-floor-press',referenceSet:'final',leftReps:0,rightReps:7});assert.equal(result.finisher.fullRounds,3);assert.equal(result.exerciseWeights['sumo-deadlift'],0);assert.equal(result.exerciseWeights['goblet-squat-curl'],8.5);assert.equal(result.exerciseWeights['mountain-climbers'],undefined);assert.equal(result.exerciseWeights.burpees,undefined);assert.deepEqual(Object.keys(result),['exerciseWeights','keyExercise','finisher']);
 r.form.leftReps='9';r.form.rightReps='';assert.equal(finalResults(r).keyExercise.leftReps,9);assert.equal(finalResults(r).keyExercise.rightReps,null);writeWeight(s,w,floor,'');assert.equal(s.map.get(weightKey(w,floor)),'null');assert.equal(createDraft(w,s).form.weights['alternating-floor-press'],'');
 for(const [id,version]of[['monday-paranoid',3],['tuesday-of-spades',1],['thursday-bells',1]]){const other=createDraft(findWorkout(id,version),s);assert.equal(other.form.leftReps,undefined);assert.equal(other.form.rightReps,undefined);}
});
test('Friday rejects invalid weights and benchmark/finisher counts, requires full completion and preserves zero/null',()=>{
 for(const key of ['leftReps','rightReps','fullRounds'])for(const raw of ['-1','1.5','NaN','Infinity',' ','garbage',null,undefined]){const r=finished();r.form[key]=raw;assert.throws(()=>finalResults(r));}
 for(const key of ['leftReps','rightReps','fullRounds']){const r=finished();r.form.invalid[key]=true;assert.throws(()=>finalResults(r));}
 for(const raw of ['-1','NaN','Infinity','garbage']){const r=finished();r.form.weights['alternating-floor-press']=raw;assert.throws(()=>finalResults(r));}
 const r=finished();assert.throws(()=>finalResults({...r,activeDurationMs:1199999}));assert.throws(()=>finalResults({...r,stage:'strength-results'}));assert.throws(()=>finalResults({...r,completedBlocks:['strength','conditioning']}));
 r.form.leftReps='0';r.form.rightReps='0';r.form.fullRounds='0';assert.deepEqual(finalResults(r).keyExercise,{exerciseId:'alternating-floor-press',referenceSet:'final',leftReps:0,rightReps:0});assert.equal(finalResults(r).finisher.fullRounds,0);
});
