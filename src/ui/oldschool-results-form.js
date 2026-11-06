import { sessionWeightCountForm } from './session-weight-count-form.js';
export function oldschoolResultsForm(record, callbacks) {
  return sessionWeightCountForm(record, callbacks, {
    description: 'All four blocks are complete. Optionally review kettlebell weights, then save. Repeated exercises share one weight; bodyweight movements need no load.',
  });
}
