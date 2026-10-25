import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkoutTimer } from '../src/domain/workout-timer.js';
import { createCueTracker } from '../src/domain/workout-cues.js';
import { focus001 } from '../src/data/focus-001-upper-abs.js';
import { parseWeight, readWeight, writeWeight, weightKey } from '../src/storage/weight-preferences.js';
function cues() {
 let now=0;const engine=new WorkoutTimer(focus001,()=>now);const tracker=createCueTracker();engine.start();tracker.next(engine.snapshot());
 return {engine, at(time,audible=true){now=time;return tracker.next(engine.snapshot(),audible);}};
}
test('EMOM changes give MINUTE; intervals give REST/WORK; completion is unique',()=>{
 const c=cues();c.at(2900);assert.equal(c.at(3000),'start');assert.equal(c.at(3100),null);
 for(let minute=1;minute<20;minute++){c.at(3000+minute*60000-100);assert.equal(c.at(3000+minute*60000),minute<10?'minute':'work');assert.equal(c.at(3000+minute*60000),null);}
 c.at(1202900);assert.equal(c.at(1203000),'complete');assert.equal(c.at(1203100),null);
});
test('no ticks, resume repeats or replay of late/hidden boundaries',()=>{
 const c=cues();c.at(3000);c.at(59900);assert.equal(c.at(60000),null);c.engine.pause();assert.equal(c.at(60000),null);c.engine.resume();assert.equal(c.at(60000),null);assert.equal(c.at(61000),null);
 c.at(602900);assert.equal(c.at(603000),'work');c.at(642900);assert.equal(c.at(643000),'rest');assert.equal(c.at(843000),null);assert.equal(c.at(843100),null);c.at(902900);assert.equal(c.at(903000,false),null);assert.equal(c.at(903100),null);
});
test('weights accept empty, zero and decimals, reject invalid/negative values',()=>{
 assert.equal(parseWeight(''),null);assert.equal(parseWeight('0'),0);assert.equal(parseWeight('12.5'),12.5);
 for(const raw of ['-1','Infinity','NaN','abc'])assert.throws(()=>parseWeight(raw));
});
test('weight preferences are independent by exercise, workout and version, without touching other storage',()=>{
 const entries=new Map([['kb2.weekly-plan.v1','plan'],['kbwod_history','legacy'],['kb2.sessions.v1','history']]);
 const storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 const a=focus001.exercises[0],b=focus001.exercises[1];const version2={...focus001,version:2};const other={...focus001,id:'other'};
 assert.equal(readWeight(storage,focus001,a),'');
 writeWeight(storage,focus001,a,'12.5');writeWeight(storage,focus001,b,'0');writeWeight(storage,version2,a,'24');writeWeight(storage,other,a,'4');
 assert.equal(readWeight(storage,focus001,a),'12.5');assert.equal(readWeight(storage,focus001,b),'0');assert.equal(readWeight(storage,version2,a),'24');assert.equal(readWeight(storage,other,a),'4');
 assert.throws(()=>writeWeight(storage,focus001,a,'-2'));assert.equal(readWeight(storage,focus001,a),'12.5');
 writeWeight(storage,focus001,a,'');assert.equal(readWeight(storage,focus001,a),'');assert.equal(readWeight(storage,focus001,b),'0');
 assert.equal(entries.get('kb2.weekly-plan.v1'),'plan');assert.equal(entries.get('kbwod_history'),'legacy');assert.equal(entries.get('kb2.sessions.v1'),'history');
 entries.set(weightKey(focus001,a),'broken');assert.throws(()=>readWeight(storage,focus001,a));assert.equal(entries.get(weightKey(focus001,a)),'broken');
});
