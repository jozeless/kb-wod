import { el, button, heading } from './components.js';
import { weightedExercises } from '../domain/tuesday-results.js';
export function tuesdayResultsForm(record, {changed, save}) {
  const fields = el('fieldset', {className: 'result-fields simple-results'});
  const message = el('p', {role: 'status', className: 'result-message'});
  function number(label, key, raw, update, integer = false) {
    const input = el('input', {type: 'number', min: '0', step: integer ? '1' : 'any', inputmode: integer ? 'numeric' : 'decimal', 'aria-label': label});
    input.value = raw;
    if (record.form.invalid[key]) input.setCustomValidity('Enter a valid number.');
    input.addEventListener('input', () => {input.setCustomValidity(''); record.form.invalid[key] = input.validity.badInput; update(input.value); changed();});
    return input;
  }
  fields.append(el('h2', {}, 'Pesos utilizados'), el('p', {className: 'muted'}, 'kg · Blank = not entered; 0 is valid.'));
  for (const ex of weightedExercises(record.workoutSnapshot)) fields.append(el('label', {className: 'session-weight-row'}, el('span', {}, ex.name), number(`${ex.name} actual weight (kg)`, `weights.${ex.id}`, record.form.weights[ex.id], v => {record.form.weights[ex.id] = v;})));
  fields.append(el('h2', {}, 'Finisher — Rondas completas'), el('label', {}, 'Complete finisher rounds', number('Complete finisher rounds', 'fullRounds', record.form.fullRounds, v => {record.form.fullRounds = v;}, true)), button('Save Workout', save));
  const form = el('form', {novalidate: ''}, fields, message); form.addEventListener('submit', e => e.preventDefault());
  return {root: el('div', {}, heading(`${record.workoutSnapshot.code} · VERSION ${record.workoutVersion}`, 'Workout Results', 'Seven kettlebell weights and complete 8 / 8 / 10 finisher circuits only.'), form), message, setBusy(value) {fields.disabled = value;}};
}
