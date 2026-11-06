import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {installBeepSpy} from './helpers/timer-beeps.js';
const releases=[['monday-paranoid',4,1270],['tuesday-of-spades',2,1200],['thursday-bells',2,1270],['friday-to-black',2,1200]];
const chrome=page=>[page.locator('.app-header'),page.getByRole('navigation',{name:'Main navigation',includeHidden:true})];
async function setup(page){await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-06T12:00:01Z'));}
async function start(page,id='monday-paranoid',v=4){await page.goto(`./#workout/${id}/${v}`);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');}
async function focus(page,on){for(const node of chrome(page))on?await expect(node).toBeHidden():await expect(node).toBeVisible();await expect(page.locator('body')).toHaveClass(on?/hm-training-focus/:/^(?!.*hm-training-focus)/);}
const stored=page=>page.evaluate(async()=>(await import('./src/storage/session-store.js')).listSessions());

test('focus hierarchy is exact, controls are icon-only and accessible, and real timing/current/next remain synchronized',async({page})=>{
 await setup(page);await installBeepSpy(page);await start(page);await focus(page,true);
 await expect(page.locator('.hm-active-view h1')).toHaveText('Upper · GET READY');await expect(page.locator('.hm-active-view input,.hm-active-view select,.hm-active-view textarea,.hm-active-view .page-heading,.session-time-label')).toHaveCount(0);
 expect(await page.locator('.active-panel').evaluate(n=>[...n.children].filter(n=>!n.matches('progress')).map(n=>n.className))).toEqual(['eyebrow focus-phase','session-dial','active-controls','session-timing','current-exercise-card']);
 expect(await page.locator('.active-controls button').allTextContents()).toEqual(['','']);await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'End Workout',exact:true})).toBeVisible();
 await page.clock.runFor(13000);await expect(page.getByRole('timer')).toHaveText('00:30');await expect(page.locator('.block-time')).toHaveText('07:50');await expect(page.locator('.session-total')).toHaveText('21:00');await expect(page.locator('.active-exercise')).toHaveText('KB Push Press');await expect(page.locator('.session-next-name')).toHaveText('KB Offset Push-Up');
 await page.clock.runFor(30000);await expect(page.locator('.focus-phase')).toHaveText('Upper · REST');await expect(page.locator('.session-state')).toHaveText('REST');await expect(page.getByRole('timer')).toHaveText('00:20');expect(await page.evaluate(()=>beepNotes.map(n=>n.frequency))).toEqual([640,520,520]);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.focus-phase')).toHaveText('Upper · PAUSED');await expect(page.locator('.icon-play')).toBeVisible();await expect(page.locator('.icon-pause')).toBeHidden();
 await page.clock.fastForward(600000);await expect(page.getByRole('timer')).toHaveText('00:20');await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(20000);await expect(page.locator('.active-exercise')).toHaveText('KB Offset Push-Up');await expect(page.getByRole('timer')).toHaveText('00:40');await focus(page,true);
});

test('weight initialization, final corrections/saving and chrome restoration work without a route change for all four new releases',async({page})=>{
 await setup(page);
 for(const [id,v,seconds]of releases){await page.goto(`./#workout/${id}/${v}`);await focus(page,false);const input=page.locator('.hm-workout-overview input').first(),label=await input.getAttribute('aria-label');await input.fill('12.5');await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');await focus(page,true);const url=page.url();
  await expect(page.locator('.active-workout input,.active-workout select')).toHaveCount(0);await page.clock.fastForward(seconds*1000+3000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await focus(page,false);expect(page.url()).toBe(url);
  const weights=page.getByRole('spinbutton',{name:/actual weight \(kg\)$/i});await expect(weights.first()).toHaveValue('12.5');await weights.first().fill('13.5');await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await focus(page,false);expect(page.url()).toBe(url);
  const record=(await stored(page)).find(r=>r.workoutId===id&&r.workoutVersion===v);expect(record.status).toBe('completed');expect(record.activeDurationMs).toBe(seconds*1000);expect(Object.values(record.results.exerciseWeights)[0]).toBe(13.5);
  await page.getByRole('button',{name:'View saved session',exact:true}).click();await focus(page,false);await page.goto(`./#workout/${id}/${v}`);await expect(page.getByRole('spinbutton',{name:label,exact:true})).toHaveValue('12.5');
 }
});

test('inter-block result forms, countdown/transition/finisher and legacy completion restore focus chrome correctly',async({page})=>{
 await setup(page);page.on('dialog',d=>d.accept());await start(page,'focus-001-upper-abs',2);await page.clock.fastForward(603000);await expect(page.getByRole('heading',{name:'Upper Results',exact:true})).toBeVisible();await focus(page,false);const url=page.url();await page.getByRole('button',{name:'Continue to ABS',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3');await focus(page,true);expect(page.url()).toBe(url);await expect(page.locator('.focus-phase')).toHaveText('ABS · GET READY');
 await start(page,'monday-paranoid',4);await page.clock.fastForward(483000);await expect(page.locator('.session-state')).toHaveText('TRANSITION');await expect(page.getByRole('timer')).toHaveText('00:05');await expect(page.locator('.session-next-name')).toHaveText('KB Dead Bug + Chest Press');await focus(page,true);await page.clock.fastForward(730000);await expect(page.locator('.session-state')).toHaveText('AMRAP REPS');await expect(page.locator('.active-exercise')).toHaveText('KB Thruster');await expect(page.locator('.hm-active-view input')).toHaveCount(0);
 await start(page,'focus-001-upper-abs',1);await expect(page.locator('.block-time')).toHaveText('10:00');await expect(page.locator('.session-total')).toHaveText('20:00');await page.clock.fastForward(603000);await expect(page.locator('.block-time')).toHaveText('10:00');await expect(page.locator('.session-total')).toHaveText('10:00');await page.clock.fastForward(600000);await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toBeVisible();await focus(page,false);
});

test('special circuits retain only essential names/reps, and Thursday holding-side switch stays clear',async({page},info)=>{
 test.setTimeout(90000);await fs.mkdir('/workspace/artifacts/active-workout-focus-mode',{recursive:true});
 async function scaledSpecial(label){
  const style=await page.addStyleTag({content:'html{font-size:200%}'});
  for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){
   await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const boxes=await page.locator('.focus-phase,.session-dial,.active-controls,.session-timing,.current-exercise-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));for(let i=1;i<boxes.length;i++)expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i-1].bottom-1);
   await page.getByRole('button',{name:'End Workout',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'End Workout',exact:true})).toBeInViewport();await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`/workspace/artifacts/active-workout-focus-mode/${width}-${label}-200.png`,fullPage:true});
  }
  await style.evaluate(n=>n.remove());
 }
 await setup(page);page.on('dialog',d=>d.accept());
 for(const [id,v]of [['tuesday-of-spades',2],['friday-to-black',2],['hybrid-001-strength-sweat',1]]){await start(page,id,v);await page.clock.fastForward(963000);const list=page.getByRole('list',{name:'AMRAP circuit',exact:true});await expect(list.locator('li')).toHaveCount(3);await expect(list.locator('input')).toHaveCount(0);await expect(list.locator('.circuit-target')).toHaveCount(3);await expect(page.locator('.session-next-name')).not.toBeEmpty();await focus(page,true);await scaledSpecial(`${id}-amrap`);}
 await start(page,'thursday-bells',2);await page.clock.fastForward(1213000);await expect(page.locator('.holding-side')).toHaveText('Holding: RIGHT hand');await expect(page.locator('.session-next-name')).toHaveText('LEFT hand (automatic switch)');await scaledSpecial('thursday-right');await page.clock.runFor(30000);await expect(page.locator('.holding-side')).toHaveText('Holding: LEFT hand');await expect(page.getByRole('timer')).toHaveText('00:30');await focus(page,true);await scaledSpecial('thursday-left');
});

