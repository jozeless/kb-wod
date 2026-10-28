import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const root='/workspace/artifacts/ui-v2-01';
async function capture(browser,baseURL,viewport,name,state,tokens){
 const context=await browser.newContext({baseURL,viewport,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};window.AudioContext=class{constructor(){throw Error('Fixture: audio unavailable');}};window.webkitAudioContext=undefined;localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Monday:{workoutId:'monday-paranoid',version:3},Tuesday:{workoutId:'tuesday-of-spades',version:1},Thursday:{workoutId:'thursday-bells',version:1},Friday:{workoutId:'friday-to-black',version:1}}));});
 if(!tokens)await page.route('**/*',async route=>{if(route.request().isNavigationRequest()){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/\s*<link rel="stylesheet" href="\.\/styles\/hm-tokens\.css">/,'')});}return route.continue();});
 await page.clock.install({time:new Date('2026-10-28T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T12:00:01Z'));
 await page.goto(state==='today'?'./#today':state==='library'?'./#library':'./#workout/monday-paranoid/3');
 if(state==='library')await expect(page.locator('.workout-card')).toHaveCount(4);
 if(state==='timer'){await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(13000);await expect(page.locator('.phase-clock')).toHaveText('00:50');await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();}
 if(state==='results'){
  await page.evaluate(async()=>{const {findWorkout}=await import('./src/data/catalog.js');const {createDraft}=await import('./src/domain/result-schemas.js');const {putDraft}=await import('./src/storage/session-store.js');const w=findWorkout('monday-paranoid',3),r=createDraft(w,{getItem:()=>null},'ui-foundation-fixture','2026-10-28T12:00:00Z');r.stage='finisher-results';r.blockIndex=5;r.completedBlocks=w.phases.map(p=>p.id);r.activeDurationMs=1270000;r.checkpointMs=1273000;r.completedAt='2026-10-28T12:21:13Z';r.form.weights['push-press']='12.5';r.form.finisherReps='17';r.form.perceivedEffort='7';r.form.notes='UI baseline fixture only';await putDraft(r);});
  await page.goto('./#active/monday-paranoid/3?draft=ui-foundation-fixture');await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await expect(page.getByRole('spinbutton')).toHaveCount(13);
 }
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.mouse.move(0,0);await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('navigation')).toBeInViewport();
 const dir=`${root}/${process.env.HM_CAPTURE_PRECHANGE?'pre-change':tokens?'after':'before'}`;await fs.mkdir(dir,{recursive:true});const png=await page.screenshot({path:`${dir}/${name}-${state}.png`,fullPage:true,animations:'disabled'});expect(errors).toEqual([]);await context.close();return png;
}
test('five deterministic visual baselines retain identical pixels with and without inactive tokens',async({browser,baseURL},info)=>{
 test.setTimeout(90000);const viewport=info.project.use.viewport;
 for(const state of ['library','today','details','timer','results']){const before=await capture(browser,baseURL,viewport,info.project.name,state,false);if(process.env.HM_CAPTURE_PRECHANGE)continue;const after=await capture(browser,baseURL,viewport,info.project.name,state,true);expect(after.equals(before),`${state}: same-environment before/after PNG`).toBe(true);}
});
test('exact tokens load ahead of app.css, preserve legacy style roles and work offline',async({page,context})=>{
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await page.goto('./#library');
 const expected={'--hm-bg':'#212227','--hm-surface-primary':'#312F4E','--hm-surface-secondary':'#4D4A6A','--hm-accent':'#B37ACB','--hm-highlight':'#EEEF58','--hm-text-primary':'#EDECEE'};
 const read=()=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),Object.keys(expected));expect(await read()).toEqual(expected);
 expect(await page.locator('link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(['./styles/hm-tokens.css','./styles/app.css']);
 expect(await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return {accent:s.getPropertyValue('--accent').trim(),line:s.getPropertyValue('--line').trim(),bg:s.backgroundColor,color:s.color};})).toEqual({accent:'#244e40',line:'#d7dfd6',bg:'rgb(245, 245, 239)',color:'rgb(24, 43, 38)'});
 await expect(page.locator('.workout-card')).toHaveCount(4);await page.locator('.workout-card').first().focus();await expect(page.locator('.workout-card').first()).toBeFocused();expect(await page.locator('.workout-card').first().evaluate(n=>getComputedStyle(n).outlineStyle)).not.toBe('none');
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));expect(await page.evaluate(async()=>Boolean(await (await caches.open('kb2-static-v19')).match(new URL('./styles/hm-tokens.css',location.href))))).toBe(true);
 await context.setOffline(true);await page.reload();expect(await read()).toEqual(expected);await expect(page.locator('.workout-card')).toHaveCount(4);expect(await page.evaluate(async()=>(await fetch('./styles/hm-tokens.css')).status)).toBe(200);await context.setOffline(false);
});
