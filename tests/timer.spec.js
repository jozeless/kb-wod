import {verifyWorkoutBeeps} from './helpers/timer-beeps.js';
import { test, expect } from '@playwright/test';
const detail='./#workout/focus-001-upper-abs/1';
async function start(page, pausedClock = false) {
 if (pausedClock) {
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 } else await page.clock.install();await page.goto(detail);await page.getByRole('button',{name:'Start Workout',exact:true}).click();
 await expect(page.locator('.phase-clock')).toHaveText('3');
}
test('countdown, automatic blocks, final rest and completion without saving',async({page})=>{
 await start(page);
 await page.clock.runFor(1000);await expect(page.locator('.phase-clock')).toHaveText('2');
 await page.clock.runFor(1000);await expect(page.locator('.phase-clock')).toHaveText('1');
 await page.clock.runFor(1000);await expect(page.locator('.phase-clock')).toHaveText('GO');
 await expect(page.locator('.total-time')).toHaveText('Total remaining: 20:00');
 await page.clock.runFor(500);await expect(page.locator('.phase-clock')).toHaveText('01:00');
 await page.clock.fastForward(59500);await expect(page.locator('.active-exercise')).toHaveText('Supported Single-Arm KB Row');
 await page.clock.fastForward(540000);await expect(page.locator('.active-panel .eyebrow')).toHaveText('ABS · WORK');
 await expect(page.locator('.phase-clock')).toHaveText('00:40');await expect(page.locator('.total-time')).toHaveText('Total remaining: 10:00');
 await page.clock.fastForward(40000);await expect(page.locator('.active-panel')).toHaveClass(/rest/);await expect(page.locator('.phase-clock')).toHaveText('00:20');
 await page.clock.fastForward(20000);await expect(page.locator('.active-exercise')).toHaveText('KB Bear Plank Row + Kick Through');
 await page.clock.fastForward(520000);await expect(page.locator('.active-panel .eyebrow')).toHaveText('ABS · REST');
 await expect(page.locator('.phase-clock')).toHaveText('00:20');
 await page.clock.fastForward(19900);await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toHaveCount(0);
 await page.clock.runFor(100);await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toBeVisible();
 await expect(page.getByText('Scheduled duration: 20:00')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
 await page.getByRole('button',{name:'Return to Today'}).click();await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
});
test('direct active URL requires action, pause/resume and background catch-up',async({page})=>{
 await page.clock.install();await page.goto('./#active/focus-001-upper-abs/1');
 await page.clock.fastForward(60000);await expect(page.getByText('Ready when you are')).toBeVisible();await expect(page.locator('.phase-clock')).toHaveCount(0);
 await page.getByRole('button',{name:'Start Workout'}).click();await page.clock.runFor(3000);await page.clock.fastForward(15000);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const before=await page.locator('.phase-clock').textContent();
 await page.clock.fastForward(900000);await expect(page.locator('.phase-clock')).toHaveText(before);await expect(page.locator('.total-time')).toHaveText('Total remaining: 19:45');
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.fastForward(45000);await expect(page.locator('.active-exercise')).toHaveText('Supported Single-Arm KB Row');
 // fastForward skips missed repeating callbacks, as when a tab is throttled.
 await page.clock.fastForward(600000);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('.active-exercise')).toHaveText('KB Bear Plank Row + Kick Through');await expect(page.locator('.active-panel .eyebrow')).toHaveText('ABS · WORK');
});
test('cancel or confirm exit for links, browser Back, hash navigation and End Workout',async({page})=>{
 await start(page);await page.clock.runFor(3000);
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(true);
 let accept=false;page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
 await page.getByRole('link',{name:'Today',exact:true}).click();await expect(page.locator('.active-panel')).toBeVisible();
 await page.goBack();await expect(page).toHaveURL(/#active/);await expect(page.locator('.active-panel')).toHaveCount(1);
 await page.getByRole('button',{name:'End Workout'}).click();await expect(page.locator('.active-panel')).toBeVisible();
 await page.evaluate(()=>{location.hash='#library';});await expect(page).toHaveURL(/#active/);
 await page.clock.fastForward(60000);await expect(page.locator('.active-exercise')).toHaveText('Supported Single-Arm KB Row');
 accept=true;await page.getByRole('button',{name:'End Workout'}).click();await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(false);
 await page.clock.fastForward(1200000);await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Library',exact:true}).click();await page.getByRole('button',{name:'View workout: Upper Body + ABS'}).click();
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.getByRole('heading',{name:'Library',exact:true})).toBeVisible();
});
test('unavailable audio does not break execution; active layout remains responsive',async({page})=>{
 await page.addInitScript(()=>{window.AudioContext=class{constructor(){throw Error('unavailable')}};window.webkitAudioContext=undefined;});
 await start(page);await page.getByRole('button',{name:'Sound: Off'}).click();await expect(page.getByRole('button',{name:'Sound: Off'})).toBeVisible();
 await page.clock.fastForward(4000);await expect(page.locator('.phase-clock')).toHaveText('00:59');
 for(const width of [320,390,768,1280]) {await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();}
});
test('timer starts and completes offline under project subpath',async({page,context})=>{
 await page.clock.install();await page.goto(detail);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Start Workout',exact:true}).click();await page.clock.fastForward(1203000);
 await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toBeVisible();await context.setOffline(false);
});
test('legacy Focus timer emits the same semantic patterns without countdown ticks',async({page})=>{
 await verifyWorkoutBeeps(page,'focus-001-upper-abs',1);
});
