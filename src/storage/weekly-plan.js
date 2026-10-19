import { validatePlan } from '../domain/planning.js';
export const planKey = 'kb2.weekly-plan.v1';
export function loadPlan(storage) {
  try {
    const raw = storage.getItem(planKey);
    return { plan: raw === null ? {} : validatePlan(JSON.parse(raw)), error: null };
  } catch {
    return { plan: {}, error: 'Your weekly plan could not be read. Existing storage has been preserved. Planning changes are disabled until storage is available and valid.' };
  }
}
export function savePlan(storage, plan) {
  validatePlan(plan);
  storage.setItem(planKey, JSON.stringify(plan));
}
