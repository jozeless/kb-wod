import {installBeepSpy} from './helpers/timer-beeps.js';
import {test,expect} from '@playwright/test';
async function nativeProbe(page){
 await page.addInitScript(()=>{
  const Native=window.AudioContext;window.nativeBeeps={notes:[],decoded:0,buffers:0};
  window.AudioContext=class extends Native{
   decodeAudioData(...args){window.nativeBeeps.decoded++;return super.decodeAudioData(...args);}
   createBufferSource(){window.nativeBeeps.buffers++;return super.createBufferSource();}
   createOscillator(){const node=super.createOscillator(),note={frequency:0,start:0,end:0};const start=node.start.bind(node),stop=node.stop.bind(node);node.start=(at=0)=>{note.start=at;note.frequency=node.frequency.value;window.nativeBeeps.notes.push(note);return start(at);};node.stop=at=>{note.end=at??this.currentTime;return at===undefined?stop():stop(at);};return node;}
  };
 });
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
}
async function start(page){await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await expect(page.getByRole('button',{name:'Sound: On'})).toBeVisible();await page.clock.runFor(3000);}
test('native Web Audio starts and changes EMOM with synthesized notes only and no overlap',async({page})=>{
 await nativeProbe(page);await page.goto('./#workout/focus-001-upper-abs/1');await start(page);await page.clock.fastForward(59900);await page.clock.runFor(100);const probe=await page.evaluate(()=>window.nativeBeeps);expect(probe.notes.map(n=>n.frequency)).toEqual([640,760]);expect(probe.decoded).toBe(0);expect(probe.buffers).toBe(0);const audible=probe.notes.filter(n=>n.end>n.start).sort((a,b)=>a.start-b.start);for(let i=1;i<audible.length;i++)expect(audible[i].start).toBeGreaterThanOrEqual(audible[i-1].end);
});
test('synthesized beeps work offline; pause, mute and re-enable never replay a pattern; archived WAVs remain cached',async({page,context})=>{
 await nativeProbe(page);await page.goto('./#workout/focus-001-upper-abs/1');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const archived=await page.evaluate(async()=>{const cache=await caches.open('kb2-static-v25');return Promise.all(['start','minute'].map(async name=>{const response=await cache.match(new URL(`./assets/audio/${name}.wav`,location.href));return response?(await response.arrayBuffer()).byteLength:0;}));});expect(archived).toEqual([488264,325128]);
 await context.setOffline(true);await start(page);await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(300000);await page.getByRole('button',{name:'Resume',exact:true}).click();expect(await page.evaluate(()=>window.nativeBeeps.notes.length)).toBe(1);await page.getByRole('button',{name:'Sound: On'}).click();await page.clock.fastForward(59900);await page.clock.runFor(100);expect(await page.evaluate(()=>window.nativeBeeps.notes.length)).toBe(1);await page.getByRole('button',{name:'Sound: Off'}).click();await page.clock.runFor(100);expect(await page.evaluate(()=>window.nativeBeeps.notes.length)).toBe(1);await page.clock.fastForward(59800);await page.clock.runFor(100);expect(await page.evaluate(()=>window.nativeBeeps.notes.map(n=>n.frequency))).toEqual([640,760]);await context.setOffline(false);
});
test('real offline audio rendering confirms six pattern shapes, audible peaks, envelopes and silent gaps',async({page})=>{
 await page.goto('./');const rendered=await page.evaluate(async()=>{
  const {createWorkoutAudio,cuePatterns}=await import('./src/platform/workout-audio.js');const Original=window.AudioContext,results=[];
  try{for(const type of Object.keys(cuePatterns)){let offline;const starts=[];window.AudioContext=class{state='running';currentTime=0;constructor(){offline=new OfflineAudioContext(1,Math.ceil(1.6*44100),44100);this.destination=offline.destination;}resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return offline.createGain();}createOscillator(){const node=offline.createOscillator(),start=node.start.bind(node);node.start=at=>{starts.push(at);return start(at);};return node;}};
   const audio=createWorkoutAudio();await audio.enable();audio.cue(type);const buffer=await offline.startRendering(),data=buffer.getChannelData(0),pattern=cuePatterns[type];let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));const edges=starts.map((at,i)=>({start:Math.abs(data[Math.round(at*44100)]),after:Math.abs(data[Math.ceil((at+pattern.durations[i]+.001)*44100)])}));const gaps=starts.slice(1).map((at,i)=>Math.abs(data[Math.round((starts[i]+pattern.durations[i]+at)/2*44100)]));results.push({type,peak,starts,edges,gaps});audio.dispose();}
  }finally{window.AudioContext=Original;}return results;
 });expect(rendered.map(r=>r.starts.length)).toEqual([1,1,2,1,3,2]);for(const result of rendered){expect(result.peak).toBeGreaterThan(.20);expect(result.peak).toBeLessThan(.35);expect(result.edges.every(e=>e.start<.003&&e.after<.00001)).toBe(true);expect(result.gaps.every(value=>value<.00001)).toBe(true);}
});
test.describe('runtime has no WAV dependency',()=>{
 test.use({serviceWorkers:'block'});
 test('missing historical files cannot affect synthesized playback or the timer',async({page})=>{
  let requests=0;await page.route('**/assets/audio/*.wav',route=>{requests++;return route.abort();});await nativeProbe(page);await page.goto('./#workout/hybrid-001-strength-sweat/1');await start(page);await page.clock.fastForward(59900);await page.clock.runFor(100);expect(requests).toBe(0);expect(await page.evaluate(()=>window.nativeBeeps.notes.map(n=>n.frequency))).toEqual([640,760]);expect(await page.evaluate(()=>window.nativeBeeps.buffers)).toBe(0);await expect(page.locator('.total-time')).toHaveText('Total remaining: 19:00');
 });
});

test('recovered Sound On can be muted before Resume, without unlocking or replaying START',async({page})=>{
 await installBeepSpy(page);await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));await page.goto('./#workout/monday-paranoid/3');await start(page);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();page.on('dialog',d=>d.accept());await page.reload();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sound: On'}).click();await expect(page.getByRole('button',{name:'Sound: Off'})).toBeVisible();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.fastForward(59900);await page.clock.runFor(100);expect(await page.evaluate(()=>window.beepNotes)).toEqual([]);await page.getByRole('button',{name:'Sound: Off'}).click();expect(await page.evaluate(()=>window.beepNotes)).toEqual([]);await page.clock.fastForward(59900);await page.clock.runFor(100);expect(await page.evaluate(()=>window.beepNotes.map(n=>n.frequency))).toEqual([760]);
});

test('unresolved mobile audio unlock leaves Sound Off and the workout countdown continues',async({page})=>{
 await page.addInitScript(()=>{window.AudioContext=class{state='suspended';resume(){return new Promise(()=>{});}close(){return Promise.resolve();}};window.webkitAudioContext=undefined;});await page.goto('./#workout/monday-paranoid/3');await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await expect(page.getByRole('button',{name:'Sound: Off'})).toBeVisible();await expect(page.locator('.phase-clock')).toHaveText(/^(GO|00:5\d)$/,{timeout:5000});
});

test('saving final results does not cut off the two-note COMPLETE pattern',async({page})=>{
 await installBeepSpy(page);await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));await page.goto('./#workout/monday-paranoid/3');await start(page);await page.clock.fastForward(1269900);await page.clock.runFor(100);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const complete=await page.evaluate(()=>window.beepNotes.filter(n=>n.frequency===620));expect(complete).toHaveLength(2);expect(complete.every(n=>n.stops.length===1)).toBe(true);
});
