import { test, expect } from '@playwright/test';
test('navigation, search and filters', async ({page}) => {
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.goto('./'); await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 await expect(page.locator('.day-slot')).toHaveCount(7);
 await page.getByRole('link',{name:'Library',exact:true}).click();
 await expect(page.locator('.workout-card')).toHaveCount(3);
 await page.getByLabel('Search workouts').fill('FLOW'); await expect(page.locator('.workout-card')).toHaveCount(1);
 await page.getByLabel('Workout Type').selectOption('focus'); await expect(page.getByText('No matching workouts')).toBeVisible();
 await page.getByLabel('Search workouts').fill(''); await expect(page.locator('.workout-card')).toHaveCount(1);
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
  for (const route of ['today','library','stats','dashboard','workout/demo-hybrid-foundation/1','active/demo-hybrid-foundation/1','result/demo-hybrid-foundation/1']) {
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
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.locator('.workout-card')).toHaveCount(3);
 await context.setOffline(false);
});
