import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {findWorkout, libraryWorkouts, workouts} from '../src/data/catalog.js';
import {compileWorkout, WorkoutTimer} from '../src/domain/workout-timer.js';
import {createCueTracker} from '../src/domain/workout-cues.js';
import {cuePatterns, loudCuePatterns} from '../src/platform/workout-audio.js';
import {createDraft, finalResults} from '../src/domain/result-schemas.js';
import {readWeightPreference, weightKey} from '../src/storage/weight-preferences.js';
import {analyzeProgress} from '../src/domain/progress-analytics.js';
import {floorPressReference} from '../src/domain/friday-benchmark.js';
import {prescription} from '../src/ui/exercise-prescription.js';
const pairs = [['monday-paranoid',3,4,1270],['tuesday-of-spades',1,2,1200],['thursday-bells',1,2,1270],['friday-to-black',1,2,1200]];
for (const [id, oldVersion, version, duration] of pairs) {
 test(`${id} v${version}: 40/20 sequence and complete rests preserve rounds, duration and exact special phases`, () => {
  const old = findWorkout(id,oldVersion), w = findWorkout(id,version), timeline = compileWorkout(w);
  assert.equal(w.durationSeconds,duration);assert.equal(timeline.durationMs,duration*1000);assert.equal(w.audioProfile,'clear-loud-v1');
  assert.deepEqual(w.exercises.map(ex=>ex.id),old.exercises.map(ex=>ex.id));assert.deepEqual(w.execution,old.execution);
  assert.deepEqual(w.phases.map(p=>[p.id,p.durationSeconds,p.rounds,p.exerciseIds]),old.phases.map(p=>[p.id,p.durationSeconds,p.rounds,p.exerciseIds]));
  for(const [index,p] of w.phases.entries()) {
   const before=old.phases[index],segments=timeline.segments.filter(s=>s.phase.id===p.id);
   if(!['emom','intervals'].includes(before.format)){assert.deepEqual(p,before);continue;}
   assert.equal(p.format,'intervals');assert.deepEqual(p.timer,{workSeconds:40,restSeconds:20,intervals:before.timer.intervals});
   assert.equal(segments.length,p.timer.intervals*2);
   for(let i=0;i<p.timer.intervals;i++) {const work=segments[2*i],rest=segments[2*i+1];assert.equal(work.kind,'WORK');assert.equal(rest.kind,'REST');assert.equal(work.endMs-work.startMs,40000);assert.equal(rest.endMs-rest.startMs,20000);assert.equal(work.endMs,rest.startMs);assert.equal(work.exercise.id,p.exerciseIds[i%p.exerciseIds.length]);assert.equal(rest.exercise.id,work.exercise.id);}
   assert.equal(segments.at(-1).kind,'REST');assert.equal(segments.at(-1).endMs-segments[0].startMs,p.durationSeconds*1000);
  }
  let now=0;const timer=new WorkoutTimer(w,()=>now);timer.start();assert.equal(timer.snapshot().stage,'countdown');now=3000;assert.equal(timer.snapshot().kind,'WORK');now=duration*1000+3000;assert.equal(timer.snapshot().stage,'complete');
 });
 test(`${id} v${version}: each actual boundary has exactly one semantic cue; no MINUTE during WORK/REST`,()=>{
  let now=0;const timer=new WorkoutTimer(findWorkout(id,version),()=>now);timer.start();const tracker=createCueTracker();tracker.next(timer.snapshot(),false);const cues=[];
  now=3000;assert.equal(tracker.next(timer.snapshot(),true),'start');assert.equal(tracker.next(timer.snapshot(),true),null);
  for(const [i,segment] of timer.timeline.segments.entries()) {
   // Advance in sub-second increments to avoid intentionally suppressing late cues.
   const before=cues.length;const end=segment.endMs+3000;for(;now<end;){now=Math.min(end,now+500);const cue=tracker.next(timer.snapshot(),true);if(cue)cues.push(cue);}
   const next=timer.timeline.segments[i+1];const expected=!next?'complete':next.kind==='REST'?'rest':next.kind==='TRANSITION'?null:next.kind==='AMRAP_REPS'||next.phase.audioCue==='finisher'&&next.phase.id!==segment.phase.id?'finisher':'work';
   assert.deepEqual(cues.slice(before),expected?[expected]:[]);assert.equal(tracker.next(timer.snapshot(),true),null);
  }
  assert.equal(cues.includes('minute'),false);assert.equal(cues.filter(c=>c==='complete').length,1);
  assert.equal(cues.filter(c=>c==='rest').length,findWorkout(id,version).phases.filter(p=>p.format==='intervals').reduce((n,p)=>n+p.timer.intervals,0));
 });
}
test('public Library retains the original four releases first, while all 15 original references remain registered',()=>{
 assert.deepEqual(libraryWorkouts.slice(0,4).map(w=>[w.id,w.version]),pairs.map(([id,,v])=>[id,v]));assert.equal(workouts.length,23);
 for(const [id,v]of pairs)assert.equal(findWorkout(id,v).version,v);
 for(const [id,vs]of [['monday-paranoid',[1,2,3]],['focus-001-upper-abs',[1,2]],['hybrid-001-strength-sweat',[1,2]]])for(const v of vs)assert.ok(findWorkout(id,v));
});
test('new time-first prescriptions retain optional detail references and never change old targets or finishers',()=>{
 for(const [id,,v]of pairs){const w=findWorkout(id,v),p=w.phases[0],ex=w.exercises.find(ex=>ex.id===p.exerciseIds[0]);assert.match(prescription(ex,p,{active:true}),/^40 seconds work \/ 20 seconds rest/);assert.doesNotMatch(prescription(ex,p,{active:true}),/\d+[–-]\d+ repetitions/);assert.match(prescription(ex,p),/Optional reference:/);const last=w.phases.at(-1);assert.match(prescription(w.exercises.find(ex=>ex.id===last.exerciseIds[0]),last),/repetition|hand|combination/i);}
});
test('new-version weight preferences inherit valid prior values and explicit clears read-only with isolated keys',()=>{
 for(const [id,oldVersion,v]of pairs){const w=findWorkout(id,v),old=findWorkout(id,oldVersion),ex=w.exercises[0],map=new Map([[weightKey(old,ex),'12.5']]);let writes=0;const storage={getItem:k=>map.get(k)??null,setItem(){writes++;}};assert.equal(readWeightPreference(storage,w,ex),'12.5');map.set(weightKey(old,ex),'null');assert.equal(readWeightPreference(storage,w,ex),'');map.set(weightKey(w,ex),'0');assert.equal(readWeightPreference(storage,w,ex),'0');assert.equal(writes,0);}
});
const completed=(id,v,key,weight)=>{const w=findWorkout(id,v),r=createDraft(w,{getItem:()=>null},key,'2026-11-02T12:00:00Z');r.stage=`${w.phases.at(-1).id}-results`;r.blockIndex=w.phases.length-1;r.completedBlocks=w.phases.map(p=>p.id);r.activeDurationMs=w.durationSeconds*1000;r.completedAt=r.startedAt;for(const ex of Object.keys(r.form.weights))r.form.weights[ex]=String(weight);if('leftReps'in r.form){r.form.leftReps='6';r.form.rightReps='5';r.form.fullRounds='3';}r.results=finalResults(r);r.status='completed';return r;};
test('weights align across new/old equivalent identities, while 40s/60s final-set benchmarks stay distinct and circuit rounds still combine',()=>{
 const old=completed('friday-to-black',1,'old',12),fresh=completed('friday-to-black',2,'fresh',16),before=structuredClone(old);
 const a=analyzeProgress([old,fresh],{year:2026,month:11},()=>true);assert.equal(a.month.workouts,2);assert.equal(a.strength.find(s=>s.exerciseId==='alternating-floor-press').points.length,2);
 assert.equal(a.performance.filter(m=>m.label.includes('left arm')).length,2);assert.equal(a.performance.find(m=>m.label.includes('40s work')&&m.label.includes('left arm')).total,6);
 assert.equal(a.performance.filter(m=>m.unit==='rounds').length,1);assert.equal(a.performance.find(m=>m.unit==='rounds').total,6);assert.deepEqual(old,before);
 assert.equal(floorPressReference(old.workoutSnapshot).workSeconds,60);assert.equal(floorPressReference(fresh.workoutSnapshot).workSeconds,40);
 assert.match(floorPressReference(fresh.workoutSnapshot).savedDescription,/06:00–06:40/);assert.equal(floorPressReference(old.workoutSnapshot).savedDescription,'Fourth Floor Press set (06:00–07:00), not totals across all rounds.');
 for(const [id,,v]of pairs)assert.equal(completed(id,v,id,12).results.exerciseWeights[findWorkout(id,v).exercises[0].id],12);
});
test('opt-in louder patterns retain semantic shapes with bounded gain, richer waveform and unmodified historical sine pattern levels',()=>{
 assert.deepEqual(Object.values(cuePatterns).map(p=>p.peak),[.28,.22,.24,.28,.27,.26]);
 for(const [name,p]of Object.entries(loudCuePatterns)){assert.deepEqual(p.durations,cuePatterns[name].durations);assert.equal(p.frequency,cuePatterns[name].frequency);assert.equal(p.waveform,'triangle');assert.ok(p.peak>=.64&&p.peak<=.78);assert.ok(p.peak/cuePatterns[name].peak>2.5);}
});

