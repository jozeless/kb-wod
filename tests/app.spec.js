import { test, expect } from '@playwright/test';
test('navigation and simplified approved Library', async ({page}) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.goto('./'); await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 await expect(page.locator('.day-slot')).toHaveCount(7);
 await page.getByRole('link',{name:'Library',exact:true}).click();
 await expect(page.locator('.workout-card')).toHaveCount(4);await expect(page.getByRole('searchbox')).toHaveCount(0);await expect(page.getByRole('combobox')).toHaveCount(0);await expect(page.getByText('4 workouts',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Progress',exact:true}).click();await expect(page.getByRole('heading',{name:'Progress',exact:true})).toBeVisible();await expect(page.getByText('No completed workouts this month',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'History',exact:true}).click();await expect(page.getByRole('heading',{name:'Saved workouts',exact:true})).toBeVisible();await expect(page.getByText('No saved sessions',{exact:true})).toBeVisible();
 for (const name of ['Stats','Dashboard']) { await page.goto(`./#${name.toLowerCase()}`); await expect(page.getByRole('heading',{name,exact:true})).toBeVisible(); await expect(page.getByText('No statistics yet')).toBeVisible(); }
 expect(errors).toEqual([]);
});
test('assign, reuse, change, remove and persist without touching prototype data', async ({page}) => {
 await page.goto('./'); await page.evaluate(()=>localStorage.setItem('kbwod_history','prototype-sentinel'));
 const monday=page.getByRole('region',{name:'Monday',exact:true});const tuesday=page.getByRole('region',{name:'Tuesday',exact:true});
 await monday.getByRole('button',{name:'Add workout'}).click(); await page.getByRole('button',{name:'Assign to Monday: Tuesday of Spades'}).click();
 await tuesday.getByRole('button',{name:'Add workout'}).click(); await page.getByRole('button',{name:'Assign to Tuesday: Tuesday of Spades'}).click();
 await page.reload(); await expect(monday.getByText('Tuesday of Spades')).toBeVisible();await expect(tuesday.getByText('Tuesday of Spades')).toBeVisible();
 await monday.getByRole('button',{name:'Change workout'}).click();await page.getByRole('button',{name:'Assign to Monday: Friday To Black'}).click();
 await expect(monday.getByText('Friday To Black')).toBeVisible();await expect(tuesday.getByText('Tuesday of Spades')).toBeVisible();
 await monday.getByRole('button',{name:'Remove',exact:true}).click();await page.reload();await expect(monday.getByText('No workout assigned.')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kbwod_history'))).toBe('prototype-sentinel');
});
test('historical demo direct links retain their explicit scaffolding', async ({page}) => {
 await page.goto('./#workout/demo-hybrid-foundation/1');
 await expect(page.getByText('Workout Detail',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Start Workout'}).click();
 await expect(page.getByText('Timer space',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Continue to Save Result'}).click();
 await expect(page.getByText('Result saving is not configured')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
});
test('responsive layout has no horizontal overflow and navigation stays visible', async ({page}) => {
 for (const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:740});
  for (const route of ['workout/focus-001-upper-abs/1','today','library','progress','history','stats','dashboard','workout/demo-hybrid-foundation/1','active/demo-hybrid-foundation/1','result/demo-hybrid-foundation/1']) {
   await page.goto(`./#${route}`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(page.getByRole('navigation')).toBeInViewport();
  }
 }
});
test('invalid plan is preserved and changes are disabled', async ({page}) => {
 await page.goto('./');await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1','{broken'));await page.reload();
 await expect(page.getByRole('status')).toContainText('could not be read');await expect(page.getByRole('button',{name:'Add workout'}).first()).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe('{broken');
});
test('static shell works offline under the GitHub Pages subpath', async ({page,context}) => {
 await page.goto('./');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.locator('.workout-card')).toHaveCount(4);
 await page.getByRole('button',{name:'View workout: Tuesday of Spades'}).click();await expect(page.getByRole('region',{name:'Conditioning block'})).toBeVisible();await page.goto('./#workout/focus-001-upper-abs/1');
 await expect(page.getByRole('region',{name:'ABS block'})).toBeVisible();
 await context.setOffline(false);
});

test('historical Focus prescription and assignment remain usable before explicit approved replacement', async ({page}) => {
 await page.goto('./');await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Monday:{workoutId:'demo-hybrid-foundation',version:1},Tuesday:{workoutId:'focus-001-upper-abs',version:1}})));await page.reload();
 const monday=page.getByRole('region',{name:'Monday',exact:true});
 const tuesday=page.getByRole('region',{name:'Tuesday',exact:true});
 const before=await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'));
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.getByRole('button',{name:'View workout: Upper Body + ABS'})).toHaveCount(0);
 await page.getByRole('link',{name:'Today',exact:true}).click();await tuesday.getByRole('button',{name:'View workout: Upper Body + ABS'}).click();await expect(page).toHaveURL(/focus-001-upper-abs\/1$/);
 await expect(page.getByRole('heading',{name:'Upper Body + ABS',exact:true})).toBeVisible();
 const upper=page.getByRole('region',{name:'Upper block'}), abs=page.getByRole('region',{name:'ABS block'});
 await expect(upper.locator('ol li')).toHaveCount(5);await expect(abs.locator('ol li')).toHaveCount(5);
 await expect(upper.locator('ol li').first()).toContainText('5–6 reps per arm');
 await expect(upper.locator('ol li').last()).toContainText('4–6 controlled cycles');
 await expect(upper).toContainText('1–3 repetitions in reserve');await expect(upper).toContainText('shoulder discomfort');
 await expect(abs).toContainText('40 seconds, then rest for 20 seconds');await expect(abs).toContainText('1 to 10');
 await expect(page.getByText('Warm-up is separate from the 20-minute workout.')).toHaveCount(0);
 expect(await page.evaluate(async()=>{const {findWorkout}=await import('./src/data/catalog.js');return findWorkout('focus-001-upper-abs',1).warmup.note;})).toBe('Warm-up is separate from the 20-minute workout.');
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(before);
 await expect(page.getByRole('button',{name:'Start Workout'})).toBeVisible();
 await page.getByRole('link',{name:'Today',exact:true}).click();
 await tuesday.getByRole('button',{name:'Change workout'}).click();await expect(page.getByRole('button',{name:'Assign to Tuesday: Upper Body + ABS'})).toHaveCount(0);await expect(page.locator('.workout-card')).toHaveCount(4);
 await page.getByRole('button',{name:'Assign to Tuesday: Tuesday of Spades'}).click();
 await page.reload();await expect(tuesday.getByText('Tuesday of Spades',{exact:true})).toBeVisible();
 await expect(monday.getByText('Hybrid Foundation')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')).Tuesday)).toEqual({workoutId:'tuesday-of-spades',version:1});
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
});
