import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';

const assignments={Monday:{workoutId:'monday-paranoid',version:3},Tuesday:{workoutId:'tuesday-of-spades',version:1},Thursday:{workoutId:'thursday-bells',version:1},Friday:{workoutId:'friday-to-black',version:1}};
async function localPlan(page){
 await page.addInitScript(plan=>{
  window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};
  if(localStorage.getItem('kb2.weekly-plan.v1')===null)localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan));
 },assignments);
}

test('Today-only redesign keeps exact content and protects all other screens at four widths',async({browser,baseURL},info)=>{
 test.setTimeout(120000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){
  for(const state of ['today','library','details','timer','results','history','account']){
   const args=[browser,baseURL,{width,height:844},`${width}`,state,true];
   const options={headerEvidence:true,todayEvidence:true,artifactRoot:'/workspace/artifacts/ui-v2-07/regressions/today'};
   const before=await capture(...args,{...options,todayBaseline:true});
   const after=await capture(...args,{...options,audit:true});
   expect(after.headerPNG.equals(before.headerPNG),`${width}/${state}: header unchanged`).toBe(true);
   expect(after.navPNG.equals(before.navPNG),`${width}/${state}: navigation unchanged`).toBe(true);
   expect(after.todayDOM,`${width}/${state}: no content/semantic changes`).toEqual(before.todayDOM);
   if(state==='today'){
    expect(after.contentPNG.equals(before.contentPNG),'intended Today card changes').toBe(false);
    expect(after.viewportPNG.equals(before.viewportPNG)).toBe(false);
   }else{
    expect(after.contentPNG.equals(before.contentPNG),`${state}: protected content pixels`).toBe(true);
    expect(after.viewportPNG.equals(before.viewportPNG),`${state}: protected viewport pixels`).toBe(true);
    expect(after.protectedMetrics,`${state}: protected geometry/styles`).toEqual(before.protectedMetrics);
   }
  }
 }
});

test('all four Today cards keep detail navigation, keyboard focus, phase data and separate plan controls',async({page})=>{
 await localPlan(page);await page.goto('./#today');
 const original=await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'));
 const specs=[['Monday','Monday Paranoid','monday-paranoid',3],['Tuesday','Tuesday of Spades','tuesday-of-spades',1],['Thursday','Thursday Bells','thursday-bells',1],['Friday','Friday To Black','friday-to-black',1]];
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  for(const [day,name,id,version]of specs){
   const slot=page.getByRole('region',{name:day,exact:true}),card=slot.getByRole('button',{name:`View workout: ${name}`,exact:true});
   await expect(page.locator('.day-slot')).toHaveCount(7);await expect(page.locator('.week-grid .workout-card')).toHaveCount(4);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(card).toContainText('View workout →');await expect(card).not.toContainText('START WOD');
   await expect(card.locator('button,a')).toHaveCount(0);
   const footer=card.locator('.card-footer');
   expect(await footer.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color,height:n.getBoundingClientRect().height}))).toEqual({bg:'rgb(238, 239, 88)',color:'rgb(33, 34, 39)',height:44});
   await expect(card.locator('.phase-bar')).toHaveAttribute('role','img');
   const phases=await page.evaluate(async({id,version})=>{const {findWorkout}=await import('./src/data/catalog.js');return findWorkout(id,version).phases.map(p=>({id:p.id,durationSeconds:p.durationSeconds}));},{id,version});
   const segments=await card.locator('.phase-bar-segment').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.phase,width:parseFloat(n.style.width)})));
   expect(segments.map(p=>p.id)).toEqual(phases.map(p=>p.id));
   for(const [index,segment]of segments.entries())expect(segment.width).toBeCloseTo(phases[index].durationSeconds/phases.reduce((n,p)=>n+p.durationSeconds,0)*100,3);
   for(const label of ['Change workout','Remove']){
    const control=slot.getByRole('button',{name:label,exact:true});await expect(control).toBeVisible();
    expect(await control.evaluate(n=>n.closest('.workout-card')===null&&n.getBoundingClientRect().height>=44)).toBe(true);
   }
   await card.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(card).toBeFocused();
   expect(await card.evaluate(n=>getComputedStyle(n).outlineColor)).toBe('rgb(238, 239, 88)');
   await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp(`#workout/${id}/${version}$`));
   await expect(page.getByRole('button',{name:'Start Workout',exact:true})).toBeVisible();await expect(page.locator('.phase-clock')).toHaveCount(0);
   await page.getByRole('link',{name:'Today',exact:true}).click();
   await page.getByRole('region',{name:day,exact:true}).locator('.card-footer').click();await expect(page).toHaveURL(new RegExp(`#workout/${id}/${version}$`));
   await page.getByRole('link',{name:'Today',exact:true}).click();
  }
 }
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(original);
 await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button',{name:'Change workout'}).click();
 await page.getByRole('button',{name:'Cancel assignment',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(original);
 await page.getByRole('region',{name:'Wednesday',exact:true}).getByRole('button',{name:'Add workout'}).click();
 await page.getByRole('button',{name:'Assign to Wednesday: Tuesday of Spades',exact:true}).click();await page.reload();
 await expect(page.getByRole('region',{name:'Wednesday',exact:true}).getByRole('button',{name:'View workout: Tuesday of Spades',exact:true})).toBeVisible();
 await page.getByRole('region',{name:'Wednesday',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();await page.reload();
 await expect(page.getByRole('region',{name:'Wednesday',exact:true}).getByText('No workout assigned.',{exact:true})).toBeVisible();
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1')))).toEqual({...assignments,Wednesday:null});
});

test('Today styling and real detail CTA work offline, with preserved legacy and unavailable assignments',async({page,context})=>{
 await localPlan(page);await page.goto('./#today');
 await page.evaluate(()=>{
  const plan=JSON.parse(localStorage.getItem('kb2.weekly-plan.v1'));
  plan.Saturday={workoutId:'focus-001-upper-abs',version:1};plan.Sunday={workoutId:'missing-fixture',version:99};
  localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify(plan));
 });
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const original=await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'));
 expect(await page.evaluate(async()=>Boolean(await (await caches.open('kb2-static-v25')).match(new URL('./styles/hm-today.css',location.href))))).toBe(true);
 await context.setOffline(true);await page.reload();
 await expect(page.locator('.day-slot')).toHaveCount(7);await expect(page.locator('.week-grid .workout-card')).toHaveCount(5);
 const legacy=page.getByRole('region',{name:'Saturday',exact:true});
 await expect(legacy.getByRole('button',{name:'View workout: Upper Body + ABS',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Sunday',exact:true}).getByText('Assigned workout is unavailable. Your assignment is preserved.',{exact:true})).toBeVisible();
 await page.getByRole('region',{name:'Tuesday',exact:true}).locator('.card-footer').click();await expect(page).toHaveURL(/#workout\/tuesday-of-spades\/1$/);
 await expect(page.getByRole('region',{name:'Conditioning block',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Today',exact:true}).click();
 expect(await page.locator('.week-grid .card-footer').first().evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(238, 239, 88)');
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(original);
 await context.setOffline(false);
});
