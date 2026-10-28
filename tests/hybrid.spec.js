import {verifyWorkoutBeeps} from './helpers/timer-beeps.js';
import {test,expect} from '@playwright/test';
const detail='./#workout/hybrid-001-strength-sweat/1';
async function clock(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));}
test('Historical Hybrid detail, independent weights and existing Monday/Friday reuse',async({page})=>{
 await page.goto('./#library');await expect(page.getByRole('button',{name:'View workout: Strength & Sweat'})).toHaveCount(0);await page.goto('./#workout/hybrid-001-strength-sweat/2');
 await expect(page.getByRole('heading',{name:'Strength & Sweat',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Strength block'}).locator('ol li')).toHaveCount(2);
 await expect(page.getByRole('region',{name:'Conditioning block'}).locator('ol li')).toHaveCount(4);
 await expect(page.getByRole('region',{name:'Combo Finisher block'}).locator('ol li')).toHaveCount(3);
 await expect(page.getByRole('spinbutton')).toHaveCount(9);
 await expect(page.getByText('6 reps (3 per arm)',{exact:true})).toBeVisible();
 await page.getByRole('spinbutton',{name:'KB Goblet Squat weight (kg)',exact:true}).fill('16.5');
 await page.getByRole('spinbutton',{name:'KB Thrusters weight (kg)',exact:true}).fill('8');await page.reload();
 await expect(page.getByRole('spinbutton',{name:'KB Goblet Squat weight (kg)',exact:true})).toHaveValue('16.5');
 await page.getByRole('link',{name:'Today',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Monday:{workoutId:'hybrid-001-strength-sweat',version:2},Friday:{workoutId:'hybrid-001-strength-sweat',version:2}})));
 await page.reload();for(const day of ['Monday','Friday'])await expect(page.getByRole('region',{name:day,exact:true}).getByText('Strength & Sweat')).toBeVisible();
 await page.goto('./#workout/focus-001-upper-abs/1');await expect(page.getByRole('spinbutton',{name:'KB Floor Press weight (kg)',exact:true})).toHaveValue('');
});
test('Hybrid runs all blocks, pauses AMRAP and never advances its circuit automatically',async({page})=>{
 await clock(page);await page.goto(detail);await page.getByRole('button',{name:'Start Workout',exact:true}).click();
 await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(3000);
 await expect(page.locator('.active-exercise')).toHaveText('KB Goblet Squat');
 await page.clock.fastForward(60000);await expect(page.locator('.active-exercise')).toHaveText('Push-Up + KB Renegade Row');
 await page.clock.fastForward(420000);await expect(page.locator('.active-panel .eyebrow')).toHaveText('Conditioning · WORK');await expect(page.locator('.phase-clock')).toHaveText('00:40');
 await page.clock.fastForward(460000);await expect(page.locator('.active-panel .eyebrow')).toHaveText('Conditioning · REST');
 await expect(page.getByText('Next: Combo Finisher circuit')).toBeVisible();await page.clock.fastForward(20000);
 await expect(page.locator('.active-panel .eyebrow')).toHaveText('Combo Finisher · AMRAP');await expect(page.locator('.phase-clock')).toHaveText('04:00');
 await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);
 const thrusters=page.getByRole('spinbutton',{name:'KB Thrusters weight (kg)',exact:true});await thrusters.fill('12.5');
 await page.clock.fastForward(60000);await expect(page.locator('.phase-clock')).toHaveText('03:00');await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);await expect(thrusters).toHaveValue('12.5');
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.fastForward(300000);await expect(page.locator('.phase-clock')).toHaveText('03:00');await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.clock.fastForward(179900);await expect(page.locator('.phase-clock')).toHaveText('00:01');await page.clock.runFor(100);
 await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
});
test('Hybrid AMRAP works offline and remains responsive',async({page,context})=>{
 await clock(page);await page.goto(detail);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await context.setOffline(true);await page.reload();
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await page.clock.fastForward(963000);
 await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.clock.fastForward(240000);await expect(page.getByRole('heading',{name:'Workout Complete',exact:true})).toBeVisible();await context.setOffline(false);
});

test('legacy Hybrid uses the shared format-specific beep patterns across its full timeline',async({page})=>{await verifyWorkoutBeeps(page,'hybrid-001-strength-sweat',1);});
