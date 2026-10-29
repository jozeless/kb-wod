import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';

const approved=[['monday-paranoid',3,'Monday Paranoid',1270],['tuesday-of-spades',1,'Tuesday of Spades',1200],['thursday-bells',1,'Thursday Bells',1270],['friday-to-black',1,'Friday To Black',1200]];
const initialPlan={Monday:{workoutId:'monday-paranoid',version:3},Tuesday:{workoutId:'tuesday-of-spades',version:1}};
const url=(id,version)=>`./#workout/${id}/${version}`;
async function localMode(page){
 await page.addInitScript(plan=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};if(localStorage.getItem('kb2.weekly-plan.v1')===null)localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan));},initialPlan);
 page.on('dialog',d=>d.accept());
}
async function keyboardFocus(page,node){await node.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(node).toBeFocused();expect(await node.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');}
const definition=(page,id,version)=>page.evaluate(async({id,version})=>{const {findWorkout}=await import('./src/data/catalog.js');return findWorkout(id,version);},{id,version});

test('all four pre-workout details intentionally change with exact content preserved at four widths',async({browser,baseURL},info)=>{
 test.setTimeout(150000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280])for(const [id,version]of approved){
  const args=[browser,baseURL,{width,height:844},`${width}-${id}`,'details',true];
  const options={headerEvidence:true,todayEvidence:true,artifactRoot:'/workspace/artifacts/ui-v2-09/regressions/details',workoutId:id,workoutVersion:version};
  const before=await capture(...args,{...options,detailsBaseline:true}),after=await capture(...args,{...options,audit:true});
  expect(after.detailsDOM).toEqual(before.detailsDOM);expect(after.viewportPNG.equals(before.viewportPNG)).toBe(false);expect(after.contentPNG.equals(before.contentPNG)).toBe(false);
  expect(after.headerPNG.equals(before.headerPNG)).toBe(true);expect(after.navPNG.equals(before.navPNG)).toBe(true);
 }
});

test('Today, Library, running timer, results, saved history and account remain pixel-identical',async({browser,baseURL},info)=>{
 test.setTimeout(150000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280])for(const state of ['today','library','timer','results','history','history-list','account']){
  const args=[browser,baseURL,{width,height:844},`${width}`,state,true],options={headerEvidence:true,todayEvidence:true,artifactRoot:'/workspace/artifacts/ui-v2-09/regressions/details'};
  const before=await capture(...args,{...options,detailsBaseline:true}),after=await capture(...args,{...options,audit:true});
  expect(after.viewportPNG.equals(before.viewportPNG),`${width}/${state}: protected viewport`).toBe(true);expect(after.contentPNG.equals(before.contentPNG)).toBe(true);expect(after.protectedMetrics).toEqual(before.protectedMetrics);
  expect(after.todayDOM).toEqual(before.todayDOM);expect(after.libraryDOM).toEqual(before.libraryDOM);expect(after.detailsDOM).toBeNull();
  expect(after.headerPNG.equals(before.headerPNG)).toBe(true);expect(after.navPNG.equals(before.navPNG)).toBe(true);
 }
});

