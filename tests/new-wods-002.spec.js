import {test,expect} from '@playwright/test';
const workouts=[{id:'focus-002-lower-abs',name:'Lower Body + ABS',day:'Thursday',boundaries:[600000],restStart:10,rests:10,first:'KB Goblet Squat',block:'legs',rounds:2},{id:'hybrid-002-full-body-engine',name:'Full Body Engine',day:'Friday',boundaries:[480000,960000],restStart:8,rests:8,first:'KB Floor Press',block:'strength',rounds:4}];
async function clock(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));}
async function start(page,w){await clock(page);await page.goto(`./#workout/${w.id}/1`);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');}
async function saved(page){await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();}
async function records(page,id){return page.evaluate(async id=>{const {listSessions}=await import('./src/storage/session-store.js');return listSessions(id);},id);}
for(const w of workouts){
 test(`${w.name}: continuous audio, automatic boundaries, pause and circuit`,async({page})=>{
 await page.addInitScript(()=>{
  window.newAudio={samples:[],tones:[],decoded:0};
  window.AudioContext=class {
   state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}
   decodeAudioData(bytes){window.newAudio.decoded++;return Promise.resolve({type:bytes.byteLength===488264?'start':'minute'});}
   createBufferSource(){const source={buffer:null,connect(){},disconnect(){},start(){window.newAudio.samples.push(source.buffer.type);},stop(){}};return source;}
   createOscillator(){const source={frequency:{value:0},connect(){},disconnect(){},start(){window.newAudio.tones.push(source.frequency.value);},stop(){}};return source;}
   createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  };
 });
 await start(page,w);await expect.poll(()=>page.evaluate(()=>window.newAudio.decoded)).toBe(2);await page.clock.runFor(3000);
 for(let m=1;m<=20;m++){
  const interval=m>w.restStart&&m<=w.restStart+w.rests;
  await page.clock.fastForward(interval?39900:59900);await page.clock.runFor(100);
  if(interval){expect(await page.evaluate(()=>window.newAudio.tones.filter(x=>x===620).length)).toBe(m-w.restStart);await page.clock.fastForward(19900);await page.clock.runFor(100);}
  expect(await page.evaluate(()=>window.newAudio.samples.filter(x=>x==='minute').length)).toBe(Math.min(m,19));
  if(w.boundaries.includes(m*60000)){
   await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toHaveCount(0);await expect(page.locator('.phase-clock')).not.toHaveText('3');
   await expect(page.locator('.block-time')).toHaveText(`Block remaining: ${m===16?'04:00':w.id.startsWith('focus')?'10:00':'08:00'}`);
   await page.getByRole('button',{name:'Pause',exact:true}).click();const samples=await page.evaluate(()=>JSON.stringify(window.newAudio));await page.clock.fastForward(60000);await page.getByRole('button',{name:'Resume',exact:true}).click();expect(await page.evaluate(()=>JSON.stringify(window.newAudio))).toBe(samples);
  }
  if(m===17&&w.boundaries.length===2)await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);
 }
 await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await saved(page);
 expect(await page.evaluate(()=>window.newAudio.samples.filter(x=>x==='start').length)).toBe(1);expect(await page.evaluate(()=>window.newAudio.tones.filter(x=>x===620).length)).toBe(w.rests);expect(await page.evaluate(()=>window.newAudio.tones.filter(x=>x===1320).length)).toBe(1);
 const quiet=await page.evaluate(()=>JSON.stringify(window.newAudio));await page.clock.fastForward(900000);expect(await page.evaluate(()=>JSON.stringify(window.newAudio))).toBe(quiet);
 const record=(await records(page,w.id))[0];expect(record.activeDurationMs).toBe(1200000);expect(record.completedBlocks).toHaveLength(w.boundaries.length+1);
 });
 test(`${w.name}: offline results, validation, recovery, idempotent save and history`,async({page,context})=>{
 await clock(page);await page.goto(`./#workout/${w.id}/1`);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await page.evaluate(({id,block})=>{localStorage.setItem(`kb2.weight-preference.v1:${id}:1:${block==='legs'?'goblet-squat':'floor-press'}`,'14');},w);await context.setOffline(true);
 const preserved=await page.evaluate(async()=>{
  const {findWorkout}=await import('./src/data/catalog.js');const {createDraft,finalResults}=await import('./src/domain/result-schemas.js');const {putDraft,completeSession,getSession}=await import('./src/storage/session-store.js');const ids=[];
  for(const id of ['focus-001-upper-abs','hybrid-001-strength-sweat'])for(const completed of [false,true]){
   const workout=findWorkout(id,2),record=createDraft(workout,{getItem:()=>null},`${id}-${completed}`);record.form.notes='preserve existing data';
   if(completed){record.stage=`${workout.phases.at(-1).id}-results`;record.blockIndex=workout.phases.length-1;record.completedBlocks=workout.phases.map(p=>p.id);record.activeDurationMs=1200000;record.completedAt=new Date().toISOString();record.results=finalResults(record);await completeSession(record);}else await putDraft(record);ids.push(record.id);
  }return Promise.all(ids.map(getSession));
 });
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.fastForward(1203000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();
 const first=page.getByRole('region',{name:`${w.first} results`,exact:true});await expect(first.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true})).toHaveValue('14');await first.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true}).fill('0');await first.getByRole('spinbutton',{name:'Round 1',exact:true}).fill('0');await first.getByRole('spinbutton',{name:`Round ${w.rounds}`,exact:true}).fill('9');
 const intervals=page.getByRole('spinbutton',{name:'Intervals completed',exact:true}).first();await intervals.fill('3');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText(/intervals: enter/)).toBeVisible();await intervals.fill('2');
 if(w.boundaries.length===2){await page.getByRole('spinbutton',{name:'Full rounds completed',exact:true}).fill('1');const partial=page.getByRole('spinbutton',{name:'Additional partial reps',exact:true});await partial.first().fill('7');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText(/additional partial repetitions: enter/)).toBeVisible();await partial.first().fill('6');await partial.nth(1).fill('0');await partial.nth(2).fill('8');}
 await page.getByRole('textbox',{name:'Workout notes',exact:true}).fill('Left/right differences recorded here');await saved(page);await page.reload();await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await expect(first.getByRole('spinbutton',{name:'Round 1',exact:true})).toHaveValue('0');
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Save Workout',exact:true}).evaluate(b=>{b.click();b.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const sessions=await records(page,w.id);expect(sessions).toHaveLength(1);expect(sessions[0].results[w.block][0].rounds[0]).toBe(0);expect(sessions[0].results[w.block][0].weightKg).toBe(0);expect(sessions[0].results[w.block][1].rounds.every(x=>x===null)).toBe(true);expect(sessions[0].results.perceivedEffort).toBeNull();const after=await page.evaluate(async ids=>{const {getSession}=await import('./src/storage/session-store.js');return Promise.all(ids.map(getSession));},preserved.map(r=>r.id));expect(after).toEqual(preserved);
 await page.getByRole('button',{name:'View saved session'}).click();await expect(page.getByText('Active duration: 20:00',{exact:true})).toBeVisible();await expect(page.getByText('Actual Weight (kg): 0',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Workout notes: Left/right differences recorded here',{exact:true})).toBeVisible();expect(await page.evaluate(id=>localStorage.getItem(`kb2.weight-preference.v1:${id}:1:${id.startsWith('focus')?'goblet-squat':'floor-press'}`),w.id)).toBe('14');await context.setOffline(false);
 });
 for(const elapsed of [60000,...w.boundaries.map(x=>x+45000)])test(`${w.name}: recover active ${elapsed} paused without counting away time`,async({page})=>{
 await start(page,w);await page.clock.fastForward(elapsed+3000);await page.getByRole('button',{name:'Pause',exact:true}).click();await saved(page);const remaining=await page.locator('.block-time').textContent();page.on('dialog',d=>d.accept());await page.reload();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.block-time')).toHaveText(remaining);await page.clock.fastForward(900000);await expect(page.locator('.block-time')).toHaveText(remaining);await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.fastForward(1200000-elapsed);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();
 });
 test(`${w.name}: Library and manual assignment persist`,async({page})=>{
 await page.goto('./');const slot=page.getByRole('region',{name:w.day,exact:true});await slot.getByRole('button',{name:'Add workout'}).click();await page.getByRole('button',{name:`Assign to ${w.day}: ${w.name}`,exact:true}).click();await page.reload();await expect(slot.getByText(w.name,{exact:true})).toBeVisible();await slot.getByRole('button',{name:`View workout: ${w.name}`,exact:true}).click();await expect(page).toHaveURL(new RegExp(`${w.id}/1$`));
 });
}
