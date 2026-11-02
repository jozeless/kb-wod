import { floorPressReference } from '../domain/friday-benchmark.js';
import { sessionWeightCountForm } from './session-weight-count-form.js';
export function fridayResultsForm(record, callbacks) {
  return sessionWeightCountForm(record, callbacks, {
    description: 'Seven session weights, final Floor Press set per arm and complete finisher rounds only.',
    extraGroups: [{
      label: 'Ejercicio clave — Alternating Floor Press',
      description: floorPressReference(record.workoutSnapshot).formDescription,
      fields: [{key: 'leftReps', label: 'Floor Press — Left arm repetitions'}, {key: 'rightReps', label: 'Floor Press — Right arm repetitions'}],
    }],
    groupLabel: 'Finisher — Rondas completas', countLabel: 'Complete finisher rounds', countKey: 'fullRounds',
  });
}