test('all twelve real details preserve phases and inputs while Start follows the final phase without trailing copy',async({page})=>{
 await localMode(page);await page.goto('./#library');
 const catalog=await page.evaluate(async()=>{const {workouts}=await import('./src/data/catalog.js');return workouts.filter(w=>w.phases.length).map(w=>[w.id,w.version,w.name,w.durationSeconds]);});expect(catalog).toHaveLength(12);
 const known=[...approved,['focus-001-upper-abs',1,'Upper Body + ABS',1200]];
 const definitions=[...known,...catalog.filter(([id,version])=>!known.some(([knownId,knownVersion])=>id===knownId&&version===knownVersion))];expect(definitions).toHaveLength(12);
 for(const [id,version,name,seconds]of definitions){
  await page.goto(url(id,version));await expect(page.locator('.hm-detail-view')).toHaveCount(1);await expect(page.getByRole('heading',{level:1,name,exact:true})).toBeVisible();
  const w=await definition(page,id,version);expect(w.durationSeconds).toBe(seconds);
  await expect(page.locator('.hm-workout-overview > .badge')).toContainText(`VERSION ${version}`);
  const duration=await page.evaluate(async ms=>{const {formatTime}=await import('./src/domain/workout-timer.js');return formatTime(ms);},seconds*1000);
  await expect(page.locator('.overview-subtitle')).toHaveText(`${w.category} · ${duration}`);
  const sections=page.locator('.hm-workout-overview > .exercise-list');await expect(sections).toHaveCount(w.phases.length);
  const bars=await page.locator('.hm-workout-overview > .phase-bar > span').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.phase,width:parseFloat(n.style.width)})));
  expect(bars.map(p=>p.id)).toEqual(w.phases.map(p=>p.id));for(const [i,p]of bars.entries())expect(p.width).toBeCloseTo(w.phases[i].durationSeconds/seconds*100,3);
  for(const [index,phase]of w.phases.entries()){
   const section=sections.nth(index);await expect(section).toHaveAccessibleName(`${phase.name} block`);
   await expect(section.getByRole('heading',{level:2})).toHaveText(`${String(index+1).padStart(2,'0')} · ${phase.name.toUpperCase()}`);
   await expect(section.locator('.prescriptions > li')).toHaveCount(phase.exerciseIds.length);
   expect(await section.locator('.exercise-weight-row > strong').allTextContents()).toEqual(phase.exerciseIds.map(id=>w.exercises.find(e=>e.id===id).name));
   if(phase.format==='transition'){await expect(section).toContainText(`${phase.durationSeconds} seconds · Automatic rest transition`);await expect(section.locator('input,details,ol')).toHaveCount(0);continue;}
   for(const [i,exerciseId]of phase.exerciseIds.entries()){
    const ex=w.exercises.find(e=>e.id===exerciseId),row=section.locator('.prescriptions > li').nth(i);
    const target=await page.evaluate(async({ex,phase})=>{const {prescription}=await import('./src/ui/exercise-prescription.js');return phase.format==='intervals'&&!ex.target?`${phase.timer.workSeconds} s`:prescription(ex,phase);},{ex,phase});
    await expect(row.locator('.exercise-target')).toHaveText(target);
    if(ex.note)await expect(row).toContainText(ex.note);if(ex.attribution)await expect(row).toContainText(ex.attribution);
    if(ex.equipment==='bodyweight')await expect(row.locator('input')).toHaveCount(0);else await expect(row.getByRole('spinbutton',{name:`${ex.name} weight (kg)`,exact:true})).toBeVisible();
   }
   const guide=section.locator('details'),summary=guide.locator('summary');await expect(summary).toHaveText('Instructions & measurable goals');
   await keyboardFocus(page,summary);await page.keyboard.press('Enter');await expect(guide).toHaveAttribute('open','');await expect(guide).toContainText(phase.instructions);
   for(const goal of phase.objectives)await expect(guide).toContainText(goal);
   await page.keyboard.press('Enter');await expect(guide).not.toHaveAttribute('open','');
  }
  await expect(page.locator('.recording-overview,.recording-panel,.overview-guidance')).toHaveCount(0);
  await expect(page.getByText('REGISTRO AL TERMINAR',{exact:true})).toHaveCount(0);
  expect(await page.locator('.hm-workout-overview').evaluate(n=>n.lastElementChild.matches('.exercise-list')&&n.nextElementSibling.matches('button:not(.secondary)')&&n.nextElementSibling.textContent==='Start Workout')).toBe(true);
  expect(w.resultFields).toEqual(expect.any(Array));expect(w.warmup.note).toEqual(expect.any(String));expect(w.purpose).toEqual(expect.any(String));
  await expect(page.locator('button button,button input,summary button')).toHaveCount(0);expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(initialPlan);
 }
});

test('exercise-specific decimal, zero, blank and invalid weights retain validation and persist across routes/reloads',async({page})=>{
 await localMode(page);const firstLabels=[];
 for(const [index,[id,version]]of approved.entries()){
  await page.goto(url(id,version));const fields=page.locator('.hm-workout-overview input'),first=fields.nth(0),second=fields.nth(1);
  await expect(first).toHaveValue('');await expect(first).toHaveAttribute('min','0');await expect(first).toHaveAttribute('step','any');await expect(first).toHaveAttribute('inputmode','decimal');
  firstLabels.push(await first.getAttribute('aria-label'));const value=String(12.5+index);
  await first.fill(value);await second.fill('0');await page.reload();await expect(fields.nth(0)).toHaveValue(value);await expect(fields.nth(1)).toHaveValue('0');
  await fields.nth(0).fill('-1');await expect(fields.nth(0).locator('..').locator('..').locator('.weight-error')).toContainText('Enter zero or a positive weight in kg.');
  await page.getByRole('button',{name:'← Library',exact:true}).click();await expect(page.getByRole('heading',{name:'Library',exact:true})).toBeVisible();await page.goto(url(id,version));await expect(fields.nth(0)).toHaveValue(value);
  await fields.nth(1).fill('');await page.reload();await expect(fields.nth(0)).toHaveValue(value);await expect(fields.nth(1)).toHaveValue('');
 }
 for(const [index,[id,version]]of approved.entries()){await page.goto(url(id,version));await expect(page.getByRole('spinbutton',{name:firstLabels[index],exact:true})).toHaveValue(String(12.5+index));}
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(initialPlan);
});

