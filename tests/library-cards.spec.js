import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';

const approved=[['monday-paranoid',3,'Monday Paranoid',1270,'21:10 total'],['tuesday-of-spades',1,'Tuesday of Spades',1200,'20 minutes'],['thursday-bells',1,'Thursday Bells',1270,'21:10 total'],['friday-to-black',1,'Friday To Black',1200,'20 minutes']];
const plan={Monday:{workoutId:'monday-paranoid',version:3},Tuesday:{workoutId:'tuesday-of-spades',version:1},Thursday:{workoutId:'thursday-bells',version:1},Friday:{workoutId:'friday-to-black',version:1}};
async function localMode(page){
 await page.addInitScript(value=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};if(localStorage.getItem('kb2.weekly-plan.v1')===null)localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(value));},plan);
 page.on('dialog',d=>d.accept());
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')));
async function publicCards(page,action='View workout'){
 const cards=page.locator('.hm-library-view .workout-card');await expect(cards).toHaveCount(4);
 for(const [index,[id,version,name,seconds,label]]of approved.entries()){
  const card=cards.nth(index);await expect(card).toHaveAccessibleName(`${action}: ${name}`);await expect(card.locator('strong')).toHaveText(name);
  await expect(card.locator(':scope > span:not([class])')).toHaveText(label);await expect(card.locator('.card-footer')).toHaveText(`${action} →`);
  await expect(card.locator('button,a,input,[tabindex]')).toHaveCount(0);
  const actual=await page.evaluate(async({id,version})=>{const {findWorkout}=await import('./src/data/catalog.js');const w=findWorkout(id,version);return {seconds:w.durationSeconds,phases:w.phases.map(p=>({id:p.id,seconds:p.durationSeconds}))};},{id,version});
  expect(actual.seconds).toBe(seconds);
  const bars=await card.locator('.phase-bar-segment').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.phase,width:parseFloat(n.style.width)})));
  expect(bars.map(p=>p.id)).toEqual(actual.phases.map(p=>p.id));for(const [i,p]of bars.entries())expect(p.width).toBeCloseTo(actual.phases[i].seconds/seconds*100,3);
 }
 return cards;
}
async function keyboardFocus(page,card){await card.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(card).toBeFocused();expect(await card.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');}

test('Library and assignment redesign preserve Today, history grids, timer and every protected route',async({browser,baseURL},info)=>{
 test.setTimeout(150000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){
  for(const state of ['library','assignment','today','details','timer','results','history','history-list','account']){
   const args=[browser,baseURL,{width,height:844},`${width}`,state,true];
   const options={headerEvidence:true,todayEvidence:true,artifactRoot:'/workspace/artifacts/ui-v2-09/regressions/library'};
   const before=await capture(...args,{...options,libraryBaseline:true}),after=await capture(...args,{...options,audit:true});
   expect(after.headerPNG.equals(before.headerPNG),`${width}/${state}: header unchanged`).toBe(true);
   expect(after.navPNG.equals(before.navPNG),`${width}/${state}: navigation unchanged`).toBe(true);
   expect(after.todayDOM).toEqual(before.todayDOM);expect(after.libraryDOM).toEqual(before.libraryDOM);
   if(['library','assignment'].includes(state)){expect(after.viewportPNG.equals(before.viewportPNG)).toBe(false);expect(after.contentPNG.equals(before.contentPNG)).toBe(false);}
   else{expect(after.viewportPNG.equals(before.viewportPNG),`${width}/${state}: protected viewport`).toBe(true);expect(after.contentPNG.equals(before.contentPNG)).toBe(true);expect(after.protectedMetrics).toEqual(before.protectedMetrics);}
  }
 }
});

test('four ordered real cards open exact versions and Start Workout still starts each timer',async({page})=>{
 await localMode(page);await page.goto('./#library');await publicCards(page);
 const original=await stored(page);
 for(const [index,[id,version,name]]of approved.entries()){
  await page.locator('.hm-library-view .workout-card').nth(index).click();await expect(page).toHaveURL(new RegExp(`#workout/${id}/${version}$`));
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.locator('.phase-clock')).toHaveCount(0);
  await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');
  await page.getByRole('button',{name:'End Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Library',exact:true}).click();
  await page.locator('.hm-library-view .card-footer').nth(index).click();await expect(page).toHaveURL(new RegExp(`#workout/${id}/${version}$`));
  await page.getByRole('link',{name:'Library',exact:true}).click();
 }
 expect(await stored(page)).toEqual(original);
 expect(await page.evaluate(async()=>{const {listSessions}=await import('./src/storage/session-store.js');return (await listSessions()).filter(s=>s.status==='completed').length;})).toBe(0);
});

test('all seven assignment modes use real actions, cancel safely and change only the chosen day',async({page})=>{
 await localMode(page);await page.goto('./#today');
 for(const [index,day]of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].entries()){
  const before=await stored(page),region=page.getByRole('region',{name:day,exact:true});
  await region.getByRole('button',{name:before[day]?'Change workout':'Add workout',exact:true}).click();await publicCards(page,`Assign to ${day}`);
  await expect(page.locator('.hm-library-view .card-footer')).not.toContainText(['View workout','View workout','View workout','View workout']);
  expect(await stored(page)).toEqual(before);await page.getByRole('button',{name:'Cancel assignment',exact:true}).click();expect(await stored(page)).toEqual(before);
  await region.getByRole('button',{name:before[day]?'Change workout':'Add workout',exact:true}).click();
  const [id,version,name]=approved[index%4],card=page.getByRole('button',{name:`Assign to ${day}: ${name}`,exact:true});
  if(index%2){await keyboardFocus(page,card);await page.keyboard.press('Enter');}else await card.locator('.card-footer').click();
  await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
  const expected={...before,[day]:{workoutId:id,version}};expect(await stored(page)).toEqual(expected);await page.reload();expect(await stored(page)).toEqual(expected);
 }
 await page.getByRole('link',{name:'Library',exact:true}).click();await publicCards(page);await expect(page.getByRole('button',{name:'Cancel assignment',exact:true})).toHaveCount(0);
});

