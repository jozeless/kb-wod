import {test,expect} from '@playwright/test';
import {mockCloud} from './helpers/cloud.js';
import {installBeepSpy} from './helpers/timer-beeps.js';
const definitions=[['classic-iron','Classic Iron',1200,69],['core-blast','Core Blast',300,49],['iron-twist','Iron Twist',300,49],['saturday-morning-beef','Saturday Morning Beef',300,49],['iron-arms','Iron Arms',1200,74]];
const records=page=>page.evaluate(async()=>(await import('./src/storage/session-store.js')).listSessions());
async function clock(page){await installBeepSpy(page);await page.clock.install({time:new Date('2026-11-13T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-13T12:00:01Z'));}
async function login(page,email='alice@example.test'){await page.goto('./#account');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.locator('.cloud-indicator')).toHaveText('Synced');}
for(const [id,name,duration,maximum]of definitions){
 test(`${name}: shared Focus Mode, exact round times, editable extra reps, offline save, History and independent Progress`,async({page,context})=>{
  await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await clock(page);
  await page.goto(`./#workout/${id}/1`);if(id==='iron-twist'||id==='saturday-morning-beef')await expect(page.getByText('Prescribed kettlebell: 8 kg',{exact:true})).toBeVisible();
  if(id==='iron-arms'){
   await expect(page.locator('.prescriptions strong')).toHaveText(['KB Swing','KB Clean & Press','Single-Arm KB Bent-Over Row','Around the World','Dead Bug + Pullover','KB Squat + Biceps Curl','KB Standing Calf Raise']);
   await expect(page.locator('.prescriptions .exercise-target')).toHaveText(['10 repetitions','10 repetitions total','10 repetitions total','10 repetitions total','10 repetitions','10 repetitions','15 repetitions']);
   await expect(page.getByText(/1-second pause at the top/)).toBeVisible();
   await expect(page.getByText(/Prescribed kettlebell/)).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
  }
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.getByRole('button',{name:'Start Workout',exact:true}).click();const timer=page.locator('.phase-clock'),round=page.getByRole('button',{name:'Ronda completa',exact:true});
  await expect(timer).toHaveText('3');await expect(round).toBeDisabled();await page.clock.runFor(1000);await expect(timer).toHaveText('2');await page.clock.runFor(1000);await expect(timer).toHaveText('1');await page.clock.runFor(1000);await expect(timer).toHaveText(duration===1200?'20:00':'05:00');await expect(page.locator('nav')).toBeHidden();await expect(page.locator('.active-circuit li')).toHaveCount(duration===1200?7:5);expect(await page.evaluate(()=>beepNotes.map(note=>note.frequency))).toEqual([640]);
  await page.clock.runFor(30000);await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(90000);await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(40000);
  await round.evaluate(button=>{button.click();button.click();});await expect(page.getByLabel('Completed rounds',{exact:true})).toHaveText('1');await expect(round).toBeDisabled();expect(await page.evaluate(()=>beepNotes.map(note=>note.frequency))).toEqual([640,520,520]);await expect(page.getByRole('timer',{name:'Rest remaining',exact:true})).toHaveText('Rest remaining: 00:20');
  await page.clock.runFor(7000);await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(60000);await expect(page.getByRole('timer',{name:'Rest remaining',exact:true})).toHaveText('Rest remaining: 00:13');await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(13000);
  await page.clock.runFor(80000);await round.click();await page.clock.runFor(95000);await round.click();expect(await records(page)).toEqual([]);
  await context.setOffline(true);await page.clock.fastForward(duration*1000-265000);await page.clock.runFor(100);
  await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await expect(page.getByText('Completed rounds: 3',{exact:true})).toBeVisible();await expect(page.getByText('Fastest round — Round 1, 01:10',{exact:true})).toBeVisible();
  const partial=page.getByRole('spinbutton',{name:'Additional repetitions',exact:true});await expect(partial).toHaveAttribute('max',String(maximum));await partial.fill(String(maximum+1));await page.getByRole('button',{name:'Save Workout',exact:true}).click();expect(await records(page)).toEqual([]);await partial.fill('20');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
  const [saved]=await records(page);expect(saved.workoutId).toBe(id);expect(saved.activeDurationMs).toBe(duration*1000);expect(saved.results).toEqual({completedRounds:3,partialReps:20,roundTimesMs:[70000,80000,75000]});
  await page.getByRole('button',{name:'View saved session',exact:true}).click();await page.reload();await expect(page.getByText('Additional repetitions: 20',{exact:true})).toBeVisible();for(const text of ['Round 1 — 01:10','Round 2 — 01:20','Round 3 — 01:15'])await expect(page.getByText(text,{exact:true})).toBeVisible();
  await page.goto('./#progress');await expect(page.getByRole('region',{name:`${name} · Fastest Round — All Time`,exact:true})).toContainText('01:10');for(const [,other]of definitions.filter(d=>d[0]!==id))await expect(page.getByRole('region',{name:`${other} · Fastest Round — All Time`,exact:true})).toContainText('Round times not recorded');await context.setOffline(false);
 });
 test(`${name}: completed payload synchronizes once under its owner and stays isolated after account switch`,async({page})=>{
  const db=await mockCloud(page);await clock(page);await login(page);
  await page.goto(`./#workout/${id}/1`);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await page.clock.runFor(3000);await page.clock.runFor(70000);await page.getByRole('button',{name:'Ronda completa',exact:true}).click();await page.clock.fastForward(duration*1000-70000);await page.clock.runFor(100);
  await page.getByRole('spinbutton',{name:'Additional repetitions',exact:true}).fill('20');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await expect.poll(()=>db.sessions.size).toBe(1);
  const [local]=await records(page),remote=[...db.sessions.values()][0];expect(remote.workout_id).toBe(id);expect(remote.user_id).toBe(local.ownerId);expect(remote.results).toEqual({completedRounds:1,partialReps:20,roundTimesMs:[70000]});expect(remote.session_data.workoutSnapshot.id).toBe(id);
  await page.goto('./#account');await page.getByRole('button',{name:'Log out',exact:true}).click();await login(page,'bob@example.test');await page.goto(`./#session/${local.id}`);await expect(page.getByText('Session unavailable',{exact:true})).toBeVisible();expect(db.sessions.size).toBe(1);expect((await records(page))[0]).toEqual(local);
 });
}

test('mini WODs and Iron Arms can be assigned independently and survive weekly-plan reload',async({page})=>{
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});
 for(const [index,[id,name]]of definitions.slice(1).entries()){
  const day=['Monday','Wednesday','Saturday','Sunday'][index];await page.goto(`./#library?day=${day}`);await expect(page.locator('.workout-card')).toHaveCount(5);await page.getByRole('button',{name:`Assign to ${day}: ${name}`,exact:true}).click();await expect(page.getByRole('region',{name:day,exact:true})).toContainText(name);
 }
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')))).toEqual({Monday:{workoutId:'core-blast',version:1},Wednesday:{workoutId:'iron-twist',version:1},Saturday:{workoutId:'saturday-morning-beef',version:1},Sunday:{workoutId:'iron-arms',version:1}});
});