test('Start, saved-session and existing draft recovery actions remain functional without changing the plan',async({page})=>{
 await localMode(page);await page.clock.install({time:new Date('2026-10-28T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T12:00:01Z'));
 for(const [id,version]of approved){
  await page.goto(url(id,version));const start=page.getByRole('button',{name:'Start Workout',exact:true});
  expect(await start.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color,height:n.getBoundingClientRect().height}))).toEqual({bg:'rgb(238, 239, 88)',color:'rgb(33, 34, 39)',height:50});
  await start.click();await expect(page.locator('.phase-clock')).toHaveText('3');await expect(page.locator('.hm-detail-view')).toHaveCount(0);
  await page.clock.runFor(4000);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'End Workout',exact:true}).click();await page.goto(url(id,version));const resume=page.getByRole('button',{name:/Resume draft —/});await expect(resume).toHaveCount(1);
  await resume.click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.hm-detail-view')).toHaveCount(0);
  await page.getByRole('button',{name:'End Workout',exact:true}).click();await page.goto(url(id,version));await page.getByRole('button',{name:'View saved sessions',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved workouts',exact:true})).toBeVisible();await expect(page.locator('.hm-detail-view')).toHaveCount(0);
 }
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(initialPlan);
});

test('detail fields, targets, instructions and actions fit four widths and 200% text with visible focus',async({page})=>{
 test.setTimeout(90000);await localMode(page);
 async function fits(){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const failures=await page.locator('.exercise-weight-row').evaluateAll(rows=>rows.flatMap(row=>{
   const name=row.querySelector('strong'),weight=row.querySelector('.weight-preference');if(!weight)return [];
   const a=name.getBoundingClientRect(),b=weight.getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top?[]:[name.textContent];
  }));expect(failures).toEqual([]);
  for(const input of await page.locator('.hm-detail-view input').all())expect(await input.evaluate(n=>n.getBoundingClientRect().height>=44&&n.getBoundingClientRect().right<=innerWidth)).toBe(true);
  for(const summary of await page.locator('.hm-detail-view summary').all())expect(await summary.evaluate(n=>n.getBoundingClientRect().height>=44)).toBe(true);
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));const start=page.getByRole('button',{name:'Start Workout',exact:true});await expect(start).toBeInViewport();expect(await start.evaluate(n=>n.getBoundingClientRect().bottom<=document.querySelector('nav').getBoundingClientRect().top)).toBe(true);
 }
 for(const [id,version]of approved){
  await page.goto(url(id,version));for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});await fits();}
  const zoom=await page.addStyleTag({content:'html{font-size:200%}'});for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});await fits();}await zoom.evaluate(n=>n.remove());
 }
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.setViewportSize({width:320,height:844});await fits();
 const field=page.locator('.hm-detail-view input').first();await keyboardFocus(page,field);const summary=page.locator('.hm-detail-view summary').first();await keyboardFocus(page,summary);await page.keyboard.press('Enter');await expect(summary.locator('..')).toHaveAttribute('open','');
 await keyboardFocus(page,page.getByRole('button',{name:'Start Workout',exact:true}));expect(await page.getByRole('button',{name:'Start Workout',exact:true}).evaluate(n=>getComputedStyle(n).color!==getComputedStyle(n).backgroundColor)).toBe(true);
});

test('offline approved/historical detail links work and demo/fallback stages never receive detail styles',async({page,context})=>{
 await localMode(page);await page.goto(url('monday-paranoid',3));await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 expect(await page.evaluate(async()=>Boolean(await (await caches.open('kb2-static-v28')).match(new URL('./styles/hm-details.css',location.href))))).toBe(true);
 await context.setOffline(true);
 for(const [id,version,name]of [...approved,['focus-001-upper-abs',1,'Upper Body + ABS']]){await page.goto(url(id,version));await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.locator('.hm-detail-view')).toHaveCount(1);await expect(page.getByRole('button',{name:'Start Workout',exact:true})).toBeVisible();}
 await page.goto('./#active/monday-paranoid/3');await expect(page.getByRole('heading',{name:'Ready when you are',exact:true})).toBeVisible();await expect(page.locator('.hm-detail-view')).toHaveCount(0);
 expect(await page.getByRole('button',{name:'Start Workout',exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(36, 78, 64)');
 for(const route of ['workout/demo-hybrid-foundation/1','active/demo-hybrid-foundation/1','result/demo-hybrid-foundation/1','stats','dashboard']){await page.goto(`./#${route}`);await expect(page.locator('.hm-detail-view')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1')))).toEqual(initialPlan);await context.setOffline(false);
});
