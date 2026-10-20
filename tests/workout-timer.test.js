import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkoutTimer, compileWorkout, formatTime } from '../src/domain/workout-timer.js';
import { focus001 } from '../src/data/focus-001-upper-abs.js';
function clock() {
  let time = 0;
  const engine = new WorkoutTimer(focus001, () => time);
  return { engine, at: value => { time = value; return engine.snapshot(); } };
}
test('timeline uses the immutable definition, including final ABS rest', () => {
 const before=JSON.stringify(focus001); const t=compileWorkout(focus001);
 assert.equal(t.durationMs,1200000);assert.equal(t.segments.length,30);
 assert.equal(t.segments[10].startMs,600000);assert.equal(t.segments.at(-1).kind,'REST');
 assert.equal(t.segments.at(-1).endMs,1200000);assert.equal(JSON.stringify(focus001),before);
 assert.throws(()=>compileWorkout({...focus001,durationSeconds:1}));
 const other=structuredClone(focus001);other.phases[0].format='unknown';assert.throws(()=>compileWorkout(other));
});
test('idle does not autostart; 3,2,1 then GO with no added workout time', () => {
 const c=clock();assert.equal(c.at(10000).status,'idle');assert.equal(c.engine.snapshot().elapsedMs,0);
 c.engine.start();assert.equal(c.engine.snapshot().countdown,3);
 assert.equal(c.at(11000).countdown,2);assert.equal(c.at(12000).countdown,1);
 const s=c.at(13000);assert.equal(s.go,true);assert.equal(s.elapsedMs,0);assert.equal(s.remainingMs,60000);assert.equal(s.totalRemainingMs,1200000);
});
test('all ten EMOM minutes and immediate Upper to ABS boundary', () => {
 const c=clock();c.engine.start();
 for(let i=0;i<10;i++) {
  const s=c.at(3000+i*60000);assert.equal(s.kind,'EMOM');assert.equal(s.interval,i);assert.equal(s.round,Math.floor(i/5)+1);
  assert.equal(s.exercise.id,focus001.phases[0].exerciseIds[i%5]);assert.equal(s.remainingMs,60000);
  assert.equal(c.at(3000+(i+1)*60000-1).remainingMs,1);
 }
 const s=c.at(603000);assert.equal(s.kind,'WORK');assert.equal(s.phase.id,'abs');assert.equal(s.interval,0);assert.equal(s.remainingMs,40000);assert.equal(s.totalRemainingMs,600000);
});
test('all ten ABS intervals: exact work/rest edges and next exercise', () => {
 const c=clock();c.engine.start();
 for(let i=0;i<10;i++) {
  const start=603000+i*60000;let s=c.at(start);assert.equal(s.kind,'WORK');assert.equal(s.interval,i);assert.equal(s.round,Math.floor(i/5)+1);
  assert.equal(s.exercise.id,focus001.phases[1].exerciseIds[i%5]);
  assert.equal(c.at(start+39999).kind,'WORK');s=c.at(start+40000);assert.equal(s.kind,'REST');assert.equal(s.remainingMs,20000);
  assert.equal(s.nextExercise?.id??null,i===9?null:focus001.phases[1].exerciseIds[(i+1)%5]);
  assert.equal(c.at(start+59999).kind,'REST');
 }
 assert.equal(c.at(1202999).stage,'exercise');const final=c.at(1203000);assert.equal(final.stage,'complete');assert.equal(final.status,'complete');assert.equal(final.progress,1);
 assert.equal(c.at(1300000).elapsedMs,1200000);
});
test('pause/resume freezes countdown and exercise position without skipping', () => {
 const c=clock();c.engine.start();c.at(1500);c.engine.pause();assert.equal(c.at(80000).countdown,2);
 c.engine.resume();assert.equal(c.at(81500).elapsedMs,0);
 c.at(91500);c.engine.pause();let s=c.at(500000);assert.equal(s.elapsedMs,10000);assert.equal(s.remainingMs,50000);
 c.engine.resume();s=c.at(550000);assert.equal(s.interval,1);assert.equal(s.remainingMs,60000);
 c.engine.end();const stopped=c.at(999999);assert.equal(stopped.status,'ended');assert.equal(stopped.elapsedMs,60000);
});
test('late visual ticks reconstruct time and Date.now cannot affect engine', () => {
 const c=clock();c.engine.start();const s=c.at(903500);
 assert.equal(s.phase.id,'abs');assert.equal(s.round,2);assert.equal(s.interval,5);assert.equal(s.remainingMs,39500);
 assert.equal(formatTime(1),'00:01');assert.equal(formatTime(1200000),'20:00');assert.equal(formatTime(-1),'00:00');
});
