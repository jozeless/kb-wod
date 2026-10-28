import { formatTime } from '../domain/workout-timer.js';
import { prescription, phaseSummary } from './exercise-prescription.js';
import { createWeightField } from './weight-field.js';
import { el, phaseBar } from './components.js';
export function workoutDetails(workout) {
  const details = el('div', {className: 'hm-workout-overview'},
    el('p', {className: 'eyebrow'}, `HEAVY METAL KB${workout.suggestedDay ? ` · ${workout.suggestedDay.toUpperCase()}` : ''}`),
    el('span', {className: 'badge'}, `APROBADO · ${workout.code} · VERSION ${workout.version}`),
    el('h1', {className: 'overview-title'}, workout.name),
    el('p', {className: 'overview-subtitle'}, `${workout.category} · ${formatTime(workout.durationSeconds * 1000)}`), phaseBar(workout));
  for (const [index, phase] of workout.phases.entries()) {
    const duration = phase.durationSeconds < 60 ? `${phase.durationSeconds} seconds` : `${phase.durationSeconds / 60} min`;
    const format = phase.format === 'emom' ? `EMOM × ${phase.rounds}` : phase.format === 'intervals' ? `${phase.timer.workSeconds}/${phase.timer.restSeconds} × ${phase.rounds}` : phase.format === 'transition' ? 'Automatic rest transition' : phase.format === 'amrap-reps' ? 'AMRAP repetitions' : phase.format === 'timed-sides' ? `Timed sides · ${phase.timer.holds.map(h => h.durationSeconds).join('/')}` : 'AMRAP';
    const section = el('section', {className: 'exercise-list', 'aria-label': `${phase.name} block`},
      el('div', {className: 'phase-heading'}, el('h2', {}, `${String(index + 1).padStart(2, '0')} · ${phase.name.toUpperCase()}`), el('p', {className: 'phase-format'}, `${duration} · ${format}`)));
    const list = el('ol', {className: 'prescriptions'});
    for (const id of phase.exerciseIds) {
      const ex = workout.exercises.find(e => e.id === id);
      list.append(el('li', {}, el('div', {className: 'exercise-weight-row'}, el('strong', {}, ex.name), ex.equipment === 'bodyweight' ? null : createWeightField(workout, ex).root),
        el('p', {className: 'exercise-target'}, phase.format === 'intervals' && !ex.target ? `${phase.timer.workSeconds} s` : prescription(ex, phase)),
        ex.note ? el('p', {className: 'muted'}, ex.note) : null, ex.attribution ? el('p', {className: 'muted'}, ex.attribution) : null));
    }
    if (phase.exerciseIds.length) section.append(list, el('details', {className: 'phase-guidance'}, el('summary', {}, 'Instructions & measurable goals'), el('p', {}, phaseSummary(phase)), el('p', {}, phase.instructions), el('ul', {}, ...phase.objectives.map(goal => el('li', {}, goal)))));
    details.append(section);
  }
  return details;
}