test('all previously released data modules remain byte-identical to the actual main base',()=>{
 const expected={"src/data/demo-workouts.js": "edc61e32eac1d2e2ed6cea3be4644a90931b4254e585d94fd981dc682fc5b7c6", "src/data/focus-001-upper-abs.js": "7461e4330d6bb27f6a1724206d83c43d53796d13c4f6bbfc3efb9b86b47df8b9", "src/data/focus-001-v2.js": "fbf6e6dfa69ce0a13ec647245d5c31be1de362a1e3025b5930de7a5e74deb909", "src/data/focus-002-lower-abs.js": "a0de63abdf5e9bc83d5af98ff4f023637a4c9b6d5b8c875fe908c59611988a12", "src/data/friday-to-black.js": "3a2d29ed1da0ce8aa9a06c10cbb725cae34fb2698798114943409df9d4d14c77", "src/data/hybrid-001-strength-sweat.js": "814ade0084ce21309e5ab0d352deb76a293f7f58a9ccd4fa5e21a1f7d1df50a5", "src/data/hybrid-001-v2.js": "3913c6dcc750be522ce369bdfd2ac0af3e96d919cadd1c76eaa9460661319422", "src/data/hybrid-002-full-body-engine.js": "4ed9ddc3343c7d166834721fdbfa5e7c5cfcdbe64bd4e121c3196ebb88590f4e", "src/data/monday-paranoid-v2.js": "2f6e0af0b7a0c56c77991d214dee82e51fc31f19b1dcf8bcdfd034d66da4da79", "src/data/monday-paranoid-v3.js": "4558744f9f739669cb31c250b3bd513bfdb9f68e3ca8079634b61a04a632679b", "src/data/monday-paranoid.js": "c2de346aedacad074782ed00f597b78ea2ff1b54786e8b6d0c22a2772ed38127", "src/data/thursday-bells.js": "92170b818d9fa274328cef757c744d67c25bffde5ec12a46288abebf29840934", "src/data/tuesday-of-spades.js": "e7cf5197874e595394f1f14a64cb93459376596e6eca07c0ab806b25a6de9135"};
 for(const [file,hash]of Object.entries(expected))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
