import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {classicIron as w} from '../src/data/classic-iron.js';
import {workouts, libraryWorkouts} from '../src/data/catalog.js';
import {compileWorkout} from '../src/domain/workout-timer.js';
import {RoundAmrapTimer, createRoundAmrapCues} from '../src/domain/round-amrap-timer.js';
import {createDraft, finalResults, supportsResults, resultSchema} from '../src/domain/result-schemas.js';
import {analyzeProgress} from '../src/domain/progress-analytics.js';
import {parseClassicIronPartialReps} from '../src/domain/classic-iron-results.js';

function clock() { let now=0;const timer=new RoundAmrapTimer(w,()=>now);timer.start();return {timer,at(ms){now=ms;return timer.snapshot();},advance(ms){now+=ms;return timer.snapshot();}}; }
test('Classic Iron is an eighth, separate v1 identity with exactly seven ordered ten-repetition movements and one 20-minute AMRAP',()=>{
  assert.equal(w.version,1);assert.equal(w.archived,false);assert.equal(w.demo,false);assert.equal(w.durationSeconds,1200);
  assert.equal(libraryWorkouts.at(-1),w);assert.equal(workouts.length,23);assert.ok(supportsResults(w));assert.equal(resultSchema(w).kind,'completed-rounds');
  assert.deepEqual(w.exercises.map(ex=>ex.name),['KB Swing','KB Thrusters','Single-Arm KB Bent-Over Row','KB Wood Choppers','KB Hollow-Ups','KB Reverse Lunge + Biceps Curl','KB Goblet Squat']);
  assert.equal(w.exercises.length,7);assert.equal(new Set(w.exercises.map(ex=>ex.id)).size,7);
  for(const ex of w.exercises){assert.equal(ex.target.min,10);assert.equal(ex.target.max,10);assert.equal(ex.equipment,'kettlebell');}
  assert.deepEqual(w.exercises.filter(ex=>ex.note).map(ex=>ex.id),['single-arm-bent-over-row','wood-choppers','reverse-lunge-biceps-curl']);
  for(const ex of w.exercises.filter(ex=>ex.note))assert.match(ex.note,/10 repetitions total, distributed between sides/);
  const timeline=compileWorkout(w);assert.equal(timeline.durationMs,1200000);assert.equal(timeline.segments.length,1);assert.equal(timeline.segments[0].kind,'AMRAP');assert.equal(timeline.segments[0].circuit.length,7);
});
test('pre-start countdown is outside activity; rounds are explicit, never automatic, and immediate double taps count once',()=>{
  const c=clock();assert.equal(c.at(0).countdown,3);assert.equal(c.timer.completeRound(),false);assert.equal(c.at(2999).elapsedMs,0);
  assert.equal(c.at(3000).totalRemainingMs,1200000);assert.equal(c.timer.completeRound(),false);c.advance(1);assert.equal(c.timer.completeRound(),true);assert.equal(c.timer.completeRound(),false);
  let s=c.timer.snapshot();assert.equal(s.completedRounds,1);assert.equal(s.state,'REST');assert.equal(s.restRemainingMs,20000);
  s=c.advance(19999);assert.equal(s.restRemainingMs,1);assert.equal(c.timer.completeRound(),false);
  s=c.advance(1);assert.equal(s.state,'TRAINING');assert.equal(s.totalRemainingMs,1179999);assert.equal(s.completedRounds,1);
  c.advance(1);assert.equal(c.timer.completeRound(),true);assert.equal(c.timer.snapshot().completedRounds,2);
  c.at(603000);assert.equal(c.timer.snapshot().completedRounds,2);assert.equal(c.timer.snapshot().stage,'exercise');
});
test('pause freezes the pre-start countdown, normal training and simultaneous rest/main clocks',()=>{
  const c=clock();c.at(1000);c.timer.pause();assert.equal(c.advance(60000).countdown,2);c.timer.resume();assert.equal(c.advance(2000).totalRemainingMs,1200000);
  c.advance(5000);c.timer.pause();const training=c.timer.snapshot();assert.equal(c.advance(600000).totalRemainingMs,training.totalRemainingMs);assert.equal(c.timer.completeRound(),false);c.timer.resume();
  assert.equal(c.timer.completeRound(),true);c.advance(7000);c.timer.pause();const rest=c.timer.snapshot();assert.equal(rest.restRemainingMs,13000);assert.equal(rest.state,'PAUSED');
  assert.equal(c.advance(600000).restRemainingMs,13000);assert.equal(c.timer.snapshot().totalRemainingMs,rest.totalRemainingMs);c.timer.resume();assert.equal(c.advance(13000).state,'TRAINING');assert.equal(c.timer.snapshot().completedRounds,1);
});
test('main deadline wins during final rest; repeated snapshots cannot extend or count partial rounds',()=>{
  const c=clock();c.at(1193000);assert.equal(c.timer.completeRound(),true);assert.equal(c.timer.snapshot().restRemainingMs,20000);
  const end=c.at(1203000);assert.equal(end.stage,'complete');assert.equal(end.totalRemainingMs,0);assert.equal(end.restRemainingMs,0);assert.equal(end.elapsedMs,1200000);assert.equal(end.completedRounds,1);
  assert.equal(c.timer.completeRound(),false);assert.equal(c.advance(300000).elapsedMs,1200000);assert.equal(c.timer.snapshot().completedRounds,1);
  const zero=clock();assert.equal(zero.at(1203000).completedRounds,0);
});
test('one cue per start, round-rest, rest-end and completion; no per-minute or per-exercise progression',()=>{
  const c=clock(),cues=createRoundAmrapCues(),heard=[];const sample=()=>{const cue=cues.next(c.timer.snapshot());if(cue)heard.push(cue);};sample();
  for(let t=100;t<=1203000;t+=100){c.at(t);sample();if(t===5000||t===1193000){assert.equal(c.timer.completeRound(),true);sample();sample();}}
  assert.deepEqual(heard,['start','rest','work','rest','complete']);
});
test('hidden/late updates and pause/resume consume cues without replay or late rest/start/completion sounds',()=>{
  const c=clock(),cues=createRoundAmrapCues();cues.next(c.timer.snapshot(),false);assert.equal(cues.next(c.at(6000)),null);
  c.timer.completeRound();assert.equal(cues.next(c.timer.snapshot()),'rest');c.timer.pause();assert.equal(cues.next(c.timer.snapshot()),null);
  c.advance(600000);c.timer.resume();assert.equal(cues.next(c.timer.snapshot()),null);assert.equal(cues.next(c.advance(20000)),null);
  assert.equal(cues.next(c.timer.snapshot()),null);c.timer.completeRound();cues.next(c.timer.snapshot(),false);cues.next(c.advance(20000),false);assert.equal(cues.next(c.advance(100)),null);
  assert.equal(cues.next(c.advance(1200000)),null);assert.equal(cues.next(c.timer.snapshot()),null);
});
test('completed-only results accept zero, reject unfinished/malformed counts and contain only completedRounds and partialReps',()=>{
  const record=createDraft(w,{getItem(){throw Error('Preferences must not be read');}},'classic-id','2026-11-13T12:00:00Z');assert.equal(record.status,'in-progress');assert.equal(record.form,undefined);assert.equal(record.results,null);assert.throws(()=>finalResults(record),/whole workout/);
  record.activeDurationMs=1200000;record.completedAt='2026-11-13T12:20:03Z';
  for(const n of [0,1,37]){record.results={completedRounds:n};assert.deepEqual(finalResults(record),{completedRounds:n,partialReps:0});}
  for(const n of [-1,1.5,NaN,Infinity,'2',null,undefined,Number.MAX_SAFE_INTEGER+1]){record.results={completedRounds:n};assert.throws(()=>finalResults(record),/non-negative whole/);}
  record.results={completedRounds:0};const analysis=analyzeProgress([{...record,status:'completed'}],{year:2026,month:11},()=>true);assert.equal(analysis.month.workouts,1);assert.equal(analysis.month.activeDurationMs,1200000);assert.deepEqual(analysis.strength,[]);
});
test('new completed-only controller has one final write and no draft, weight, automatic interval or recovery persistence',()=>{
  const source=fs.readFileSync(new URL('../src/ui/round-amrap-training.js',import.meta.url),'utf8');assert.doesNotMatch(source,/putDraft|getSession|restorePaused|localStorage|createWeightField/);assert.equal((source.match(/await completeSession\(record\)/g)||[]).length,1);assert.match(source,/record.ownerId !== currentUserId/);
  const worker=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');assert.match(worker,/kb2-static-v36/);
  for(const file of ['src/data/classic-iron.js','src/domain/round-amrap-timer.js','src/domain/classic-iron-results.js','src/ui/round-amrap-training.js','src/ui/round-amrap-presentation.js','styles/hm-round-amrap.css'])assert.ok(worker.includes(`'./${file}'`),file);
});
test('all legacy workout data, timer/controllers, result logic, audio, storage, cloud, branding and existing styles remain exact to merged main',()=>{
  const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/classic-iron-main-protected.json',import.meta.url)));
  assert.ok(Object.keys(hashes).length>80);
  for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
test('Classic Iron additional repetitions accept every whole count 0–69 and reject malformed, signed, fractional and out-of-range entries',()=>{
  const record=createDraft(w,null,'partial-session','2026-11-13T12:00:00Z');record.activeDurationMs=1200000;record.completedAt='2026-11-13T12:20:03Z';
  for(let n=0;n<=69;n++){
    assert.equal(parseClassicIronPartialReps(String(n)),n);
    record.results={completedRounds:8,partialReps:n};assert.deepEqual(finalResults(record),{completedRounds:8,partialReps:n});assert.equal(record.results.completedRounds,8);
  }
  for(const raw of ['', ' ', '-1', '-0', '+1', '1.5', '1.0', '70', '999999999999999999999999', '1e1', '0x10', 'NaN', 'Infinity', 'twenty', '20 reps', ' 20', '20 ', null, undefined, 20])assert.throws(()=>parseClassicIronPartialReps(raw),/whole number from 0 to 69/,String(raw));
  for(const partialReps of [-1,70,1.5,'20','',null,NaN,Infinity]){record.results={completedRounds:8,partialReps};assert.throws(()=>finalResults(record),/whole number from 0 to 69/);}
});
test('legacy Classic Iron result compatibility defaults missing partial reps without rewriting the record or converting rounds',()=>{
  const record=createDraft(w,null,'legacy-rounds','2026-11-13T12:00:00Z');record.activeDurationMs=1200000;record.completedAt='2026-11-13T12:20:03Z';record.results={completedRounds:8};
  const before=structuredClone(record);assert.deepEqual(finalResults(record),{completedRounds:8,partialReps:0});assert.deepEqual(record,before);
  record.results={completedRounds:8,partialReps:69};assert.deepEqual(finalResults(record),{completedRounds:8,partialReps:69});record.activeDurationMs--;assert.throws(()=>finalResults(record),/whole workout/);
});

test('round-times extension leaves the Classic Iron definition and Focus Mode presentation byte-identical to main',()=>{
  const hashes={
  "src/data/classic-iron.js": "f796559622e2253a0e4c2f445ee7528633e55612710e6b704ff428c958fcbac1",
  "src/ui/round-amrap-presentation.js": "f38dba20eb22bc5a93b303a45bae2d8c4adbfd04afd10f2833e5d85f4b283a25",
  "styles/hm-round-amrap.css": "289f98e0a14b5a4ab4bcf54e2c2dd4eba0659dcd9d41540dcc8f9aa12a1627af"
};
  for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
