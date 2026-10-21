import {test,expect} from '@playwright/test';
const detail='./#workout/focus-001-upper-abs/1';
test('optional weights persist and remain independent; active screen edits the same preference',async({page})=>{
 await page.clock.install();await page.goto(detail);
 const floor=page.getByRole('spinbutton',{name:'KB Floor Press weight (kg)',exact:true});
 const row=page.getByRole('spinbutton',{name:'Supported Single-Arm KB Row weight (kg)',exact:true});
 await expect(page.getByRole('spinbutton')).toHaveCount(10);await expect(floor).toHaveValue('');
 const plan=await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'));
 await floor.fill('12.5');await row.fill('0');await page.reload();await expect(floor).toHaveValue('12.5');await expect(row).toHaveValue('0');
 await floor.fill('-1');await expect(page.getByText('Enter zero or a positive weight in kg.')).toBeVisible();
 await page.reload();await expect(floor).toHaveValue('12.5');
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await page.clock.runFor(3000);await expect(floor).toHaveValue('12.5');
 await floor.fill('16.25');await page.clock.fastForward(60000);await expect(row).toHaveValue('0');
 await row.fill('');await page.clock.fastForward(240000);await expect(floor).toHaveValue('16.25');
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'End Workout'}).click();await page.goto(detail);
 await expect(floor).toHaveValue('16.25');await expect(row).toHaveValue('');
 expect(await page.evaluate(()=>localStorage.getItem('kb2.weekly-plan.v1'))).toBe(plan);
 expect(await page.evaluate(()=>localStorage.getItem('kb2.sessions.v1'))).toBeNull();
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await floor.fill('10.75');
 const layout=await floor.evaluate(input=>({inputLeft:input.getBoundingClientRect().left,nameRight:input.closest('.exercise-weight-row').querySelector('strong').getBoundingClientRect().right}));expect(layout.inputLeft).toBeGreaterThan(layout.nameRight);}
});
test('unavailable storage surfaces an error without breaking the detail',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('quota')};});await page.goto(detail);
 await page.getByRole('spinbutton',{name:'KB Floor Press weight (kg)',exact:true}).fill('8');
 await expect(page.getByText(/Weight could not be saved/)).toBeVisible();await expect(page.getByRole('button',{name:'Start Workout'})).toBeVisible();
});
