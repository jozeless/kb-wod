import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkoutAudio,cuePatterns} from '../src/platform/workout-audio.js';
import {createCueTracker} from '../src/domain/workout-cues.js';
function mock(t){const old=globalThis.window,notes=[],contexts=[];
 class Audio{state='running';currentTime=0;destination={};constructor(){contexts.push(this);}resume(){return Promise.resolve();}close(){return Promise.resolve();}
  createOscillator(){const node={frequency:{value:0},connect(){},disconnect(){node.disconnected=true;},start(time){node.startAt=time;notes.push(node);},stop(time){node.stops??=[];node.stops.push(time??0);}};return node;}
  createGain(){const calls=[],gain={value:0,setValueAtTime(value,time){calls.push(['set',value,time]);},linearRampToValueAtTime(value,time){calls.push(['ramp',value,time]);},cancelAndHoldAtTime(time){calls.push(['hold',time]);}};return {gain,calls,connect(){},disconnect(){}};}
 }
 globalThis.window={AudioContext:Audio};t.after(()=>{globalThis.window=old;});return {notes,contexts};}
test('six recognizable sine patterns have the required lengths, pitch contrast, gaps and zero-ended envelopes',async t=>{
 const {notes,contexts}=mock(t);const audio=createWorkoutAudio();t.after(()=>audio.dispose());await audio.enable();
 const shape={start:[1,.38],minute:[1,.12],rest:[2,.11],work:[1,.23],finisher:[3,.36],complete:[2,.40]};
 for(const [type,[count,lastLength]]of Object.entries(shape)){contexts[0].currentTime+=5;const before=notes.length;audio.cue(type);const group=notes.slice(before);assert.equal(group.length,count);assert.equal(group[0].type,'sine');assert.ok(Math.abs(group.at(-1).stops[0]-group.at(-1).startAt-.005-lastLength)<1e-9);for(let i=1;i<group.length;i++)assert.ok(group[i].startAt>group[i-1].stops[0]);}
 assert.ok(cuePatterns.work.frequency>cuePatterns.minute.frequency);assert.ok(cuePatterns.start.durations[0]>cuePatterns.minute.durations[0]);assert.ok(cuePatterns.finisher.durations[2]>cuePatterns.finisher.durations[0]*2);assert.ok(Object.values(cuePatterns).every(p=>p.peak>0.2&&p.peak<0.35));
});
test('new patterns replace current/pending notes; mute, pause-style silence and dispose cancel all scheduled beeps',async t=>{
 const {notes,contexts}=mock(t);const audio=createWorkoutAudio();await audio.enable();audio.cue('finisher');assert.equal(notes.length,3);contexts[0].currentTime=.05;audio.cue('work');assert.equal(notes.length,4);for(const note of notes.slice(0,3))assert.equal(note.stops.length,2);assert.ok(notes[3].startAt>=notes[0].stops.at(-1));
 await audio.toggle();const count=notes.length;audio.cue('rest');assert.equal(notes.length,count);await audio.toggle();assert.equal(notes.length,count);audio.cue('rest');audio.silence();assert.ok(notes.slice(-2).every(n=>n.stops.length===2));audio.dispose();await audio.enable();assert.equal(audio.enabled,false);audio.cue('start');assert.equal(notes.length,count+2);
});
test('blocked/suspended audio and late enable never prevent timer callers or re-enable after mute',async t=>{
 const old=globalThis.window;t.after(()=>globalThis.window=old);globalThis.window={AudioContext:class{constructor(){throw Error('blocked');}}};const denied=createWorkoutAudio();await denied.enable();assert.equal(denied.enabled,false);assert.doesNotThrow(()=>denied.cue('start'));denied.dispose();
 let resume;globalThis.window={AudioContext:class{state='suspended';resume(){return new Promise(r=>resume=r);}close(){return Promise.resolve();}}};const audio=createWorkoutAudio();const pending=audio.enable();await audio.toggle();resume();await pending;assert.equal(audio.enabled,false);audio.dispose();
});
test('REST/WORK override simultaneous minute boundaries; transitions are silent and final Thruster wins over WORK',()=>{
 const tracker=createCueTracker();const base={status:'running',stage:'exercise',elapsedMs:59900,segmentIndex:0,kind:'WORK',phase:{id:'abs'}};tracker.next(base);
 const rest={...base,elapsedMs:60000,segmentIndex:1,kind:'REST'};assert.equal(tracker.next(rest),'rest');assert.equal(tracker.next(rest),null);tracker.next({...rest,elapsedMs:119900});assert.equal(tracker.next({...rest,elapsedMs:120000,segmentIndex:2,kind:'WORK'}),'work');
 tracker.next({...base,elapsedMs:479900,kind:'EMOM'});assert.equal(tracker.next({...base,elapsedMs:480000,segmentIndex:3,kind:'TRANSITION',phase:{id:'transition'}}),null);tracker.next({...base,elapsedMs:484900,segmentIndex:3,kind:'TRANSITION',phase:{id:'transition'}});assert.equal(tracker.next({...base,elapsedMs:485000,segmentIndex:4,kind:'WORK'}),'work');
 tracker.next({...base,elapsedMs:1209900});assert.equal(tracker.next({...base,elapsedMs:1210000,segmentIndex:5,kind:'AMRAP_REPS',phase:{id:'finisher'}}),'finisher');tracker.next({...base,elapsedMs:1269900});assert.equal(tracker.next({...base,elapsedMs:1270000,stage:'complete'}),'complete');
});
test('no elapsed-minute/tick sounds within an exercise, and late completion/foreground catch-up are consumed silently',()=>{
 const tracker=createCueTracker(),s={status:'running',stage:'exercise',elapsedMs:59000,remainingMs:2000,segmentIndex:1,kind:'AMRAP_REPS',phase:{id:'finisher'}};tracker.next(s);assert.equal(tracker.next({...s,elapsedMs:60000,remainingMs:1000}),null);assert.equal(tracker.next({...s,elapsedMs:120000,stage:'complete'}),null);assert.equal(tracker.next({...s,elapsedMs:120000,stage:'complete'}),null);
});

test('a browser that never resolves resume cannot leave workout initialization waiting indefinitely',async t=>{
 const old=globalThis.window;t.after(()=>globalThis.window=old);globalThis.window={AudioContext:class{state='suspended';resume(){return new Promise(()=>{});}close(){return Promise.resolve();}}};const audio=createWorkoutAudio();t.after(()=>audio.dispose());await audio.enable();assert.equal(audio.enabled,false);assert.doesNotThrow(()=>audio.cue('start'));
});
