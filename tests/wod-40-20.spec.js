import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {verifyWorkoutBeeps, installBeepSpy} from './helpers/timer-beeps.js';
const releases=[['monday-paranoid',4,3,'Monday Paranoid',1270],['tuesday-of-spades',2,1,'Tuesday of Spades',1200],['thursday-bells',2,1,'Thursday Bells',1270],['friday-to-black',2,1,'Friday To Black',1200]];
const artifactRoot='/workspace/artifacts/wod-40-20-louder-audio';
async function setup(page){await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});}
async function clock(page){await page.clock.install({time:new Date('2026-11-02T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-02T12:00:01Z'));}
async function start(page,id,v){await page.goto(`./#workout/${id}/${v}`);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');}
const savedDraft=page=>expect(page.getByText('Draft saved locally.',{exact:true})).toHaveCount(0);
const records=page=>page.evaluate(async()=>(await import('./src/storage/session-store.js')).listSessions());

test('Library selects newest releases while old weekly references remain untouched until each explicit Change workout',async({page})=>{
 await setup(page);await page.goto('./#today');const plan={Monday:{workoutId:releases[0][0],version:3},Tuesday:{workoutId:releases[1][0],version:1},Thursday:{workoutId:releases[2][0],version:1},Friday:{workoutId:releases[3][0],version:1}};
 await page.evaluate(plan=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan)),plan);await page.reload();
 for(const [i,[id,v,old,name]]of releases.entries()){
  const day=Object.keys(plan)[i];await page.getByRole('region',{name:day,exact:true}).getByRole('button',{name:`View workout: ${name}`,exact:true}).click();await expect(page).toHaveURL(new RegExp(`${id}/${old}$`));
  await page.getByRole('link',{name:'Library',exact:true}).click();await page.getByRole('button',{name:`View workout: ${name}`,exact:true}).click();await expect(page).toHaveURL(new RegExp(`${id}/${v}$`));
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(plan);await page.getByRole('link',{name:'Today',exact:true}).click();
 }
 for(const [i,[id,v,,name]]of releases.entries()) {const day=Object.keys(plan)[i];await page.getByRole('region',{name:day,exact:true}).getByRole('button',{name:'Change workout',exact:true}).click();await page.getByRole('button',{name:`Assign to ${day}: ${name}`,exact:true}).click();plan[day]={workoutId:id,version:v};expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(plan);}
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(plan);
});
for(const [id,v,,name,duration]of releases)test(`${name} v${v}: every semantic boundary and finisher remain correct; explicit final save records real results`,async({page})=>{
 await setup(page);await verifyWorkoutBeeps(page,id,v);await savedDraft(page);
 const first=page.getByRole('spinbutton',{name:/actual weight \(kg\)$/i}).first();await first.fill('12.5');
 if(id==='monday-paranoid')await page.getByLabel('Thruster repetitions',{exact:true}).fill('17');
 else if(id==='thursday-bells')await page.getByLabel('Total finisher steps',{exact:true}).fill('81');
 else {await page.getByLabel('Complete finisher rounds',{exact:true}).fill('3');if(id==='friday-to-black'){await page.getByLabel('Floor Press — Left arm repetitions',{exact:true}).fill('6');await page.getByLabel('Floor Press — Right arm repetitions',{exact:true}).fill('5');await expect(page.getByText(/fourth Floor Press work interval, 06:00–06:40/)).toBeVisible();}}
 await page.getByRole('button',{name:'Save Workout',exact:true}).evaluate(b=>{b.click();b.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const saved=await records(page);expect(saved).toHaveLength(1);expect(saved[0].status).toBe('completed');expect(saved[0].workoutVersion).toBe(v);expect(saved[0].activeDurationMs).toBe(duration*1000);expect(Object.values(saved[0].results.exerciseWeights)[0]).toBe(12.5);expect(saved[0].workoutSnapshot.audioProfile).toBe('clear-loud-v1');
 await page.getByRole('button',{name:'View saved session',exact:true}).click();if(id==='friday-to-black')await expect(page.getByText(/Fourth Floor Press working interval \(06:00–06:40\)/)).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
});

test('native audio is substantially stronger with bounded peaks, click-free envelopes and the same distinct pattern shapes',async({page},info)=>{
 await setup(page);await page.goto('./');const measurements=await page.evaluate(async()=>{
  const {createWorkoutAudio,cuePatterns,loudCuePatterns}=await import('./src/platform/workout-audio.js'),Original=window.AudioContext;const results=[];
  try{for(const name of Object.keys(cuePatterns))for(const profile of [undefined,'clear-loud-v1']) {
   let context;const starts=[],types=[];window.AudioContext=class{state='running';currentTime=0;constructor(){context=new OfflineAudioContext(1,Math.ceil(1.6*48000),48000);this.destination=context.destination;}resume(){return Promise.resolve();}close(){return Promise.resolve();}createGain(){return context.createGain();}createOscillator(){const node=context.createOscillator(),start=node.start.bind(node);node.start=at=>{starts.push(at);types.push(node.type);return start(at);};return node;}};
   const audio=createWorkoutAudio({profile});await audio.enable();audio.cue(name);const data=(await context.startRendering()).getChannelData(0),pattern=(profile?loudCuePatterns:cuePatterns)[name];let peak=0,power=0;
   for(const sample of data){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
   const edges=starts.map((s,i)=>[Math.abs(data[Math.round(s*48000)]),Math.abs(data[Math.ceil((s+pattern.durations[i]+.001)*48000)])]);
   const gaps=starts.slice(1).map((s,i)=>Math.abs(data[Math.round((starts[i]+pattern.durations[i]+s)/2*48000)]));
   results.push({name,profile:profile||'historical',peak,rms:Math.sqrt(power/data.length),starts,types,edges,gaps});audio.dispose();
  }}finally{window.AudioContext=Original;}return results;
 });
 for(const old of measurements.filter(m=>m.profile==='historical')) {const loud=measurements.find(m=>m.name===old.name&&m.profile!=='historical');expect(old.peak).toBeGreaterThan(.2);expect(old.peak).toBeLessThan(.3);expect(loud.peak).toBeGreaterThan(.6);expect(loud.peak).toBeLessThan(.79);expect(loud.rms/old.rms).toBeGreaterThan(2);expect(loud.starts).toEqual(old.starts);expect(loud.types.every(t=>t==='triangle')).toBe(true);expect(old.types.every(t=>t==='sine')).toBe(true);expect(loud.edges.every(([a,b])=>a<.003&&b<.00001)).toBe(true);expect(loud.gaps.every(g=>g<.00001)).toBe(true);}
 await fs.mkdir(artifactRoot,{recursive:true});await fs.writeFile(`${artifactRoot}/audio-${info.project.name}.json`,JSON.stringify(measurements,null,2));
});

test('new audio unlocks in the user gesture, silences on pause/exit, and never queues background or resume cues',async({page})=>{
 await setup(page);await installBeepSpy(page);await page.addInitScript(()=>{window.profileNotes=[];window.gainPeaks=[];window.unlocks=[];const Audio=window.AudioContext;window.AudioContext=class extends Audio {resume(){window.unlocks.push(navigator.userActivation.isActive);return Promise.resolve();}createOscillator(){const source=super.createOscillator(),start=source.start.bind(source);source.start=at=>{window.profileNotes.push(source.type);return start(at);};return source;}createGain(){const gain=super.createGain();gain.gain.linearRampToValueAtTime=value=>window.gainPeaks.push(value);return gain;}};});
 await clock(page);await start(page,'monday-paranoid',4);await page.clock.runFor(3000);expect(await page.evaluate(()=>unlocks)).toEqual([true]);expect(await page.evaluate(()=>profileNotes)).toEqual(['triangle']);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const before=await page.evaluate(()=>beepNotes.length);await page.clock.fastForward(600000);expect(await page.evaluate(()=>beepNotes.length)).toBe(before);await page.getByRole('button',{name:'Resume',exact:true}).click();expect(await page.evaluate(()=>beepNotes.length)).toBe(before);
 await page.clock.fastForward(39900);await page.clock.runFor(100);expect(await page.evaluate(()=>beepNotes.map(n=>n.frequency))).toEqual([640,520,520]);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.fastForward(180000);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});expect(await page.evaluate(()=>beepNotes.length)).toBe(3);
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'End Workout',exact:true}).click();const count=await page.evaluate(()=>beepNotes.length);await page.clock.fastForward(2000000);expect(await page.evaluate(()=>beepNotes.length)).toBe(count);expect(await page.evaluate(()=>gainPeaks.every(v=>v>=0&&v<=.78))).toBe(true);
});

