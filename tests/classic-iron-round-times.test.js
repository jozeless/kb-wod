import test from 'node:test';
import assert from 'node:assert/strict';
import {classicIron as w} from '../src/data/classic-iron.js';
import {RoundAmrapTimer} from '../src/domain/round-amrap-timer.js';
import {createClassicIronSession, classicIronFinalResults, recordedRoundTimes, fastestRound, formatRoundTime} from '../src/domain/classic-iron-results.js';
import {fastestClassicIronRound} from '../src/domain/classic-iron-progress.js';

function clock(){let now=0;const timer=new RoundAmrapTimer(w,()=>now);timer.start();return {timer,advance(ms){now+=ms;return timer.snapshot();}};}
function saved(id, times, extra={}) {return {...createClassicIronSession(w,null,id,'2026-11-13T12:00:00Z'),activeDurationMs:1200000,completedAt:'2026-11-13T12:20:03Z',status:'completed',ownerId:null,results:{completedRounds:times.length,partialReps:20,roundTimesMs:times},...extra};}

test('first round starts at activity zero, and actual completion times exclude exact rest deadlines even without UI updates',()=>{
  const c=clock();assert.equal(c.timer.completeRound(),false);c.advance(3000);assert.equal(c.timer.completeRound(),false);assert.deepEqual(c.timer.snapshot().roundTimesMs,[]);
  c.advance(70000);assert.equal(c.timer.completeRound(),true);assert.equal(c.timer.completeRound(),false);
  // No render/snapshot is needed at the rest boundary: 70s + 20s + 80s.
  c.advance(100000);assert.equal(c.timer.completeRound(),true);c.advance(95000);assert.equal(c.timer.completeRound(),true);
  assert.deepEqual(c.timer.snapshot().roundTimesMs,[70000,80000,75000]);assert.equal(c.timer.snapshot().elapsedMs,265000);
  c.advance(935000);const end=c.timer.snapshot();assert.equal(end.stage,'complete');assert.equal(end.completedRounds,3);assert.deepEqual(end.roundTimesMs,[70000,80000,75000]);assert.equal(c.timer.completeRound(),false);
});
test('paused time in initial countdown, training and rest never contributes to recorded round times',()=>{
  const c=clock();c.advance(1000);c.timer.pause();c.advance(99999);c.timer.resume();c.advance(2000);
  c.advance(30000);c.timer.pause();c.advance(123456);assert.equal(c.timer.completeRound(),false);c.timer.resume();c.advance(40000);assert.equal(c.timer.completeRound(),true);
  c.advance(7000);c.timer.pause();c.advance(1000000);c.timer.resume();c.advance(13000);c.advance(80000);assert.equal(c.timer.completeRound(),true);
  assert.deepEqual(c.timer.snapshot().roundTimesMs,[70000,80000]);assert.equal(c.timer.snapshot().elapsedMs,170000);
});
test('precise millisecond durations survive snapshots; duplicate/paused/rest presses cannot duplicate or mutate times',()=>{
  const c=clock();c.advance(3000);c.advance(70000.125);assert.equal(c.timer.completeRound(),true);assert.equal(c.timer.completeRound(),false);
  c.advance(20000);assert.equal(c.timer.completeRound(),false);c.advance(80000.875);assert.equal(c.timer.completeRound(),true);
  const copy=c.timer.snapshot().roundTimesMs;assert.deepEqual(copy,[70000.125,80000.875]);copy[0]=1;assert.deepEqual(c.timer.snapshot().roundTimesMs,[70000.125,80000.875]);
});
test('deadline during rest ends immediately with one time; zero rounds and unfinished/partial final rounds add no durations',()=>{
  const c=clock();c.advance(1193000);assert.equal(c.timer.completeRound(),true);c.advance(10000);assert.equal(c.timer.snapshot().stage,'complete');assert.deepEqual(c.timer.snapshot().roundTimesMs,[1190000]);assert.equal(c.timer.completeRound(),false);
  const zero=clock();zero.advance(1203000);assert.deepEqual(zero.timer.snapshot().roundTimesMs,[]);assert.equal(zero.timer.snapshot().completedRounds,0);
});
test('new saved payload has exactly rounds, partial reps and precise validated times; legacy omission remains omitted',()=>{
  const record=saved('timed',[70000.125,80000,75000]);assert.deepEqual(classicIronFinalResults(record),{completedRounds:3,partialReps:20,roundTimesMs:[70000.125,80000,75000]});
  const zero=saved('zero',[]);assert.deepEqual(classicIronFinalResults(zero),{completedRounds:0,partialReps:20,roundTimesMs:[]});
  const old=saved('legacy',[]);old.results={completedRounds:8,partialReps:20};const before=structuredClone(old);assert.equal(recordedRoundTimes(old.results,1200000),null);assert.deepEqual(classicIronFinalResults(old),old.results);assert.deepEqual(old,before);
  for(const times of [null,{},'70000',[],[0],[-1],[Infinity],[NaN],['70000'],[1200001],Array(1),[70000,80000]]){
    const bad=saved('bad',[1]);bad.results.roundTimesMs=times;assert.throws(()=>classicIronFinalResults(bad),/one valid positive duration/);
  }
  const early=saved('early',[70000]);early.activeDurationMs=1199999;assert.throws(()=>classicIronFinalResults(early),/whole workout/);
});
test('fastest comparisons retain precision, use the first tied round, and round only the MM:SS display',()=>{
  assert.deepEqual(fastestRound([70000,80000,75000]),{durationMs:70000,roundNumber:1});assert.deepEqual(fastestRound([70000.2,70000.1,70000.1]),{durationMs:70000.1,roundNumber:2});assert.equal(fastestRound([]),null);
  assert.equal(formatRoundTime(70000),'01:10');assert.equal(formatRoundTime(80000),'01:20');assert.equal(formatRoundTime(75000),'01:15');assert.equal(formatRoundTime(70499.9),'01:10');assert.equal(formatRoundTime(70500),'01:11');
});
test('all-time fastest uses saved authorized Classic Iron full rounds only, with original date and round number',()=>{
  const old=saved('old',[]);old.results={completedRounds:8,partialReps:69};
  const good=saved('good',[70000,65000.5,75000],{startedAt:'2026-10-01T10:00:00Z',ownerId:'A'});
  const earlier=saved('earlier',[80000],{ownerId:'A'});
  const other=saved('other',[1],{workoutId:'other'});
  const mismatched=saved('mismatch',[1],{workoutVersion:2});
  const invalid=saved('invalid',[0]);const short=saved('short',[1],{activeDurationMs:1000});
  const records=[old,other,mismatched,invalid,short,saved('draft',[1],{status:'draft'}),saved('foreign',[1],{ownerId:'B'}),earlier,good,structuredClone(good)];
  const before=structuredClone(records);const result=fastestClassicIronRound(records,r=>!r.ownerId||r.ownerId==='A');assert.deepEqual(result,{durationMs:65000.5,roundNumber:2,sessionId:'good',startedAt:'2026-10-01T10:00:00Z'});assert.deepEqual(records,before);
  assert.equal(fastestClassicIronRound(records,()=>false),null);assert.equal(fastestClassicIronRound([old,saved('zero',[])],()=>true),null);
});
