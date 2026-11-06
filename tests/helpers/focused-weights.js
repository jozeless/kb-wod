import { expect } from '@playwright/test';

// Working weights are now selected before Start; the live view has no editor.
export async function prepareWeights(page, values) {
  const inputs=page.getByRole('spinbutton');
  await expect(inputs).toHaveCount(values.length);
  for (const [i,value] of values.entries()) await inputs.nth(i).fill(value);
}
export async function preparedWeight(page, name, value) {
  await expect(page.locator('.hm-active-view input')).toHaveCount(0);
  expect(await page.evaluate(async name=>{
    const {findWorkout}=await import('./src/data/catalog.js'),{readWeightPreference}=await import('./src/storage/weight-preferences.js');
    const [,id,version]=location.hash.slice(1).split('/'),workout=findWorkout(id,version);
    return readWeightPreference(localStorage,workout,workout.exercises.find(e=>e.name===name));
  },name)).toBe(value);
}
