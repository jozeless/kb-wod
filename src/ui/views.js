import { supportsResults } from '../domain/result-schemas.js';
import { draftActions } from './session-history.js';
import { currentWorkouts, workoutTypes, findWorkout, typeLabel } from '../data/catalog.js';
import { workoutDetails } from './workout-details.js';
import { days, filterWorkouts } from '../domain/planning.js';
import { el, button, heading, workoutCard, emptyState } from './components.js';
const detailUrl = w => `#workout/${encodeURIComponent(w.id)}/${w.version}`;
export function todayView(plan, go, remove, locked) {
  const list = el('div', { className: 'week-grid' });
  for (const day of days) {
    const ref = plan[day];
    const workout = ref && findWorkout(ref.workoutId, ref.version);
    const slot = el('section', { className: 'day-slot', 'aria-label': day }, el('h2', {}, day));
    if (workout) slot.append(workoutCard(workout, w => go(detailUrl(w))));
    else slot.append(el('p', { className: 'muted' }, ref ? 'Assigned workout is unavailable. Your assignment is preserved.' : 'No workout assigned.'));
    const change = button(ref ? 'Change workout' : 'Add workout', () => go(`#library?day=${day}`), true);
    change.disabled = locked;
    slot.append(change);
    if (ref) { const clear = button('Remove', () => remove(day), true); clear.disabled = locked; slot.append(clear); }
    list.append(slot);
  }
  return el('div', {}, heading('YOUR WEEK', 'Today', 'Plan Monday through Sunday. Nothing changes unless you change it.'), list);
}
export function libraryView(day, go, assign) {
  const container = el('div', {}, heading(day ? `PLAN ${day.toUpperCase()}` : 'YOUR COLLECTION', day ? `Choose for ${day}` : 'Library', 'Choose a workout or explore the clearly labeled demonstration cards.'));
  if (day) container.append(button('Cancel assignment', () => go('#today'), true));
  const search = el('input', { type: 'search', id: 'search', placeholder: 'Search workouts' });
  const select = el('select', { id: 'workout-type' }, el('option', { value: '' }, 'All types'), ...workoutTypes.map(t => el('option', { value: t.id }, t.label)));
  const controls = el('div', { className: 'filters' }, el('label', {}, 'Search workouts', search), el('label', {}, 'Workout Type', select));
  const grid = el('div', { className: 'library-grid' });
  const count = el('p', { className: 'muted', 'aria-live': 'polite' });
  function update() {
    const found = filterWorkouts(currentWorkouts, search.value, select.value);
    count.textContent = `${found.length} workout${found.length === 1 ? '' : 's'}`;
    grid.replaceChildren(...found.map(w => workoutCard(w, day ? w => assign(day, w) : w => go(detailUrl(w)), day ? `Assign to ${day}` : 'View workout')));
    if (!found.length) grid.append(emptyState('No matching workouts', 'Try another search or workout type.'));
  }
  search.addEventListener('input', update); select.addEventListener('change', update); update();
  container.append(controls, count, grid); return container;
}
export function workoutView(id, version, stage, go, startWorkout) {
  const w = findWorkout(id, version);
  if (!w) return emptyState('Workout unavailable', 'This workout version is not in the library. Use Today or Library to continue.');
  const view = el('div', {}, button('← Library', () => go('#library'), true), heading(`${w.code ? w.code + " · " : ""}${typeLabel(w.type)}${w.demo ? " · DEMO" : ""} · VERSION ${w.version}`, w.name, stage === 'active' ? 'Active Workout' : stage === 'result' ? 'Save Result' : 'Workout Detail'));
  if (w.phases.length && stage === 'active') {
    view.append(emptyState('Ready when you are', 'This link does not start the timer automatically.'), button('Start Workout', () => startWorkout(w)));
    if (supportsResults(w)) view.append(draftActions(w, go));
    return view;
  }
  if (stage === 'result') {
    view.append(emptyState('Result saving is not configured', 'Result fields will be defined in a later phase. No session or result has been saved.'), button('Return to Today', () => go('#today'))); return view;
  }
  if (w.phases.length && stage === 'workout') {
    view.append(workoutDetails(w), button('Start Workout', () => startWorkout(w)));
    if (supportsResults(w)) view.append(button('View saved sessions', () => go(`#history/${w.id}`), true), draftActions(w, go));
    return view;
  }
  const exercises = el('section', { className: stage === 'active' ? 'exercise-list compact' : 'exercise-list' }, el('h2', {}, 'Exercises'));
  if (!w.exercises.length) exercises.append(el('p', {}, 'Exercises, weights and repetitions are not defined yet.'));
  else for (const ex of w.exercises) exercises.append(el('p', {}, [ex.name, ex.weightKg != null ? `${ex.weightKg} kg` : '', ex.reps != null ? `${ex.reps} reps` : ''].filter(Boolean).join(' · ')));
  view.append(exercises, emptyState(stage === 'active' ? 'Timer space' : 'Workout configuration', 'Phases and timers are not configured. No timer is running.'));
  view.append(button(stage === 'active' ? 'Continue to Save Result' : 'Start Workout', () => go(stage === 'active' ? `#result/${w.id}/${w.version}` : `#active/${w.id}/${w.version}`)));
  return view;
}
