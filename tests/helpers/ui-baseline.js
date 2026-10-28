import {expect} from '@playwright/test';
import fs from 'node:fs/promises';
export const legacyCSS=await fs.readFile(new URL('../fixtures/ui-v2-01-app.css',import.meta.url),'utf8');
const root='/workspace/artifacts/ui-v2-05/regressions';
const previousHeader=await fs.readFile(new URL('../fixtures/ui-v2-02-header.html',import.meta.url),'utf8');
export async function capture(browser,baseURL,viewport,name,state,tokens,{audit=false,headerBaseline=false,headerEvidence=false,artifactRoot=root,todayBaseline=false,todayEvidence=false,libraryBaseline=false}={}){
 const context=await browser.newContext({baseURL,viewport,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'https://ui-fixture.supabase.co',publishableKey:'sb_publishable_fixture'};window.AudioContext=class{constructor(){throw Error('Fixture: audio unavailable');}};window.webkitAudioContext=undefined;localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Monday:{workoutId:'monday-paranoid',version:3},Tuesday:{workoutId:'tuesday-of-spades',version:1},Thursday:{workoutId:'thursday-bells',version:1},Friday:{workoutId:'friday-to-black',version:1}}));});
 if(libraryBaseline)await page.route('**/*',async route=>{
  if(route.request().isNavigationRequest()){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/\s*<link rel="stylesheet" href="\.\/styles\/hm-library\.css">/,'')});}
  return route.continue();
 });
 if(todayBaseline)await page.route('**/*',async route=>{
  if(route.request().isNavigationRequest()){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/\s*<link rel="stylesheet" href="\.\/styles\/hm-today\.css">/,'')});}
  return route.continue();
 });
 if(headerBaseline)await page.route('**/*',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/src/main.js')){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace("document.querySelector('.app-header .header-account')","document.querySelector('.app-header')")});}
  if(route.request().isNavigationRequest()){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/<header class="app-header">[\s\S]*?<\/header>/,previousHeader.trim()).replace(/\s*<link rel="stylesheet" href="\.\/styles\/hm-header\.css">/,'')});}
  return route.continue();
 });
 if(!tokens)await page.route('**/*',async route=>{if(new URL(route.request().url()).pathname.endsWith('/styles/app.css'))return route.fulfill({contentType:'text/css',body:legacyCSS});if(route.request().isNavigationRequest()){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/\s*<link rel="stylesheet" href="\.\/styles\/hm-tokens\.css">/,'')});}return route.continue();});
 await page.clock.install({time:new Date('2026-10-28T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T12:00:01Z'));
 await page.goto(state==='assignment'?'./#library?day=Monday':state==='account'?'./#account':state==='today'?'./#today':state==='library'?'./#library':'./#workout/monday-paranoid/3');
 if(state==='library'||state==='assignment')await expect(page.locator('.workout-card')).toHaveCount(4);
 if(state==='timer'){await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(13000);await expect(page.locator('.phase-clock')).toHaveText('00:50');await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();}
 if(state==='results'||state==='history'||state==='history-list'){
  await page.evaluate(async()=>{const {findWorkout}=await import('./src/data/catalog.js');const {createDraft}=await import('./src/domain/result-schemas.js');const {putDraft,completeSession}=await import('./src/storage/session-store.js');const {finalResults}=await import('./src/domain/result-schemas.js');const w=findWorkout('monday-paranoid',3),r=createDraft(w,{getItem:()=>null},'ui-foundation-fixture','2026-10-28T12:00:00Z');r.stage='finisher-results';r.blockIndex=5;r.completedBlocks=w.phases.map(p=>p.id);r.activeDurationMs=1270000;r.checkpointMs=1273000;r.completedAt='2026-10-28T12:21:13Z';r.form.weights['push-press']='12.5';r.form.finisherReps='17';r.form.perceivedEffort='7';r.form.notes='UI baseline fixture only';await putDraft(r);});
  if(state==='history'||state==='history-list'){await page.evaluate(async()=>{const {getSession,completeSession}=await import('./src/storage/session-store.js');const {finalResults}=await import('./src/domain/result-schemas.js');const r=await getSession('ui-foundation-fixture');r.results=finalResults(r);await completeSession(r);});await page.goto(state==='history-list'?'./#history/monday-paranoid':'./#session/ui-foundation-fixture');if(state==='history-list'){await expect(page.getByRole('heading',{name:'Saved workouts',exact:true})).toBeVisible();await expect(page.locator('.library-grid button')).toHaveCount(1);}else await expect(page.getByText('KB Thruster completed repetitions: 17',{exact:true})).toBeVisible();}else await page.goto('./#active/monday-paranoid/3?draft=ui-foundation-fixture');if(state==='results'){await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await expect(page.getByRole('spinbutton')).toHaveCount(13);}
 }
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.mouse.move(0,0);await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('navigation')).toBeInViewport();
 if(audit){
 const failures=await page.evaluate(()=>{
  const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=v=>v.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  const out=[];for(const n of document.querySelectorAll('body *')){if(!n.checkVisibility()||!Array.from(n.childNodes).some(c=>c.nodeType===3&&c.textContent.trim())||n.closest('[disabled]'))continue;const s=getComputedStyle(n);let bg;for(let p=n;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]===1){bg=c;break;}}if(!bg)continue;const fg=rgb(s.color),a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);if(ratio<(large?3:4.5))out.push({text:n.textContent.trim().slice(0,60),color:s.color,bg,ratio});}return out;
 });expect(failures).toEqual([]);
 await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));const reachable=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('#app button,#app input,#app textarea,#app select,#app a')].filter(n=>n.checkVisibility());return !nodes.length||nodes.at(-1).getBoundingClientRect().bottom<=document.querySelector('nav').getBoundingClientRect().top;});expect(reachable).toBe(true);await page.evaluate(()=>scrollTo(0,0));
 }
 const metrics=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('.workout-card,.phase-bar,nav,nav a,input,textarea,select,.active-panel,.phase-clock')];return {geometry:nodes.map(n=>{const r=n.getBoundingClientRect();return [n.tagName,r.x,r.y,r.width,r.height];}),styles:nodes.filter(n=>!n.matches('.phase-bar')).map(n=>{const s=getComputedStyle(n);return [s.backgroundColor,s.color,s.fontSize,s.borderRadius,s.padding];})};});
 const dir=`${artifactRoot}/${process.env.HM_CAPTURE_PRECHANGE?'pre-change':headerBaseline||todayBaseline||libraryBaseline?'before':tokens?'after':'before'}`;await fs.mkdir(dir,{recursive:true});const png=await page.screenshot({path:`${dir}/${name}-${state}.png`,fullPage:true,animations:'disabled',style:'nav{visibility:hidden}'});if(audit){await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.screenshot({path:`${dir}/${name}-${state}-viewport.png`,animations:'disabled'});}let protectedMetrics,contentPNG,viewportPNG;
 if(headerEvidence){
  await page.evaluate(()=>scrollTo(0,0));
  protectedMetrics=await page.evaluate(()=>{
   const origin=document.querySelector('#app').getBoundingClientRect().top;
   const selectors='#app,#app *,#status,nav,nav *';
   return [...document.querySelectorAll(selectors)].filter(n=>n.checkVisibility()).map(n=>{
    const r=n.getBoundingClientRect(),s=getComputedStyle(n),inContent=n.closest('#app')||n.id==='status';
    return {tag:n.tagName,text:n.childElementCount?null:n.textContent,box:[r.x,inContent?r.y-origin:r.y,r.width,r.height],style:[s.color,s.backgroundColor,s.border,s.borderRadius,s.padding,s.font,s.lineHeight,s.boxShadow]};
   });
  });
  // Normalize the header's intentional vertical displacement only for the content pixel check.
  contentPNG=await page.locator('#app').screenshot({path:`${dir}/${name}-${state}-content.png`,animations:'disabled',style:'nav{visibility:hidden}.app-header{display:none!important}'});
  await page.evaluate(()=>scrollTo(0,0));
  viewportPNG=await page.screenshot({path:`${dir}/${name}-${state}-viewport.png`,animations:'disabled'});
  if(!headerBaseline){
   await expect(page.getByRole('link',{name:'Heavy Metal KB home',exact:true})).toBeVisible();
   await expect(page.locator('.brand-logo')).toBeVisible();
   expect(await page.locator('.brand-logo').evaluate(n=>n.complete&&n.naturalWidth===1254&&n.naturalHeight===1254)).toBe(true);
   const bounds=await page.evaluate(()=>{
    const header=document.querySelector('.app-header').getBoundingClientRect(),rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {header:{x:header.x,y:header.y,right:header.right,bottom:header.bottom,height:header.height},brand:rect('.brand-lockup'),logo:rect('.brand-logo'),name:rect('.brand-name'),account:rect('.account-control'),sync:rect('.cloud-indicator')};
   });
   expect(bounds.brand.right).toBeLessThanOrEqual(bounds.account.x);expect(bounds.logo.right).toBeLessThanOrEqual(bounds.name.x);expect(bounds.account.bottom).toBeLessThanOrEqual(bounds.sync.y);
   for(const key of ['brand','logo','name','account','sync']){const r=bounds[key];expect(r.x).toBeGreaterThanOrEqual(bounds.header.x);expect(r.right).toBeLessThanOrEqual(bounds.header.right);expect(r.y).toBeGreaterThanOrEqual(bounds.header.y);expect(r.bottom).toBeLessThanOrEqual(bounds.header.bottom);}
   expect(bounds.account.height).toBeGreaterThanOrEqual(44);expect(bounds.header.height).toBeLessThanOrEqual(110);
  }
 }
 let todayDOM,headerPNG,navPNG,libraryDOM;
 if(todayEvidence){
  libraryDOM=await page.locator('.hm-library-view .library-grid').count()?await page.locator('.hm-library-view .library-grid').evaluate(n=>n.innerHTML):null;
  todayDOM=await page.locator('.week-grid').count()?await page.locator('.week-grid').evaluate(n=>n.outerHTML):null;
  await page.evaluate(()=>scrollTo(0,0));
  headerPNG=await page.locator('.app-header').screenshot({animations:'disabled'});
  await page.evaluate(()=>scrollTo(0,0));
  navPNG=await page.screenshot({clip:await page.getByRole('navigation').boundingBox(),animations:'disabled'});
 }
 expect(errors).toEqual([]);await context.close();return {png,metrics,protectedMetrics,contentPNG,viewportPNG,todayDOM,headerPNG,navPNG,libraryDOM};
}
