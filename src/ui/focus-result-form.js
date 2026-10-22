import { el, button, heading } from './components.js';
import { prescription } from './exercise-prescription.js';
export function resultForm(record, blockId, { changed, continueToAbs, save }) {
  const workout = record.workoutSnapshot;
  const fieldset = el('fieldset', { className: 'result-fields' });
  const message = el('p', { role: 'status', className: 'result-message' });
  const form = el('form', { novalidate: '' }, fieldset, message);
  form.addEventListener('submit', event => event.preventDefault());
  function number(label, value, key, update, max, integer = false) {
    const input = el('input', { type: 'number', min: key === 'perceivedEffort' ? '1' : '0', step: integer ? '1' : 'any', inputmode: integer ? 'numeric' : 'decimal', 'aria-label': label });
    if (max !== undefined) input.max = max;
    input.value = value;
    if (record.form.invalid[key]) input.setCustomValidity('Enter a valid number.');
    input.addEventListener('input', () => {
      input.setCustomValidity(''); record.form.invalid[key] = input.validity.badInput;
      update(input.value); changed();
    });
    return el('label', {}, label, input);
  }
  function rows(id) {
    const phase = workout.phases.find(p => p.id === id);
    const root = el('div', {});
    for (const exerciseId of phase.exerciseIds) {
      const ex = workout.exercises.find(e => e.id === exerciseId), fields = record.form[id][exerciseId];
      const grid = el('div', { className: `result-grid ${id}` }, number('Weight (kg)', fields.weightKg, `${id}.${exerciseId}.weight`, value => { fields.weightKg = value; }));
      if (id === 'upper') for (const round of [1, 2]) grid.append(number(`Round ${round}`, fields[`round${round}`], `${id}.${exerciseId}.round${round}`, value => { fields[`round${round}`] = value; }, undefined, true));
      else grid.append(number('Intervals completed', fields.intervalsCompleted, `${id}.${exerciseId}.intervals`, value => { fields.intervalsCompleted = value; }, 2, true));
      root.append(el('section', { className: 'result-exercise', 'aria-label': `${ex.name} results` }, el('h3', {}, ex.name), el('p', { className: 'muted' }, prescription(ex, phase)),
        ex.target?.unit.includes('per arm') ? el('p', { className: 'muted' }, 'Rounds record repetitions per arm when both arms match. Note any differences below.') : null, grid));
    }
    return root;
  }
  fieldset.append(el('p', {}, 'Blank means not entered. Enter 0 only when that is your actual result. Session loads do not update training preferences.'), rows(blockId));
  if (blockId === 'abs') {
    fieldset.append(number('Perceived effort', record.form.perceivedEffort, 'perceivedEffort', value => { record.form.perceivedEffort = value; }, 10, true));
    fieldset.append(el('details', {}, el('summary', {}, 'Review Upper Results'), rows('upper')));
  }
  const notes = el('textarea', { 'aria-label': 'Workout notes', rows: '3' }); notes.value = record.form.notes;
  notes.addEventListener('input', () => { record.form.notes = notes.value; changed(); });
  fieldset.append(el('label', {}, 'Workout notes', notes));
  const action = button(blockId === 'upper' ? 'Continue to ABS' : 'Save Workout', blockId === 'upper' ? continueToAbs : save);
  fieldset.append(action);
  return { root: el('div', {}, heading('FOCUS 001 · VERSION 2', blockId === 'upper' ? 'Upper Results' : 'ABS Results', blockId === 'upper' ? 'Upper is complete. Training is stopped until you continue.' : 'Both blocks are complete. Review your actual results and save explicitly.'), form),
    message, setBusy(value) { fieldset.disabled = value; } };
}
