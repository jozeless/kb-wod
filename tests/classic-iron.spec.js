import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {installBeepSpy} from './helpers/timer-beeps.js';
import {mockCloud} from './helpers/oldschool-cloud.js';

async function setup(page,config={url:'',publishableKey:''}) {
  await page.addInitScript(config=>{
    window.KB_SUPABASE_CONFIG=config;window.sessionWrites=[];
    const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(record,...args){if(this.name==='sessions'){window.sessionWrites.push(structuredClone(record));if(window.failSave)throw Error('Fixture quota');}return put.call(this,record,...args);};
  },config);
  await installBeepSpy(page);
  await page.clock.install({time:new Date('2026-11-13T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-13T12:00:01Z'));
}
const records=page=>page.evaluate(async()=>(await import('./src/storage/session-store.js')).listSessions());
const sounds=page=>page.evaluate(()=>beepNotes.map(n=>n.frequency));
const mainClock=page=>page.locator('.phase-clock');
const roundButton=page=>page.getByRole('button',{name:'Ronda completa',exact:true});
async function start(page){await page.goto('./#workout/classic-iron/1');await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(mainClock(page)).toHaveText('3');}
const rounds=page=>page.getByLabel('Completed rounds',{exact:true});
async function boundary(page,ms){if(ms>100)await page.clock.fastForward(ms-100);await page.clock.runFor(Math.min(ms,100));}

test('eighth Library card, exact circuit, manual plan and weight-free preparation preserve all seven old cards',async({page})=>{
  await setup(page);await page.goto('./#today');const plan={Monday:{workoutId:'monday-paranoid',version:4},Tuesday:{workoutId:'oldschool-sailor',version:1}};
  await page.evaluate(plan=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan)),plan);await page.reload();await page.goto('./#library');
  await expect(page.locator('.workout-card')).toHaveCount(8);expect(await page.locator('.workout-card strong').allTextContents()).toEqual(['Monday Paranoid','Tuesday of Spades','Thursday Bells','Friday To Black','Oldschool Sailor','Oldschool Tiger','Oldschool Eagle','Classic Iron']);
  const card=page.getByRole('button',{name:'View workout: Classic Iron',exact:true});await expect(card).toContainText('20:00');await expect(card).toContainText('AMRAP');await card.click();await expect(page).toHaveURL(/classic-iron\/1$/);
  await expect(page.locator('.prescriptions > li')).toHaveCount(7);await expect(page.getByRole('spinbutton')).toHaveCount(0);await expect(page.locator('.exercise-target')).toHaveText(['10 repetitions','10 repetitions','10 repetitions total','10 repetitions total','10 repetitions','10 repetitions total','10 repetitions']);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(plan);
  await page.getByRole('link',{name:'Today',exact:true}).click();await page.getByRole('region',{name:'Tuesday',exact:true}).getByRole('button',{name:'Change workout',exact:true}).click();await page.getByRole('button',{name:'Assign to Tuesday: Classic Iron',exact:true}).click();await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual({...plan,Tuesday:{workoutId:'classic-iron',version:1}});expect(await records(page)).toEqual([]);
});

