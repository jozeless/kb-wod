import { sessionWeightCountForm } from './session-weight-count-form.js';
export function tuesdayResultsForm(record, callbacks) {
  return sessionWeightCountForm(record, callbacks, {
    groupLabel: 'Finisher — Rondas completas', countLabel: 'Complete finisher rounds', countKey: 'fullRounds',
    description: 'Seven kettlebell weights and complete 8 / 8 / 10 finisher circuits only.',
  });
}