test('historical Friday labels and saved results remain intact; Progress compares weights but separates 40s/60s final sets',async({page})=>{
 await setup(page);await clock(page);await page.goto('./#library');const old=await page.evaluate(async()=>{const {savedRecord}=await import('./tests/helpers/progress-records.js'),{completeSession}=await import('./src/storage/session-store.js');const r=savedRecord({id:'old-friday',workoutId:'friday-to-black',version:1,startedAt:'2026-11-02T10:00:00Z',weight:12,left:6,right:5,rounds:3});return completeSession(r);});
 await page.goto('./#session/old-friday');await expect(page.getByText('Fourth Floor Press set (06:00–07:00), not totals across all rounds.',{exact:true})).toBeVisible();
 await start(page,'friday-to-black',2);await page.clock.fastForward(363000);await expect(page.locator('.active-exercise')).toHaveText('KB Alternating Floor Press');await expect(page.getByRole('timer')).toHaveText('00:40');await expect(page.locator('.active-target')).toHaveCount(0);await page.clock.fastForward(40000);await expect(page.locator('.session-state')).toHaveText('REST');await expect(page.getByRole('timer')).toHaveText('00:20');await page.clock.fastForward(800000);
 await page.getByLabel('KB Alternating Floor Press actual weight (kg)',{exact:true}).fill('16');await page.getByLabel('Floor Press — Left arm repetitions',{exact:true}).fill('6');await page.getByLabel('Floor Press — Right arm repetitions',{exact:true}).fill('5');await page.getByLabel('Complete finisher rounds',{exact:true}).fill('3');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
 expect((await records(page)).find(r=>r.id===old.id)).toEqual(old);await page.getByRole('link',{name:'Progress',exact:true}).click();await page.getByLabel('Recorded exercise',{exact:true}).selectOption({label:'KB Alternating Floor Press · Friday To Black · Strength'});await expect(page.locator('.progress-chart circle')).toHaveCount(2);
 const totals=page.locator('.progress-performance > div');await expect(totals.filter({hasText:'left arm'})).toHaveCount(2);await expect(totals.filter({hasText:'40s work (06:00–06:40)'})).toHaveCount(2);await expect(totals.filter({hasText:'complete rounds'})).toContainText('6 rounds');
});