test('explicit rounds, double-tap protection, automatic rest and pause/resume preserve main duration and one cue per event',async({page})=>{
  await setup(page);await start(page);await expect(roundButton(page)).toBeDisabled();await expect(page.locator('nav')).toBeHidden();await expect(page.locator('.app-header')).toBeHidden();
  await page.clock.runFor(3000);await expect(mainClock(page)).toHaveText('20:00');await expect(rounds(page)).toHaveText('0');await expect(page.locator('.session-state')).toHaveText('TRAINING');expect(await sounds(page)).toEqual([640]);
  await page.clock.runFor(5000);await roundButton(page).evaluate(b=>{b.click();b.click();});await expect(rounds(page)).toHaveText('1');await expect(roundButton(page)).toBeDisabled();await expect(page.getByRole('timer',{name:'Rest remaining',exact:true})).toHaveText('Rest remaining: 00:20');expect(await sounds(page)).toEqual([640,520,520]);
  await page.clock.runFor(7000);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.locator('.session-state')).toHaveText('PAUSED');const time=await mainClock(page).textContent();await page.clock.fastForward(600000);await expect(mainClock(page)).toHaveText(time);await expect(page.getByRole('timer',{name:'Rest remaining',exact:true})).toHaveText('Rest remaining: 00:13');
  await page.getByRole('button',{name:'Resume',exact:true}).click();expect(await sounds(page)).toEqual([640,520,520]);await boundary(page,13000);await expect(mainClock(page)).toHaveText('19:35');await expect(page.locator('.session-state')).toHaveText('TRAINING');await expect(roundButton(page)).toBeEnabled();expect(await sounds(page)).toEqual([640,520,520,1040]);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(600000);await expect(mainClock(page)).toHaveText('19:35');await expect(roundButton(page)).toBeDisabled();await page.getByRole('button',{name:'Resume',exact:true}).click();expect(await sounds(page)).toEqual([640,520,520,1040]);
  await boundary(page,35000);expect(await sounds(page)).toEqual([640,520,520,1040]);await expect(mainClock(page)).toHaveText('19:00');await expect(page.locator('.active-circuit li')).toHaveCount(7);await expect(page.locator('.hm-active-view input,.session-timing')).toHaveCount(0);await expect(page.getByRole('button',{name:/Sound/i})).toHaveCount(0);expect(await records(page)).toEqual([]);
});

