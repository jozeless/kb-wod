import { test, expect } from '@playwright/test';
test('navigation, search and filters', async ({page}) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.goto('./'); await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 await expect(page.locator('.day-slot')).toHaveCount(7);
 await page.getByRole('link',{name:'Library',exact:true}).click();
 await expect(page.locator('.workout-card')).toHaveCount(9);
 await page.getByLabel('Search workouts').fill('FLOW'); await expect(page.locator('.workout-card')).toHaveCount(1);
 await page.getByLabel('Workout Type').selectOption('focus'); await expect(page.getByText('No matching workouts')).toBeVisible();
 await page.getByLabel('Search workouts').fill(''); await expect(page.locator('.workout-card')).toHaveCount(3);
 for (const name of ['Stats','Dashboard']) { await page.getByRole('link',{name,exact:true}).click(); await expect(page.getByRole('heading',{name,exact:true})).toBeVisible(); await expect(page.getByText('No statistics yet')).toBeVisible(); }
 expect(errors).toEqual([]);
});
test('assign, reuse, change, remove and persist without touching prototype data', async ({page}) => {
 await page.goto('./'); await page.evaluate(()=>localStorage.setItem('kbwod_history','prototype-sentinel'));
 const monday=page.getByRole('region',{name:'Monday',exact:true});const tuesday=page.getByRole('region',{name:'Tuesday',exact:true});
 await monday.getByRole('button',{name:'Add workout'}).click(); await page.getByRole('button',{name:'Assign to Monday: Hybrid Foundation'}).click();
 await tuesday.getByRole('button',{name:'Add workout'}).click(); await page.getByRole('button',{name:'Assign to Tuesday: Hybrid Foundation'}).click();
 await page.reload(); await expect(monday.getByText('Hybrid Foundation')).toBeVisible();await expect(tuesday.getByText('Hybrid Foundation')).toBeVisible();
 await monday.getByRole('button',{name:'Change workout'}).click();await page.getByRole('button',{name:'Assign to Monday: Strength Focus'}).click();
 await expect(monday.getByText('Strength Focus')).toBeVisible();await expect(tuesday.getByText('Hybrid Foundation')).toBeVisible();
 await monday.getByRole('button',{name:'Remove',exact:true}).click();await page.reload();await expect(monday.getByText('No workout assigned.')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kbwod_history'))).toBe('prototype-sentinel');
});
test('detail, active and result are explicit scaffolding', async ({page}) => {
 await page.goto('./#library'); await page.getByRole('button',{name:'View workout: Hybrid Foundation'}).click();
 await expect(page.getByText('Workout Detail',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Start Workout'}).click();
 await expect(page.getByText('Timer space',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Continue to Save Result'}).click();
 await expect(page.getByText('Result saving is not configured')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
});
test('responsive layout has no horizontal overflow and navigation stays visible', async ({page}) => {
 for (const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:740});
  for (const route of ['workout/focus-001-upper-abs/1','today','library','stats','dashboard','workout/demo-hybrid-foundation/1','active/demo-hybrid-foundation/1','result/demo-hybrid-foundation/1']) {
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
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.locator('.workout-card')).toHaveCount(9);
 await page.getByRole('button',{name:'View workout: Upper Body + ABS'}).click();
 await expect(page.getByRole('region',{name:'ABS block'})).toBeVisible();
 await context.setOffline(false);
});

test('real Focus card, complete prescription and manual Tuesday assignment', async ({page}) => {
 await page.goto('./');
 const monday=page.getByRole('region',{name:'Monday',exact:true});
 const tuesday=page.getByRole('region',{name:'Tuesday',exact:true});
 await monday.getByRole('button',{name:'Add workout'}).click();
 await page.getByRole('button',{name:'Assign to Monday: Hybrid Foundation'}).click();
 await tuesday.getByRole('button',{name:'Add workout'}).click();
 await page.getByRole('button',{name:'Assign to Tuesday: Strength Focus'}).click();
 const before=await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'));
 await page.getByRole('link',{name:'Library',exact:true}).click();
 await page.getByLabel('Workout Type').selectOption('focus');
 const card=page.getByRole('button',{name:'View workout: Upper Body + ABS'});
 await expect(card).toContainText('Focus');await expect(card).not.toContainText('Demo');
 await expect(card).toContainText('20 minutes');await expect(card).toContainText('Upper 10 min / ABS 10 min');
 await card.click();
 await expect(page.getByRole('heading',{name:'Upper Body + ABS',exact:true})).toBeVisible();
 const upper=page.getByRole('region',{name:'Upper block'}), abs=page.getByRole('region',{name:'ABS block'});
 await expect(upper.locator('ol li')).toHaveCount(5);await expect(abs.locator('ol li')).toHaveCount(5);
 await expect(upper.locator('ol li').first()).toContainText('5–6 reps per arm');
 await expect(upper.locator('ol li').last()).toContainText('4–6 controlled cycles');
 await expect(upper).toContainText('1–3 repetitions in reserve');await expect(upper).toContainText('shoulder discomfort');
 await expect(abs).toContainText('40 seconds, rest for 20 seconds');await expect(abs).toContainText('1 to 10');
 await expect(page.getByText('Warm-up is separate from the 20-minute workout.')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(before);
 await expect(page.getByRole('button',{name:'Start Workout'})).toBeVisible();
 await page.getByRole('link',{name:'Today',exact:true}).click();
 await tuesday.getByRole('button',{name:'Change workout'}).click();
 await page.getByRole('button',{name:'Assign to Tuesday: Upper Body + ABS'}).click();
 await page.reload();await expect(tuesday.getByText('Upper Body + ABS')).toBeVisible();
 await expect(monday.getByText('Hybrid Foundation')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('kb2.weekly-plan.v1')).Tuesday)).toEqual({workoutId:'focus-001-upper-abs',version:2});
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
});
