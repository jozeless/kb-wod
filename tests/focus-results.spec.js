import {verifyWorkoutBeeps} from './helpers/timer-beeps.js';
import { test, expect } from '@playwright/test';
const detail='./#workout/focus-001-upper-abs/2';
async function clock(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));}
async function sessions(page){return page.evaluate(async()=>{const {listSessions}=await import('./src/storage/session-store.js');return listSessions('focus-001-upper-abs');});}
async function start(page){await clock(page);await page.goto(detail);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');}
async function upper(page){await page.clock.fastForward(603000);await expect(page.getByRole('heading',{name:'Upper Results',exact:true})).toBeVisible();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();}
async function abs(page){await page.getByRole('button',{name:'Continue to ABS',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.fastForward(603000);await expect(page.getByRole('heading',{name:'ABS Results',exact:true})).toBeVisible();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();}
const floor=page=>page.getByRole('region',{name:'KB Floor Press results',exact:true});
test('Hidden Focus v1/v2 links remain usable without migrating a previous weekly assignment',async({page})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Tuesday:{workoutId:'focus-001-upper-abs',version:1}})));await page.reload();
 await page.getByRole('region',{name:'Tuesday',exact:true}).getByRole('button',{name:'View workout: Upper Body + ABS'}).click();await expect(page).toHaveURL(/upper-abs\/1$/);
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.getByRole('button',{name:'View workout: Upper Body + ABS'})).toHaveCount(0);await page.goto(detail);await expect(page).toHaveURL(/upper-abs\/2$/);
 await expect(page.getByRole('region',{name:'Upper block'})).toContainText('40s work / 20s rest');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')).Tuesday.version)).toBe(1);
});
test('results draft recovers, validates, saves once and preserves session loads independently',async({page})=>{
 await clock(page);await page.goto(detail);await page.evaluate(()=>localStorage.setItem('kb2.weight-preference.v1:focus-001-upper-abs:1:floor-press','8'));
 await page.getByRole('spinbutton',{name:'KB Floor Press weight (kg)',exact:true}).fill('10');
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await upper(page);
 await expect(floor(page).getByRole('spinbutton',{name:'Weight (kg)',exact:true})).toHaveValue('10');
 await floor(page).getByRole('spinbutton',{name:'Round 1',exact:true}).fill('-1');await page.getByRole('button',{name:'Continue to ABS'}).click();await expect(page.getByText(/KB Floor Press Round 1: enter/)).toBeVisible();
 await floor(page).getByRole('spinbutton',{name:'Round 1',exact:true}).fill('0');await floor(page).getByRole('spinbutton',{name:'Round 2',exact:true}).fill('6');await floor(page).getByRole('spinbutton',{name:'Weight (kg)',exact:true}).fill('12.5');
 await page.getByRole('textbox',{name:'Workout notes',exact:true}).fill('Left 6, right 5.');
 await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Upper Results',exact:true})).toBeVisible();
 await expect(floor(page).getByRole('spinbutton',{name:'Round 1',exact:true})).toHaveValue('0');await expect(page.getByRole('textbox',{name:'Workout notes',exact:true})).toHaveValue('Left 6, right 5.');
 await page.clock.fastForward(1800000);expect((await sessions(page))[0].activeDurationMs).toBe(600000);await expect(page.locator('.phase-clock')).toHaveCount(0);
 await abs(page);await expect(page.getByRole('spinbutton',{name:'Perceived effort',exact:true})).toHaveValue('');
 const dead=page.getByRole('region',{name:'KB Dead Bug + Pullover results',exact:true});await dead.getByRole('spinbutton',{name:'Intervals completed',exact:true}).fill('3');await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByText(/intervals: enter a whole number from 0 to 2/)).toBeVisible();
 await dead.getByRole('spinbutton',{name:'Intervals completed',exact:true}).fill('2');await dead.getByRole('spinbutton',{name:'Weight (kg)',exact:true}).fill('4.5');await page.getByRole('spinbutton',{name:'Perceived effort',exact:true}).fill('7');
 await page.getByText('Review Upper Results',{exact:true}).click();await floor(page).getByRole('spinbutton',{name:'Round 2',exact:true}).fill('7');
 await page.getByRole('button',{name:'Save Workout'}).evaluate(button=>{button.click();button.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
 const records=await sessions(page);expect(records).toHaveLength(1);const record=records[0];expect(record.status).toBe('completed');expect(record.activeDurationMs).toBe(1200000);expect(record.workoutVersion).toBe(2);expect(record.results.upper[0]).toEqual({exerciseId:'floor-press',weightKg:12.5,rounds:[0,7]});expect(record.results.abs[0].intervalsCompleted).toBe(2);expect(record.results.abs[1].intervalsCompleted).toBeNull();expect(record.results.perceivedEffort).toBe(7);expect(record.results.upper[1].rounds).toEqual([null,null]);
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weight-preference.v1:focus-001-upper-abs:2:floor-press'))).toBe('10');
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weight-preference.v1:focus-001-upper-abs:1:floor-press'))).toBe('8');
 await page.getByRole('button',{name:'View saved session'}).click();await expect(page.getByText('Weight (kg): 12.5',{exact:true})).toBeVisible();await expect(page.getByText('Active duration: 20:00',{exact:true})).toBeVisible();
});
test('both results forms and saved history recover offline',async({page,context})=>{
 await clock(page);await page.goto(detail);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await context.setOffline(true);
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await upper(page);await abs(page);
 await page.getByRole('textbox',{name:'Workout notes',exact:true}).fill('Offline session');await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'ABS Results',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Workout notes',exact:true})).toHaveValue('Offline session');
 await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await page.getByRole('button',{name:'View saved session'}).click();await expect(page.getByText('Workout notes: Offline session',{exact:true})).toBeVisible();await context.setOffline(false);
});
test('save failure shows no success and retry keeps one session; mobile forms fit',async({page})=>{
 await page.addInitScript(()=>{const put=IDBObjectStore.prototype.put;window.failFinal=true;IDBObjectStore.prototype.put=function(value,...args){if(value.status==='completed'&&window.failFinal)throw new DOMException('quota','QuotaExceededError');return put.call(this,value,...args);};});
 await start(page);await upper(page);await abs(page);
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByText(/Workout could not be saved/)).toBeVisible();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toHaveCount(0);expect((await sessions(page))[0].status).toBe('draft');
 await page.evaluate(()=>{window.failFinal=false;});await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();expect(await sessions(page)).toHaveLength(1);
});
test('active checkpoint reloads paused and resumes without counting time away',async({page})=>{
 await start(page);await page.clock.runFor(43000);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();
 page.on('dialog',d=>d.accept());await page.reload();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.block-time')).toHaveText('Block remaining: 09:20');await page.clock.fastForward(600000);await expect(page.locator('.block-time')).toHaveText('Block remaining: 09:20');await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(20000);await expect(page.locator('.phase-clock')).toHaveText('00:40');
});
test('Focus v2 uses one START, format-specific REST/WORK and silent result forms',async({page})=>{
 await verifyWorkoutBeeps(page,'focus-001-upper-abs',2);
});
test('unavailable IndexedDB blocks starting rather than losing a result session',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open(){throw new Error('unavailable');}}});});await clock(page);await page.goto(detail);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Session could not be opened',exact:true})).toBeVisible();await expect(page.locator('.phase-clock')).toHaveCount(0);
});
