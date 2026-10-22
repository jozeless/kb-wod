import { audioSamples } from '../platform/audio-samples.js';
import { prescription, phaseSummary } from './exercise-prescription.js';
import { createWeightField } from './weight-field.js';
import { el } from './components.js';
export function workoutDetails(workout) {
  audioSamples.preload();
  const details = el('div', {},
    el('p', { className: 'eyebrow' }, `${workout.durationSeconds / 60} minutes · ${workout.category}`),
    el('p', {}, workout.purpose), el('p', {}, workout.warmup.note),
    el('p', {}, workout.suggestedDay ? `Designed for ${workout.suggestedDay}. Assign it manually from Today; your plan will not change automatically.` : 'Assign manually to any day in Today. You can reuse this workout on multiple days.'),
    el('p', {}, `Choose your own load. Available kettlebells: ${workout.equipment.availableMinKg}–${workout.equipment.availableMaxKg} kg. No prescribed weight.`));
  for (const phase of workout.phases) {
    const section = el('section', { className: 'exercise-list', 'aria-label': `${phase.name} block` },
      el('h2', {}, `${phase.name} — ${phase.durationSeconds / 60} minutes`),
      el('p', { className: 'badge' }, phaseSummary(phase)),
      el('p', {}, phase.instructions));
    const list = el('ol', { className: 'prescriptions' });
    for (const id of phase.exerciseIds) {
      const ex = workout.exercises.find(e => e.id === id);
      list.append(el('li', {}, el('div', { className: 'exercise-weight-row' }, el('strong', {}, ex.name), createWeightField(workout, ex).root), el('p', {}, prescription(ex, phase)), ex.note ? el('p', { className: 'muted' }, ex.note) : null, ex.attribution ? el('p', { className: 'muted' }, ex.attribution) : null));
    }
    section.append(list, el('h3', {}, 'Measurable goals'), el('ul', {}, ...phase.objectives.map(goal => el('li', {}, goal))));
    details.append(section);
  }
  return details;
}