test('completion cuts final rest at 20:00, saves rounds alone exactly once and displays History and monthly activity',async({page})=>{
  await setup(page);await start(page);await page.clock.runFor(3000);await page.clock.fastForward(1190000);await expect(mainClock(page)).toHaveText('00:10');await roundButton(page).click();await expect(rounds(page)).toHaveText('1');await expect(page.getByRole('timer',{name:'Rest remaining',exact:true})).toHaveText('Rest remaining: 00:20');
  await boundary(page,10000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await expect(page.getByText('Completed rounds: 1',{exact:true})).toBeVisible();expect(await sounds(page)).toEqual([640,520,520,620,620]);await expect(page.locator('input,textarea')).toHaveCount(0);expect(await records(page)).toEqual([]);await expect(page.locator('nav')).toBeVisible();
  await page.getByRole('button',{name:'Save Workout',exact:true}).evaluate(b=>{b.click();b.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const [saved]=await records(page);expect(saved.results).toEqual({completedRounds:1});expect(saved.activeDurationMs).toBe(1200000);expect(saved.workoutId).toBe('classic-iron');expect(saved.workoutVersion).toBe(1);expect(saved.ownerId).toBeNull();expect(saved.status).toBe('completed');expect(saved.completedAt).toBeTruthy();expect(saved.startedAt).toBeTruthy();expect(saved.form).toBeUndefined();expect(Object.keys(saved).sort()).toEqual(['activeDurationMs','completedAt','id','ownerId','results','savedAt','schemaVersion','startedAt','status','updatedAt','workoutId','workoutSnapshot','workoutVersion']);expect(await page.evaluate(()=>sessionWrites.map(r=>r.status))).toEqual(['completed']);
  await page.getByRole('button',{name:'View saved session',exact:true}).click();await page.reload();await expect(page.getByText('Completed rounds: 1',{exact:true})).toBeVisible();await expect(page.getByText(/Perceived effort|Workout notes|Exercise weights/)).toHaveCount(0);await page.getByRole('link',{name:'History',exact:true}).click();await expect(page.locator('.library-grid > button')).toHaveCount(1);
  await page.getByRole('link',{name:'Progress',exact:true}).click();await expect(page.getByRole('region',{name:'Monthly overview',exact:true}).locator('.progress-metric').filter({hasText:'Completed workouts'}).locator('dd')).toHaveText('1');
});

test('zero completed rounds is valid, partial circuits do not count and failed save retries retain identity and result',async({page})=>{
  await setup(page);await start(page);await page.clock.fastForward(1203000);await expect(page.getByText('Completed rounds: 0',{exact:true})).toBeVisible();expect(await records(page)).toEqual([]);
  await page.evaluate(()=>{window.failSave=true;});await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText('Workout could not be saved. Your rounds are still here. Retry Save Workout.',{exact:true})).toBeVisible();await expect(page.getByText('Completed rounds: 0',{exact:true})).toBeVisible();expect(await records(page)).toEqual([]);
  await page.evaluate(()=>{window.failSave=false;});await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();const [saved]=await records(page);expect(saved.results).toEqual({completedRounds:0});const writes=await page.evaluate(()=>sessionWrites);expect(writes).toHaveLength(2);expect(writes[0].id).toBe(writes[1].id);
});

test('early End, refresh and historical active URLs create no sessions; ownership changes block Save',async({page})=>{
  await setup(page);let accept=false;const warnings=[];page.on('dialog',d=>{warnings.push(d.message());return accept?d.accept():d.dismiss();});await start(page);await page.clock.runFor(3000);await roundButton(page).click();await page.getByRole('button',{name:'End Workout',exact:true}).click();await expect(rounds(page)).toHaveText('1');expect(warnings).toHaveLength(1);accept=true;await page.getByRole('button',{name:'End Workout',exact:true}).click();await expect(page).toHaveURL(/#today$/);expect(await records(page)).toEqual([]);
  await start(page);await page.clock.runFor(3000);await roundButton(page).click();await page.reload();await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();await page.goto('./#active/classic-iron/1?draft=historical');await expect(page.getByText('Ready when you are',{exact:true})).toBeVisible();expect(await records(page)).toEqual([]);
  await page.getByRole('button',{name:'Start Workout',exact:true}).click();await page.clock.fastForward(1203000);await expect(page.getByText('Completed rounds: 0',{exact:true})).toBeVisible();await page.evaluate(async()=>(await import('./src/cloud/identity.js')).setUserId('another-owner'));await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByText('Account changed. Start a new workout before saving.',{exact:true})).toBeVisible();expect(await records(page)).toEqual([]);await page.evaluate(async()=>(await import('./src/cloud/identity.js')).setUserId(null));await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
});

test('background catch-up never queues missed cues and blocked audio cannot stop training',async({page})=>{
  await setup(page);await start(page);await page.clock.runFor(3000);await roundButton(page).click();const before=await sounds(page);await page.clock.fastForward(25000);await expect(page.locator('.session-state')).toHaveText('TRAINING');expect(await sounds(page)).toEqual(before);await page.clock.runFor(100);expect(await sounds(page)).toEqual(before);
  await roundButton(page).click();const hiddenSounds=await sounds(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.fixtureHidden});window.fixtureHidden=true;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(20000);await page.evaluate(()=>{window.fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(100);await expect(page.locator('.session-state')).toHaveText('TRAINING');expect(await sounds(page)).toEqual(hiddenSounds);
  page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'End Workout',exact:true}).click();await page.addInitScript(()=>{AudioContext.prototype.resume=function(){return Promise.reject(Error('Audio blocked'));};});await page.reload();await start(page);await page.clock.runFor(3000);await expect(mainClock(page)).toHaveText('20:00');await roundButton(page).click();await page.clock.runFor(20000);await expect(mainClock(page)).toHaveText('19:40');await expect(page.locator('.session-state')).toHaveText('TRAINING');expect(await records(page)).toEqual([]);
});

test('new runtime assets, rounds, rest, completion, save and History work offline with responsive Focus Mode',async({page,context},info)=>{
  test.setTimeout(90000);await setup(page);page.on('dialog',d=>d.accept());await page.goto('./#library');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const cached=await page.evaluate(async()=>{const source=await fetch('./service-worker.js').then(r=>r.text()),cache=await caches.open('kb2-static-v34');return Promise.all([...new Set([...source.matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1]))].map(async path=>({path,available:Boolean(await cache.match(new URL(path,document.baseURI)))})));});expect(cached).toHaveLength(98);expect(cached.filter(r=>!r.available)).toEqual([]);await context.setOffline(true);
  const artifact='/workspace/artifacts/classic-iron-amrap';await fs.mkdir(artifact,{recursive:true});
  for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){
    await page.setViewportSize({width,height:844});await start(page);await page.clock.runFor(3000);
    for(const state of ['training','rest','paused']){
      if(state==='rest')await roundButton(page).click();if(state==='paused')await page.getByRole('button',{name:'Pause',exact:true}).click();
      for(const scale of [100,200]){
        const zoom=scale===200?await page.addStyleTag({content:'html{font-size:200%}'}):null;
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.hm-active-view input')).toHaveCount(0);expect(await roundButton(page).evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(238, 239, 88)');
        await page.keyboard.press('Tab');for(const button of await page.locator('.active-controls button,.round-complete').all()){expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);if(await button.isEnabled()){await button.focus();expect(await button.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');}}
        await page.screenshot({path:`${artifact}/${width}-${state}-${scale}.png`,fullPage:true});if(zoom)await zoom.evaluate(n=>n.remove());
      }
    }
    await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.fastForward(1200000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await page.getByRole('button',{name:'View saved session',exact:true}).click();await expect(page.getByText('Completed rounds: 1',{exact:true})).toBeVisible();
  }
  expect((await records(page)).every(r=>r.status==='completed'&&r.activeDurationMs===1200000&&r.results.completedRounds===1)).toBe(true);await context.setOffline(false);
});

test('completed rounds sync with account ownership through existing transport; old history remains byte-for-byte intact',async({page})=>{
  await setup(page,{url:'https://kb-test.supabase.co',publishableKey:'sb_publishable_test'});const db=await mockCloud(page);await page.goto('./#account');await page.getByLabel('Email',{exact:true}).fill('alice@example.test');await page.getByLabel('Password',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.getByText('Signed in as alice@example.test',{exact:true})).toBeVisible();await expect(page.locator('.cloud-indicator')).toHaveText('Synced');
  const old=await page.evaluate(async()=>{const {savedRecord}=await import('./tests/helpers/progress-records.js');return (await import('./src/storage/session-store.js')).completeSession(savedRecord({id:'00000000-0000-4000-8000-000000000008',ownerId:'11111111-1111-4111-8111-111111111111',workoutId:'monday-paranoid',version:4,startedAt:'2026-11-12T10:00:00Z',weight:12.5,reps:17}));});await expect.poll(()=>db.sessions.size).toBe(1);const oldRemote=structuredClone([...db.sessions.values()][0]);
  await start(page);await page.clock.runFor(3000);await roundButton(page).click();await page.clock.fastForward(1200000);expect(db.sessions.size).toBe(1);db.fail=true;await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await expect(page.locator('.cloud-session-status')).toHaveText('Sync pending');const saved=(await records(page)).find(r=>r.workoutId==='classic-iron');expect(saved.ownerId).toBe('11111111-1111-4111-8111-111111111111');expect(saved.results).toEqual({completedRounds:1});db.fail=false;await page.evaluate(async()=>(await import('./src/cloud/runtime.js')).sync.sync());await expect.poll(()=>db.sessions.size).toBe(2);await expect(page.locator('.cloud-session-status')).toHaveText('Synced');const remote=[...db.sessions.values()].find(r=>r.id===saved.id);expect(remote.results).toEqual({completedRounds:1});expect(remote.workout_snapshot).toEqual(saved.workoutSnapshot);expect(remote.session_data).toEqual(saved);
  expect(await page.evaluate(async id=>(await import('./src/storage/session-store.js')).getSession(id),old.id)).toEqual(old);expect([...db.sessions.values()].find(r=>r.id===old.id)).toEqual(oldRemote);await page.getByRole('button',{name:'View saved session',exact:true}).click();await page.reload();await expect(page.getByText('Completed rounds: 1',{exact:true})).toBeVisible();await page.getByRole('link',{name:'History',exact:true}).click();await expect(page.locator('.library-grid > button')).toHaveCount(2);await page.getByRole('link',{name:'Progress',exact:true}).click();await expect(page.getByRole('region',{name:'Monthly overview',exact:true}).locator('.progress-metric').filter({hasText:'Completed workouts'}).locator('dd')).toHaveText('2');
});