test('40/20 details, WORK/REST, inputs and footer remain usable at four widths and 200% text; screenshots',async({page},info)=>{
 test.setTimeout(180000);await setup(page);await clock(page);page.on('dialog',d=>d.accept());await fs.mkdir(artifactRoot,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280])for(const [id,v]of releases){
  await page.setViewportSize({width,height:844});await page.goto(`./#workout/${id}/${v}`);await expect(page.locator('.phase-format').first()).toContainText('40/20');await page.screenshot({path:`${artifactRoot}/${width}-${id}-detail.png`,fullPage:true,style:'nav{visibility:hidden}'});
  await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');await page.clock.runFor(13000);await expect(page.locator('.session-state')).toHaveText('WORK');await expect(page.locator('.active-target')).toHaveCount(0);await expect(page.locator('.session-next-name')).not.toBeEmpty();
  for(const scale of [100,200]){const style=scale===200?await page.addStyleTag({content:'html{font-size:200%}'}):null;expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Tab');await page.getByRole('button',{name:'Pause',exact:true}).focus();expect(await page.getByRole('button',{name:'Pause',exact:true}).evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await expect(page.locator('nav')).toBeHidden();await page.getByRole('button',{name:'End Workout',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'End Workout',exact:true})).toBeInViewport();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${artifactRoot}/${width}-${id}-work-${scale}.png`,fullPage:true,style:'nav{visibility:hidden}'});await page.screenshot({path:`${artifactRoot}/${width}-${id}-viewport-${scale}.png`});if(style)await style.evaluate(n=>n.remove());}
  await page.clock.runFor(30000);await expect(page.locator('.session-state')).toHaveText('REST');await expect(page.getByRole('timer')).toHaveText('00:20');await page.screenshot({path:`${artifactRoot}/${width}-${id}-rest.png`,fullPage:true,style:'nav{visibility:hidden}'});await page.getByRole('button',{name:'End Workout',exact:true}).click();
 }
 expect(errors).toEqual([]);
});

test('new version modules and richer cues work offline with existing PWA assets, plans and session persistence',async({page,context})=>{
 await setup(page);await clock(page);await installBeepSpy(page);page.on('dialog',d=>d.accept());await page.goto('./#library');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const cached=await page.evaluate(async()=>{const sw=await fetch('./service-worker.js').then(r=>r.text()),cache=await caches.open('kb2-static-v34');return Promise.all([...new Set([...sw.matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1]))].map(async url=>Boolean(await cache.match(new URL(url,document.baseURI)))));});expect(cached).toHaveLength(98);expect(cached.every(Boolean)).toBe(true);await context.setOffline(true);
 for(const [id,v]of releases){await start(page,id,v);await page.clock.runFor(43000);await expect(page.locator('.session-state')).toHaveText('REST');await page.getByRole('button',{name:'End Workout',exact:true}).click();}
 await start(page,'thursday-bells',2);await page.clock.fastForward(1273000);await page.getByLabel('Total finisher steps',{exact:true}).fill('81');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const completed=(await records(page)).filter(r=>r.status==='completed');expect(completed).toHaveLength(1);expect(completed[0].workoutVersion).toBe(2);await context.setOffline(false);
});
