import { sessionWeightCountForm } from './session-weight-count-form.js';
export function fridayResultsForm(record, callbacks) {
  return sessionWeightCountForm(record, callbacks, {
    description: 'Seven session weights, final Floor Press set per arm and complete finisher rounds only.',
    extraGroups: [{
      label: 'Ejercicio clave — Alternating Floor Press',
      description: 'Final Floor Press working set only: fourth Floor Press slot, 06:00–07:00. Count each arm separately; these are not totals across all four rounds.',
      fields: [{key: 'leftReps', label: 'Floor Press — Left arm repetitions'}, {key: 'rightReps', label: 'Floor Press — Right arm repetitions'}],
    }],
    groupLabel: 'Finisher — Rondas completas', countLabel: 'Complete finisher rounds', countKey: 'fullRounds',
  });
}
