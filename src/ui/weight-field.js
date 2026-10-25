import { el } from './components.js';
import { readWeightPreference, writeWeight, parseWeight } from '../storage/weight-preferences.js';
export function createWeightField(workout, initialExercise, { read, changed } = {}) {
  let exercise = null;
  const input = el('input', { type: 'number', min: '0', step: 'any', inputmode: 'decimal' });
  const error = el('span', { className: 'weight-error', role: 'status' });
  const root = el('div', { className: 'weight-preference' }, el('label', { className: 'weight-label' }, el('span', {}, 'Weight (kg)'), input), error);
  function setExercise(next) {
    if (exercise?.id === next.id) return;
    exercise = next;
    input.setAttribute('aria-label', `${exercise.name} weight (kg)`);
    error.textContent = ''; input.disabled = false; input.setCustomValidity('');
    try { input.value = read ? read(exercise) : readWeightPreference(window.localStorage, workout, exercise); }
    catch { input.value = ''; input.disabled = true; error.textContent = 'Weight could not be read. Existing data has been preserved.'; }
  }
  input.addEventListener('input', () => {
    input.setCustomValidity(''); error.textContent = '';
    if (input.validity.badInput || input.validity.rangeUnderflow) {
      error.textContent = 'Enter zero or a positive weight in kg.'; return;
    }
    try { parseWeight(input.value); changed?.(exercise, input.value); writeWeight(window.localStorage, workout, exercise, input.value); }
    catch { error.textContent = changed ? 'Working weight retained for this session; future preference could not be saved.' : 'Weight could not be saved. Use zero or a positive number; check that local storage is available.'; }
  });
  if (initialExercise) setExercise(initialExercise);
  return { root, setExercise };
}
