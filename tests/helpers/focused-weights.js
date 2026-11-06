import { expect } from '@playwright/test';

// Working weights are now selected before Start; the live view has no editor.
export async function prepareWeights(page, values) {
  const inputs=page.getByRole('spinbutton');
  await expect(inputs).toHaveCount(values.length);
  for (const [i,value] of values.entries()) await inputs.nth(i).fill(value);
}
export async function initializedWeight(page, name, value) {
  await expect(page.locator('.hm-active-view input')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(async({name})=>{
    const {getSession}=await import('./src/storage/session-store.js');
    const id=new URLSearchParams(location.hash.split('?')[1]).get('draft');
    const record=await getSession(id), exercise=record?.workoutSnapshot.exercises.find(e=>e.name===name);
    return exercise?record.form.weights[exercise.id]:undefined;
  },{name})).toBe(value);
}
