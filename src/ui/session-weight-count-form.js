import { el, button, heading } from './components.js';
import { weightedExercises } from '../domain/tuesday-results.js';
export function sessionWeightCountForm(record, {changed, save}, config) {
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
  // Optional benchmark groups leave Tuesday/Thursday's existing two groups intact.
  for (const group of config.extraGroups || []) {
    fields.append(el('h2', {}, group.label), el('p', {className: 'muted'}, group.description));
    for (const field of group.fields) fields.append(el('label', {}, field.label, number(field.label, field.key, record.form[field.key], v => {record.form[field.key] = v;}, true)));
  }
  fields.append(el('h2', {}, config.groupLabel), el('label', {}, config.countLabel, number(config.countLabel, config.countKey, record.form[config.countKey], v => {record.form[config.countKey] = v;}, true)), button('Save Workout', save));
  const form = el('form', {novalidate: ''}, fields, message); form.addEventListener('submit', e => e.preventDefault());
  return {root: el('div', {}, heading(`${record.workoutSnapshot.code} · VERSION ${record.workoutVersion}`, 'Workout Results', config.description), form), message, setBusy(value) {fields.disabled = value;}};
}
