import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {mockCloud} from './helpers/oldschool-cloud.js';
import {installBeepSpy} from './helpers/timer-beeps.js';
const programs=JSON.parse(await fs.readFile(new URL('./fixtures/oldschool-programs.json',import.meta.url),'utf8'));
const animals=Object.keys(programs),warning='End this workout? Your progress will not be saved.';
async function setup(page,config={url:'',publishableKey:''}){
 await page.addInitScript(config=>{
  window.KB_SUPABASE_CONFIG=config;window.sessionWrites=[];
  for(const method of ['put','add','delete','clear']){const original=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(record,...args){if(this.name==='sessions'){window.sessionWrites.push(method==='put'||method==='add'?structuredClone(record):{operation:method});if(window.failSave)throw Error('Fixture quota');}return original.call(this,record,...args);};}
 },config);
 await installBeepSpy(page);await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-06T12:00:01Z'));
}
const records=page=>page.evaluate(async()=>(await import('./src/storage/session-store.js')).listSessions());
async function detail(page,animal){await page.goto(`./#workout/oldschool-${animal}/1`);await expect(page.getByRole('heading',{name:`Oldschool ${animal[0].toUpperCase()+animal.slice(1)}`,exact:true})).toBeVisible();}
async function start(page){await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');}
async function chrome(page,active){for(const node of [page.locator('.app-header'),page.locator('nav')])active?await expect(node).toBeHidden():await expect(node).toBeVisible();}
test('seven public cards append approved Oldschool identities; exact detail slots, shared preparation weights and manual assignments',async({page})=>{
 await setup(page);await page.goto('./#today');const original={Monday:{workoutId:'monday-paranoid',version:3}};await page.evaluate(plan=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan)),original);
 await page.goto('./#library');await expect(page.locator('.workout-card')).toHaveCount(8);await expect(page.getByText('8 workouts',{exact:true})).toBeVisible();
 expect(await page.locator('.workout-card strong').allTextContents()).toEqual(['Monday Paranoid','Tuesday of Spades','Thursday Bells','Friday To Black','Oldschool Sailor','Oldschool Tiger','Oldschool Eagle','Classic Iron']);
 for(const [i,animal]of animals.entries()){
  await page.goto('./#library');const card=page.locator('.workout-card').nth(i+4);await expect(card).toContainText(`HM/KB WOD 00${i+5}`);await expect(card).toContainText('20:00');await expect(card).toContainText('45/15');await expect(card).toContainText('Upper 5 min / ABS 5 min / Legs 5 min / Muscle Finisher 5 min');await card.click();await expect(page).toHaveURL(new RegExp(`oldschool-${animal}/1$`));
  await expect(page.locator('.exercise-weight-row > strong')).toHaveText(programs[animal].flat());await expect(page.locator('.exercise-list')).toHaveCount(4);
  const unique=[...new Set(programs[animal].flat())].filter(n=>n.startsWith('KB '));await expect(page.getByRole('spinbutton')).toHaveCount(unique.length);
  for(const body of programs[animal].flat().filter(n=>!n.startsWith('KB ')))await expect(page.getByLabel(`${body} weight (kg)`,{exact:true})).toHaveCount(0);
  const first=page.getByLabel(`${unique[0]} weight (kg)`,{exact:true});await expect(first).toHaveCount(1);await first.fill('12.5');await page.reload();await expect(first).toHaveValue('12.5');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(original);
 }
 for(const [i,animal]of animals.entries()){
  const day=['Tuesday','Wednesday','Saturday'][i],name=`Oldschool ${animal[0].toUpperCase()+animal.slice(1)}`;await page.goto('./#today');await page.getByRole('region',{name:day,exact:true}).getByRole('button',{name:'Add workout',exact:true}).click();await page.getByRole('button',{name:`Assign to ${day}: ${name}`,exact:true}).click();await expect(page).toHaveURL(/#today$/);original[day]={workoutId:`oldschool-${animal}`,version:1};await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(original);
 }
 expect(await records(page)).toEqual([]);
});
for(const animal of animals)test(`${animal}: every live 45/15 edge, block/current/next, loud cues, pause, explicit save and History/Progress`,async({page})=>{
 test.setTimeout(90000);await setup(page);await detail(page,animal);await page.getByRole('spinbutton').first().fill('12.5');await start(page);await chrome(page,true);
 expect(await page.locator('.active-panel').evaluate(n=>[...n.children].filter(n=>!n.matches('progress')).map(n=>n.className))).toEqual(['eyebrow focus-phase','session-dial','active-controls','session-timing','current-exercise-card']);await expect(page.locator('.active-controls button')).toHaveText(['','']);await expect(page.locator('.hm-active-view input')).toHaveCount(0);
 await page.clock.runFor(3000);const expected=[640],order=programs[animal].flat(),phaseNames=['Upper','ABS','Legs','Muscle Finisher'];const advance=async ms=>{await page.clock.fastForward(ms-100);await page.clock.runFor(100);};
 for(let slot=0;slot<20;slot++){
  await expect(page.locator('.focus-phase')).toHaveText(`${phaseNames[Math.floor(slot/5)]} · WORK`);await expect(page.locator('.active-exercise')).toHaveText(order[slot]);await expect(page.locator('.session-next-name')).toHaveText(order[slot+1]||'Workout Results');
  if(slot%5===0){await expect(page.locator('.block-time')).toHaveText('05:00');await expect(page.locator('.session-total')).toHaveText(['20:00','15:00','10:00','05:00'][slot/5]);}
  if(slot===0){await page.clock.runFor(10000);await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(600000);await expect(page.getByRole('timer')).toHaveText('00:35');await expect(page.locator('.icon-play')).toBeVisible();await page.getByRole('button',{name:'Resume',exact:true}).click();await advance(35000);}else await advance(45000);
  expected.push(520,520);await expect(page.getByRole('timer')).toHaveText('00:15');await expect(page.locator('.session-state')).toHaveText('REST');await expect(page.locator('.active-exercise')).toHaveText(order[slot]);expect(await page.evaluate(()=>beepNotes.map(n=>n.frequency))).toEqual(expected);expect(await page.evaluate(()=>sessionWrites)).toEqual([]);
  await advance(15000);expected.push(...(slot===19?[620,620]:[1040]));expect(await page.evaluate(()=>beepNotes.map(n=>n.frequency))).toEqual(expected);
 }
 await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await chrome(page,false);expect(await records(page)).toEqual([]);
 const weights=page.getByRole('spinbutton');await expect(weights).toHaveCount([...new Set(order)].filter(n=>n.startsWith('KB ')).length);await expect(weights.first()).toHaveValue('12.5');await expect(page.getByRole('spinbutton',{name:/repetitions|rounds|intervals|steps|effort/i})).toHaveCount(0);
 await weights.first().fill('-1');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText(/actual weight: enter/)).toBeVisible();expect(await page.evaluate(()=>sessionWrites)).toEqual([]);await weights.first().fill('13.25');
 await page.getByRole('button',{name:'Save Workout',exact:true}).evaluate(b=>{b.click();b.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const [saved]=await records(page);expect(saved.status).toBe('completed');expect(saved.activeDurationMs).toBe(1200000);expect(Object.keys(saved.results)).toEqual(['exerciseWeights']);expect(Object.values(saved.results.exerciseWeights)[0]).toBe(13.25);expect(await page.evaluate(()=>sessionWrites.map(r=>r.status))).toEqual(['completed']);
 await page.getByRole('button',{name:'View saved session',exact:true}).click();await expect(page.getByText('Active duration: 20:00',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Recorded exercise weights',exact:true}).locator('p')).toHaveCount(Object.keys(saved.results.exerciseWeights).length);await expect(page.getByText(/Thruster completed|Complete finisher rounds|Perceived effort|Workout notes/)).toHaveCount(0);
 await page.getByRole('link',{name:'Progress',exact:true}).click();await expect(page.getByRole('region',{name:'Monthly overview',exact:true}).locator('.progress-metric').filter({hasText:'Completed workouts'}).locator('dd')).toHaveText('1');await expect(page.getByText('13.25 kg',{exact:true}).first()).toBeVisible();await expect(page.getByText('No recorded performance counts',{exact:true})).toBeVisible();
 await detail(page,animal);await expect(page.getByRole('spinbutton').first()).toHaveValue('12.5');
});
test('early End cancels once or discards; refresh/old URLs never recover; failed final saves retain values for retry',async({page})=>{
 await setup(page);let accept=false;const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());return accept?d.accept():d.dismiss();});
 for(const animal of animals){await detail(page,animal);await start(page);await page.clock.runFor(13000);const time=await page.getByRole('timer').textContent();await page.getByRole('button',{name:'End Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText(time);accept=true;await page.getByRole('button',{name:'End Workout',exact:true}).click();await expect(page).toHaveURL(/#today$/);await chrome(page,false);accept=false;}
 expect(dialogs).toEqual(Array(6).fill(warning));expect(await page.evaluate(()=>sessionWrites)).toEqual([]);
 accept=true;await detail(page,'sailor');await start(page);await page.clock.runFor(13000);await page.reload();await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();await page.goto('./#active/oldschool-sailor/1?draft=unused');await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();await start(page);await page.clock.fastForward(1203000);await page.getByRole('spinbutton').first().fill('8.5');await page.evaluate(()=>{window.failSave=true;});await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText('Workout could not be saved. Your entries are still here. Retry Save Workout.',{exact:true})).toBeVisible();await expect(page.getByRole('spinbutton').first()).toHaveValue('8.5');expect(await records(page)).toEqual([]);await page.evaluate(()=>{window.failSave=false;});await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const writes=await page.evaluate(()=>sessionWrites);expect(writes).toHaveLength(2);expect(writes[0].id).toBe(writes[1].id);
});
test('all seven cards, Oldschool preparation/WORK/REST/results and offline assets fit four widths and 200% text',async({page,context},info)=>{
 test.setTimeout(120000);await setup(page);page.on('dialog',d=>d.accept());const root='/workspace/artifacts/oldschool-wods-005-007';await fs.mkdir(root,{recursive:true});await page.goto('./#library');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const cached=await page.evaluate(async()=>{const cache=await caches.open('kb2-static-v37'),source=await fetch('./service-worker.js').then(r=>r.text());return Promise.all([...new Set([...source.matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1]))].map(async path=>Boolean(await cache.match(new URL(path,document.baseURI)))));});expect(cached).toHaveLength(104);expect(cached.every(Boolean)).toBe(true);await context.setOffline(true);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280])for(const animal of animals){await page.setViewportSize({width,height:844});
  await page.goto('./#library');
  for(const scale of [100,200]){
   const zoom=scale===200?await page.addStyleTag({content:'html{font-size:200%}'}):null;
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   for(const card of await page.locator('.workout-card').all()){
    await expect(card.locator('.metal-micro-mark')).toHaveCount(1);await expect(card.locator(':scope > span:not([class])')).toHaveCount(1);
    const boxes=await card.locator(':scope > *').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
    for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];expect(x.right<=y.left+.5||y.right<=x.left+.5||x.bottom<=y.top+.5||y.bottom<=x.top+.5,`${width}/${scale}: ${x.text} overlaps ${y.text}`).toBe(true);}
   }
   if(animal==='sailor')await page.screenshot({path:`${root}/${width}-library-${scale}.png`,fullPage:true,style:'nav{visibility:hidden}'});
   if(zoom)await zoom.evaluate(n=>n.remove());
  }
  await detail(page,animal);
  async function shot(state){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${root}/${width}-${animal}-${state}.png`,fullPage:true,style:'nav{visibility:hidden}'});}
  await shot('details');const zoom=await page.addStyleTag({content:'html{font-size:200%}'});await shot('details-200');await zoom.evaluate(n=>n.remove());await start(page);await page.clock.runFor(13000);await shot('work');const style=await page.addStyleTag({content:'html{font-size:200%}'});await shot('work-200');await page.keyboard.press('Tab');for(const b of await page.locator('.active-controls button').all()){await b.focus();expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);expect(await b.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');}await style.evaluate(n=>n.remove());await page.clock.runFor(35000);await expect(page.getByRole('timer')).toHaveText('00:15');await shot('rest');await page.clock.fastForward(1155000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await shot('results');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
 }
 await context.setOffline(false);const saved=await records(page);expect(saved.every(r=>r.status==='completed'&&r.activeDurationMs===1200000)).toBe(true);
});

test('Oldschool completed snapshots sync through existing owner JSONB transport, retry acknowledgment and read back with intact old history',async({page})=>{
 await setup(page,{url:'https://kb-test.supabase.co',publishableKey:'sb_publishable_test'});const db=await mockCloud(page);
 await page.goto('./#account');await page.getByLabel('Email',{exact:true}).fill('alice@example.test');await page.getByLabel('Password',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.getByText('Signed in as alice@example.test',{exact:true})).toBeVisible();await expect(page.locator('.cloud-indicator')).toHaveText('Synced');
 const old=await page.evaluate(async()=>{const {savedRecord}=await import('./tests/helpers/progress-records.js'),{completeSession}=await import('./src/storage/session-store.js');return completeSession(savedRecord({id:'00000000-0000-4000-8000-000000000005',ownerId:'11111111-1111-4111-8111-111111111111',workoutId:'monday-paranoid',version:4,startedAt:'2026-11-05T10:00:00Z',weight:12.5,reps:17}));});await expect.poll(()=>db.sessions.size).toBe(1);const oldRemote=structuredClone([...db.sessions.values()][0]);
 for(const [i,animal]of animals.entries()){
  await detail(page,animal);await page.getByRole('spinbutton').first().fill('16');await start(page);await page.clock.fastForward(1203000);expect(db.sessions.size).toBe(i+1);db.fail=true;await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await expect(page.locator('.cloud-session-status')).toHaveText('Sync pending');
  const saved=(await records(page)).find(r=>r.workoutId===`oldschool-${animal}`);expect(saved.ownerId).toBe('11111111-1111-4111-8111-111111111111');db.fail=false;await page.evaluate(async()=>(await import('./src/cloud/runtime.js')).sync.sync());await expect.poll(()=>db.sessions.size).toBe(i+2);await expect(page.locator('.cloud-session-status')).toHaveText('Synced');
  const remote=[...db.sessions.values()].find(r=>r.id===saved.id);expect(remote.workout_id).toBe(`oldschool-${animal}`);expect(remote.workout_version).toBe(1);expect(remote.results).toEqual(saved.results);expect(remote.workout_snapshot).toEqual(saved.workoutSnapshot);expect(Object.keys(remote.results)).toEqual(['exerciseWeights']);await page.getByRole('button',{name:'View saved session',exact:true}).click();await page.reload();await expect(page.getByText('Active duration: 20:00',{exact:true})).toBeVisible();
 }
 expect(await page.evaluate(async id=>(await import('./src/storage/session-store.js')).getSession(id),old.id)).toEqual(old);expect(db.sessions.get([...db.sessions.keys()].find(k=>k.endsWith(old.id)))).toEqual(oldRemote);
 await page.getByRole('link',{name:'History',exact:true}).click();await expect(page.locator('.library-grid > button')).toHaveCount(4);await page.getByRole('link',{name:'Progress',exact:true}).click();await expect(page.getByRole('region',{name:'Monthly overview',exact:true}).locator('.progress-metric').filter({hasText:'Completed workouts'}).locator('dd')).toHaveText('4');
});
