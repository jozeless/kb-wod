import test from 'node:test';
import assert from 'node:assert/strict';
import {workouts, libraryWorkouts} from '../src/data/catalog.js';
import {RoundAmrapTimer} from '../src/domain/round-amrap-timer.js';
import {partialRepMaximum, parseRoundAmrapPartialReps, createRoundAmrapSession, roundAmrapFinalResults} from '../src/domain/round-amrap-results.js';
import {fastestWorkoutRound} from '../src/domain/round-amrap-progress.js';
import {analyzeProgress} from '../src/domain/progress-analytics.js';
const names=['Classic Iron','Core Blast','Iron Twist','Saturday Morning Beef'];
test('exact released library, independent identities, approved ordered movements and fixed prescriptions',()=>{
 assert.deepEqual(libraryWorkouts.map(w=>w.name),names);assert.equal(new Set(workouts.map(w=>w.id)).size,4);
 const expected=[['North-South Plank','Plank Pull-Through','Single-Arm Sit-Up','Twist-Ups','Hollow-Ups'],['Rotational Thruster','Deadlift + Halo','Lunge to Press-Out','Pullover to Rotation','Cross-Body Lunges'],['Snatch','Squat Halo','Ballistic Row','Lunge Knee Drive','Alternating Swing']];
 workouts.slice(1).forEach((w,i)=>{assert.deepEqual(w.exercises.map(e=>e.name),expected[i]);assert.equal(w.durationSeconds,300);assert.equal(w.execution.restSeconds,20);assert.equal(w.prescribedWeightKg,i===0?undefined:8);assert.equal(w.presentation.weightPreferences,false);assert.equal(w.phases[0].exerciseIds.length,5);for(const e of w.exercises){assert.equal(e.target.min,10);assert.equal(e.target.max,10);if(e.note)assert.match(e.note,/5 per side/);}});
});
function saved(w,id,times,ownerId='A'){return {...createRoundAmrapSession(w,null,id,'2026-11-13T10:00:00Z'),ownerId,status:'completed',activeDurationMs:w.durationSeconds*1000,completedAt:'2026-11-13T10:20:03Z',results:{completedRounds:times.length,partialReps:20,roundTimesMs:times}};}
for(const w of workouts){
 test(`${w.name}: countdown, rest, pause, duplicate taps and exact round times use one shared engine`,()=>{
  let now=0;const timer=new RoundAmrapTimer(w,()=>now);const advance=ms=>{now+=ms;return timer.snapshot();};timer.start();
  assert.equal(timer.snapshot().countdown,3);assert.equal(timer.completeRound(),false);assert.equal(advance(1000).countdown,2);timer.pause();advance(9999);timer.resume();assert.equal(advance(1000).countdown,1);assert.equal(advance(1000).totalRemainingMs,w.durationSeconds*1000);
  advance(30000);timer.pause();advance(999999);assert.equal(timer.completeRound(),false);timer.resume();advance(40000);assert.equal(timer.completeRound(),true);assert.equal(timer.completeRound(),false);
  assert.equal(advance(7000).restRemainingMs,13000);timer.pause();assert.equal(advance(999999).restRemainingMs,13000);timer.resume();advance(13000);assert.equal(timer.completeRound(),false);advance(80000);assert.equal(timer.completeRound(),true);advance(95000);assert.equal(timer.completeRound(),true);
  assert.deepEqual(timer.snapshot().roundTimesMs,[70000,80000,75000]);const end=advance(w.durationSeconds*1000-265000);assert.equal(end.stage,'complete');assert.equal(end.completedRounds,3);assert.equal(end.elapsedMs,w.durationSeconds*1000);assert.equal(timer.completeRound(),false);
 });
 test(`${w.name}: exact deadline truncates rest and never counts an unfinished or early-ended round`,()=>{
  let now=0;const timer=new RoundAmrapTimer(w,()=>now);timer.start();now=3000+w.durationSeconds*1000-10000;assert.equal(timer.completeRound(),true);now+=10000;assert.equal(timer.snapshot().stage,'complete');assert.equal(timer.snapshot().restRemainingMs,0);assert.equal(timer.snapshot().completedRounds,1);assert.equal(timer.completeRound(),false);
  now=0;const empty=new RoundAmrapTimer(w,()=>now);empty.start();now=3000+w.durationSeconds*1000;assert.equal(empty.snapshot().completedRounds,0);assert.deepEqual(empty.snapshot().roundTimesMs,[]);
  now=0;const early=new RoundAmrapTimer(w,()=>now);early.start();now=4000;early.end();assert.equal(early.completeRound(),false);assert.deepEqual(early.snapshot().roundTimesMs,[]);
 });
 test(`${w.name}: validate its own duration, circuit repetitions and precise results without rewriting legacy data`,()=>{
  const maximum=w.id==='classic-iron'?69:49;assert.equal(partialRepMaximum(w),maximum);
  for(let n=0;n<=maximum;n++)assert.equal(parseRoundAmrapPartialReps(String(n),w),n);
  for(const value of ['', '-1','1.5','1e1',String(maximum+1),null])assert.throws(()=>parseRoundAmrapPartialReps(value,w));
  const record=saved(w,w.id,[70000.125,80000,75000]);assert.deepEqual(roundAmrapFinalResults(record),record.results);
  assert.throws(()=>roundAmrapFinalResults({...record,activeDurationMs:record.activeDurationMs-1}));
  assert.throws(()=>roundAmrapFinalResults({...record,results:{...record.results,partialReps:maximum+1}}));
  assert.throws(()=>roundAmrapFinalResults({...record,results:{...record.results,roundTimesMs:[w.durationSeconds*1000+1,1,1]}}));
 });
}
test('per-WOD records exclude foreign owners, invalid sessions and other durations; monthly calendar still aggregates activity',()=>{
 const records=workouts.flatMap((w,i)=>[saved(w,w.id,[70000+i*1000,80000]),saved(w,`${w.id}-foreign`,[1],'B')]);
 for(const [i,w]of workouts.entries())assert.equal(fastestWorkoutRound(records,r=>r.ownerId==='A',w.id).durationMs,70000+i*1000);
 const analysis=analyzeProgress(records,{year:2026,month:11},r=>r.ownerId==='A');assert.equal(analysis.month.workouts,4);assert.equal(analysis.month.activeDurationMs,2100000);assert.equal(analysis.month.activeDays,1);
});
