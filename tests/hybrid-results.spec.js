import {verifyWorkoutBeeps} from './helpers/timer-beeps.js';
import {test,expect} from '@playwright/test';
const detail='./#workout/hybrid-001-strength-sweat/2';
async function clock(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));}
async function records(page){return page.evaluate(async()=>{const {listSessions}=await import('./src/storage/session-store.js');return listSessions('hybrid-001-strength-sweat');});}
async function noDraftStatus(page){await expect(page.getByText('Draft saved locally.',{exact:true})).toHaveCount(0);}
async function start(page){await clock(page);await page.goto(detail);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');}
async function finish(page,ms,title){await page.clock.fastForward(ms);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await noDraftStatus(page);}
async function next(page,label){await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');}
const region=(page,name)=>page.getByRole('region',{name:`${name} results`,exact:true});
test('Hidden Hybrid v1/v2 links resolve while an existing v1 assignment stays untouched',async({page})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Monday:{workoutId:'hybrid-001-strength-sweat',version:1}})));await page.reload();await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button',{name:'View workout: Strength & Sweat'}).click();await expect(page).toHaveURL(/strength-sweat\/1$/);
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.getByRole('button',{name:'View workout: Strength & Sweat'})).toHaveCount(0);await page.goto(detail);await expect(page).toHaveURL(/strength-sweat\/2$/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')).Monday.version)).toBe(1);
});
test('all Hybrid forms retain entries, validate and save actual results once without altering Focus data',async({page})=>{
 await clock(page);await page.goto(detail);
 const focusBefore=await page.evaluate(async()=>{
  const {focus002}=await import('./src/data/focus-001-v2.js');const {createDraft,finalResults}=await import('./src/domain/focus-results.js');const {putDraft,completeSession,getSession}=await import('./src/storage/session-store.js');const storage={getItem:()=>null};
  const saved=createDraft(focus002,storage,'preserved-focus-saved');saved.stage='abs-results';saved.completedBlocks=['upper','abs'];saved.activeDurationMs=1200000;saved.completedAt=new Date().toISOString();saved.results=finalResults(saved);await completeSession(saved);
  const draft=createDraft(focus002,storage,'preserved-focus-draft');draft.stage='upper-results';draft.completedBlocks=['upper'];draft.activeDurationMs=600000;draft.form.notes='preserve these notes';await putDraft(draft);
  localStorage.setItem('kb2.weight-preference.v1:hybrid-001-strength-sweat:1:goblet-squat','16');
  return [await getSession(saved.id),await getSession(draft.id)];
 });
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await finish(page,483000,'Strength Results');
 const squat=region(page,'KB Goblet Squat');await expect(squat.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true})).toHaveValue('16');await squat.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true}).fill('20');
 for(let i=1;i<=4;i++)await squat.getByRole('spinbutton',{name:`Round ${i}`,exact:true}).fill('8');
 const row=region(page,'Push-Up + KB Renegade Row');await expect(row).toContainText('per side');await row.getByRole('spinbutton',{name:'Round 1',exact:true}).fill('0');await page.getByRole('textbox',{name:'Workout notes',exact:true}).fill('Actual Hybrid results');await noDraftStatus(page);
 await expect(page.getByRole('heading',{name:'Strength Results',exact:true})).toBeVisible();await expect(squat.getByRole('spinbutton',{name:'Round 4',exact:true})).toHaveValue('8');
 await page.clock.fastForward(1800000);expect(await records(page)).toHaveLength(0);
 await next(page,'Continue to Conditioning');await finish(page,483000,'Conditioning Results');
 await page.evaluate(()=>localStorage.setItem('kb2.weight-preference.v1:hybrid-001-strength-sweat:2:goblet-squat','24'));
 const swings=region(page,'KB Swings');await swings.getByRole('spinbutton',{name:'Intervals completed',exact:true}).fill('3');await page.getByRole('button',{name:'Continue to Finisher'}).click();await expect(page.getByText(/KB Swings intervals: enter/)).toBeVisible();await swings.getByRole('spinbutton',{name:'Intervals completed',exact:true}).fill('2');await swings.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true}).fill('12.5');await noDraftStatus(page);
 await expect(page.getByRole('heading',{name:'Conditioning Results',exact:true})).toBeVisible();await expect(swings.getByRole('spinbutton',{name:'Intervals completed',exact:true})).toHaveValue('2');
 await next(page,'Continue to Finisher');await page.clock.runFor(3000);await expect(page.locator('.block-time')).toHaveText('Block remaining: 04:00');await expect(page.getByText('Total active remaining: 04:00',{exact:true})).toBeVisible();await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);
 await page.clock.fastForward(240000);await expect(page.getByRole('heading',{name:'Finisher Results',exact:true})).toBeVisible();await page.getByRole('spinbutton',{name:'Full rounds completed',exact:true}).fill('2');
 const thrusters=region(page,'KB Thrusters');await thrusters.getByRole('spinbutton',{name:'Additional partial reps',exact:true}).fill('7');await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByText(/KB Thrusters additional partial repetitions: enter/)).toBeVisible();await thrusters.getByRole('spinbutton',{name:'Additional partial reps',exact:true}).fill('6');await thrusters.getByRole('spinbutton',{name:'Actual Weight (kg)',exact:true}).fill('8');
 await region(page,'KB Wood Choppers').getByRole('spinbutton',{name:'Additional partial reps',exact:true}).fill('4');await region(page,'KB Lateral Lunge + Curl').getByRole('spinbutton',{name:'Additional partial combinations',exact:true}).fill('0');await page.getByRole('spinbutton',{name:'Perceived effort',exact:true}).fill('8');await noDraftStatus(page);await expect(page.getByRole('heading',{name:'Finisher Results',exact:true})).toBeVisible();await expect(page.getByRole('spinbutton',{name:'Full rounds completed',exact:true})).toHaveValue('2');
 await page.getByText('Review Strength Results',{exact:true}).click();await squat.getByRole('spinbutton',{name:'Round 4',exact:true}).fill('0');await page.getByRole('button',{name:'Save Workout'}).evaluate(button=>{button.click();button.click();});await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
 const sessions=await records(page);expect(sessions).toHaveLength(1);const session=sessions[0];expect(session.workoutVersion).toBe(2);expect(session.activeDurationMs).toBe(1200000);expect(session.results.strength[0].rounds).toEqual([8,8,8,0]);expect(session.results.strength[0].weightKg).toBe(20);expect(session.results.strength[1].rounds).toEqual([0,null,null,null]);expect(session.results.conditioning[0].intervalsCompleted).toBe(2);expect(session.results.conditioning[1].intervalsCompleted).toBeNull();expect(session.results['combo-finisher'].fullRounds).toBe(2);expect(session.results['combo-finisher'].exercises.map(ex=>ex.partialReps)).toEqual([6,4,0]);
 const focusAfter=await page.evaluate(async()=>{const {getSession}=await import('./src/storage/session-store.js');return [await getSession('preserved-focus-saved'),await getSession('preserved-focus-draft')];});expect(focusAfter).toEqual(focusBefore);
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weight-preference.v1:hybrid-001-strength-sweat:2:goblet-squat'))).toBe('24');await page.getByRole('button',{name:'View saved session'}).click();await expect(page.getByText('Full rounds completed: 2',{exact:true})).toBeVisible();await expect(page.getByText('Actual Weight (kg): 20',{exact:true})).toBeVisible();await expect(page.getByText('Additional partial combinations: 0',{exact:true})).toBeVisible();
});
for(const [index,ms,remaining]of[[0,63000,'07:00'],[1,48000,'07:15'],[2,63000,'03:00']])test(`active block ${index+1} stays paused with no time away`,async({page})=>{
 await start(page);
 if(index>=1){await finish(page,483000,'Strength Results');await next(page,'Continue to Conditioning');}
 if(index>=2){await finish(page,483000,'Conditioning Results');await next(page,'Continue to Finisher');}
 await page.clock.runFor(ms);await page.getByRole('button',{name:'Pause',exact:true}).click();await noDraftStatus(page);page.on('dialog',dialog=>dialog.accept());await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.block-time')).toHaveText(`Block remaining: ${remaining}`);await page.clock.fastForward(900000);await expect(page.locator('.block-time')).toHaveText(`Block remaining: ${remaining}`);
 if(index===2)await expect(page.getByRole('list',{name:'AMRAP circuit'}).locator('li')).toHaveCount(3);
});
test('Hybrid results save and read offline, blank values stay null, mobile fields fit',async({page,context})=>{
 await clock(page);await page.goto(detail);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await context.setOffline(true);await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await finish(page,483000,'Strength Results');
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await next(page,'Continue to Conditioning');await finish(page,483000,'Conditioning Results');await next(page,'Continue to Finisher');await finish(page,243000,'Finisher Results');await page.getByRole('spinbutton',{name:'Full rounds completed',exact:true}).fill('0');await page.getByRole('button',{name:'Save Workout'}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();
 const session=(await records(page))[0];expect(session.results['combo-finisher'].fullRounds).toBe(0);expect(session.results['combo-finisher'].exercises.every(ex=>ex.partialReps===null&&ex.weightKg===null)).toBe(true);expect(session.results.strength[0].rounds).toEqual([null,null,null,null]);expect(session.results.perceivedEffort).toBeNull();
 await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await page.getByRole('button',{name:'View saved session'}).click();await expect(page.getByText('Active duration: 20:00',{exact:true})).toBeVisible();await expect(page.getByText('Full rounds completed: 0',{exact:true})).toBeVisible();await context.setOffline(false);
});

test('Hybrid v2 uses one semantic pattern per format boundary',async({page})=>{
 await verifyWorkoutBeeps(page,'hybrid-001-strength-sweat',2);
});