test('End cancellation keeps focus/timer, confirmed End restores Today once and other destinations stay normal',async({page})=>{
 await setup(page);let accept=false;const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());return accept?d.accept():d.dismiss();});await start(page);await page.clock.runFor(13000);await page.getByRole('button',{name:'End Workout',exact:true}).click();expect(dialogs).toHaveLength(1);await focus(page,true);await page.clock.runFor(1000);await expect(page.getByRole('timer')).toHaveText('00:29');accept=true;await page.getByRole('button',{name:'End Workout',exact:true}).click();expect(dialogs).toHaveLength(2);await expect(page).toHaveURL(/#today$/);await focus(page,false);
 for(const hash of ['library','history','progress','account']){await page.goto(`./#${hash}`);await focus(page,false);}
});

test('Focus Mode fits four widths/200% text with safe areas, two touch targets, keyboard and no overlaps',async({page},info)=>{
 test.setTimeout(120000);await setup(page);await start(page);await page.clock.runFor(13000);const root='/workspace/artifacts/active-workout-focus-mode';await fs.mkdir(root,{recursive:true});
 for(const scale of [100,200]){const style=scale===200?await page.addStyleTag({content:'html{font-size:200%}'}):null;for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){await page.setViewportSize({width,height:844});await page.keyboard.press('Tab');await page.getByRole('button',{name:'Pause',exact:true}).focus();expect(await page.getByRole('button',{name:'Pause',exact:true}).evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'End Workout',exact:true})).toBeFocused();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const sizes=await page.locator('.active-controls button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right};}));for(const b of sizes){expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width);}expect(sizes[0].right).toBeLessThan(sizes[1].left);
   const boxes=await page.locator('.focus-phase,.session-dial,.active-controls,.session-timing,.current-exercise-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));for(let i=1;i<boxes.length;i++)expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i-1].bottom-1);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${root}/${width}-work-${scale}.png`,fullPage:true});await page.screenshot({path:`${root}/${width}-viewport-${scale}.png`});
  }if(style)await style.evaluate(n=>n.remove());}
 await page.emulateMedia({forcedColors:'active'});await page.getByRole('button',{name:'Pause',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.session-state')).toHaveText('PAUSED');
});

// Hiding routine status must never conceal the existing storage failure warning.
test('live focus hides routine draft status but retains failures and the timer continues',async({page})=>{
 await setup(page);await start(page);await page.clock.runFor(13000);await expect(page.getByText('Draft saved locally.',{exact:true})).toBeHidden();
 await page.evaluate(()=>{window.restoreStorePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='sessions')throw Error('Fixture quota failure');return window.restoreStorePut.apply(this,args);};});
 await page.clock.runFor(1000);await expect(page.getByText('Draft could not be saved. Keep this screen open and retry before continuing.',{exact:true})).toBeVisible();await expect(page.getByRole('timer')).toHaveText('00:29');await focus(page,true);
 await page.evaluate(()=>{IDBObjectStore.prototype.put=window.restoreStorePut;});await page.clock.runFor(1000);await expect(page.getByText('Draft saved locally.',{exact:true})).toBeHidden();await expect(page.getByRole('timer')).toHaveText('00:28');
});
