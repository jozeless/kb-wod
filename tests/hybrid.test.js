import test from 'node:test';
import assert from 'node:assert/strict';
import { hybrid001 } from '../src/data/hybrid-001-strength-sweat.js';
import { compileWorkout, WorkoutTimer } from '../src/domain/workout-timer.js';
import { createCueTracker } from '../src/domain/workout-cues.js';
import { createSamplePreloader } from '../src/platform/audio-samples.js';

test('Hybrid compiles 8 EMOM + 8 intervals + a continuous 4-minute AMRAP',()=>{
 const timeline=compileWorkout(hybrid001);assert.equal(timeline.durationMs,1200000);assert.equal(timeline.segments.length,25);
 for(let i=0;i<8;i++){const s=timeline.segments[i];assert.equal(s.kind,'EMOM');assert.equal(s.exercise.id,hybrid001.phases[0].exerciseIds[i%2]);assert.equal(s.round,Math.floor(i/2)+1);}
 assert.equal(timeline.segments[8].startMs,480000);assert.equal(timeline.segments[23].kind,'REST');assert.equal(timeline.segments[23].endMs,960000);
 const amrap=timeline.segments.at(-1);assert.equal(amrap.startMs,960000);assert.equal(amrap.endMs,1200000);assert.equal(amrap.kind,'AMRAP');assert.equal(amrap.exercise,null);assert.equal(amrap.round,null);assert.deepEqual(amrap.circuit.map(ex=>ex.id),hybrid001.phases[2].exerciseIds);
 assert.equal(hybrid001.exercises.length,9);assert.equal(hybrid001.demo,false);assert.equal(hybrid001.warmup.included,false);
});
test('automatic block edges, continuous AMRAP, pause/resume and exact final duration',()=>{
 let time=0;const engine=new WorkoutTimer(hybrid001,()=>time);engine.start();
 const at=t=>{time=t;return engine.snapshot()};
 assert.equal(at(2999).countdown,1);assert.equal(at(3000).remainingMs,60000);
 assert.equal(at(482999).phase.id,'strength');assert.equal(at(483000).phase.id,'conditioning');assert.equal(at(483000).remainingMs,40000);
 assert.equal(at(523000).kind,'REST');assert.equal(at(543000).exercise.id,'alternating-clean');
 assert.equal(at(962999).kind,'REST');let s=at(963000);assert.equal(s.kind,'AMRAP');assert.equal(s.remainingMs,240000);
 const index=s.segmentIndex;assert.equal(at(1023000).segmentIndex,index);assert.equal(at(1023000).remainingMs,180000);
 engine.pause();assert.equal(at(1923000).remainingMs,180000);engine.resume();
 s=at(2102999);assert.equal(s.kind,'AMRAP');assert.equal(s.remainingMs,1);
 assert.equal(at(2103000).stage,'complete');assert.equal(engine.snapshot().elapsedMs,1200000);
});
test('Hybrid uses MINUTE for EMOM only and WORK for conditioning/circuit starts',()=>{
 let time=0;const engine=new WorkoutTimer(hybrid001,()=>time),cues=createCueTracker();engine.start();cues.next(engine.snapshot());const at=t=>{time=t;return cues.next(engine.snapshot());};at(2900);assert.equal(at(3000),'start');
 for(let m=1;m<20;m++){at(3000+m*60000-100);assert.equal(at(3000+m*60000),m<8?'minute':m<=16?'work':null);}
 at(1202900);assert.equal(at(1203000),'complete');assert.equal(at(1203000),null);
});
test('sample preloader requests each local WAV once and tolerates unavailable files',async()=>{
 const requests=[];const preloader=createSamplePreloader(async url=>{requests.push(url);return {ok:!url.endsWith('minute.wav'),arrayBuffer:async()=>new ArrayBuffer(8)}});
 preloader.preload();const [start,minute]=await Promise.all([preloader.get('start'),preloader.get('minute')]);
 assert.equal(start.byteLength,8);assert.equal(minute,null);await preloader.get('start');assert.equal(requests.length,2);assert.ok(requests.every(url=>url.includes('/assets/audio/')));
 const offline=createSamplePreloader(async()=>{throw Error('offline')});assert.equal(await offline.get('start'),null);
});