test('Library remains readable at four widths, enlarged text and forced colors with visible keyboard focus',async({page})=>{
 await localMode(page);await page.goto('./#library');
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});const cards=await publicCards(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
  if(width<640)expect(new Set(boxes.map(b=>b.x)).size).toBe(1);else expect(new Set(boxes.map(b=>b.x)).size).toBeGreaterThan(1);
  for(const card of await cards.all()){
   expect(await card.locator('.card-footer').evaluate(n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color,height:n.getBoundingClientRect().height}))).toEqual({bg:'rgb(238, 239, 88)',color:'rgb(33, 34, 39)',height:44});
   await keyboardFocus(page,card);expect(await card.evaluate(n=>getComputedStyle(n).outlineColor)).toBe('rgb(238, 239, 88)');
   expect(await card.evaluate(n=>{const r=n.getBoundingClientRect();return r.x>=7&&r.right<=innerWidth-7&&!Array.from(document.querySelectorAll('.hm-library-view,.library-grid,main')).some(p=>getComputedStyle(p).overflowX==='hidden');})).toBe(true);
  }
 }
 const zoom=await page.addStyleTag({content:'html{font-size:200%}'});
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const card of await page.locator('.hm-library-view .workout-card').all()){
   expect(await card.locator('strong').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(48);
   expect(await card.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  }
 }
 await zoom.evaluate(n=>n.remove());await page.setViewportSize({width:320,height:844});await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
 for(const card of await page.locator('.hm-library-view .workout-card').all()){
  await keyboardFocus(page,card);expect(await card.locator('.card-footer').evaluate(n=>getComputedStyle(n).color!==getComputedStyle(n).backgroundColor)).toBe(true);
  await expect(card.locator('strong')).toBeVisible();expect(await card.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 }
 await page.emulateMedia({forcedColors:'none'});
});

test('offline Library and assignment keep current and historical resources and the existing app identity',async({page,context})=>{
 await localMode(page);await page.goto('./#library');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 expect(await page.evaluate(async()=>Boolean(await (await caches.open('kb2-static-v29')).match(new URL('./styles/hm-library.css',location.href))))).toBe(true);
 await context.setOffline(true);await page.reload();await publicCards(page);
 const original=await stored(page);await page.locator('.hm-library-view .card-footer').first().click();await expect(page).toHaveURL(/#workout\/monday-paranoid\/3$/);await expect(page.getByRole('button',{name:'Start Workout',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Today',exact:true}).click();await page.getByRole('region',{name:'Wednesday',exact:true}).getByRole('button',{name:'Add workout',exact:true}).click();await publicCards(page,'Assign to Wednesday');
 await page.getByRole('button',{name:'Assign to Wednesday: Friday To Black',exact:true}).click();expect(await stored(page)).toEqual({...original,Wednesday:{workoutId:'friday-to-black',version:1}});
 await page.goto('./#workout/focus-001-upper-abs/1');await expect(page.getByRole('heading',{name:'Upper Body + ABS',exact:true})).toBeVisible();
 expect(await page.evaluate(async()=>{const {workouts}=await import('./src/data/catalog.js');return workouts.length;})).toBe(15);
 await context.setOffline(false);
});
