import { sessionWeightCountForm } from './session-weight-count-form.js';
export function thursdayResultsForm(record, callbacks) {
  return sessionWeightCountForm(record, callbacks, {
    groupLabel: "Hell's Finisher — Pasos totales", countLabel: 'Total finisher steps', countKey: 'totalSteps',
    description: 'Eleven recorded kettlebell weights and total controlled marching steps across both halves. One knee lift = one step.',
  });
}
