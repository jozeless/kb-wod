import { libraryWorkouts, findWorkout, typeLabel } from '../data/catalog.js';
import { workoutDetails } from './workout-details.js';
import { days } from '../domain/planning.js';
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
  const label = `${libraryWorkouts.length} ${libraryWorkouts.length === 1 ? 'workout' : 'workouts'}`;
  const container = el('div', {className: 'hm-library-view'}, heading(day ? `PLAN ${day.toUpperCase()}` : 'HEAVY METAL KB', day ? `Choose for ${day}` : 'Library', 'Available HM/KB workouts. Assignments remain your choice.'));
  if (day) container.append(button('Cancel assignment', () => go('#today'), true));
  container.append(el('p', {className: 'muted', 'aria-live': 'polite'}, label), el('div', {className: 'library-grid'},
    ...libraryWorkouts.map(w => workoutCard(w, day ? w => assign(day, w) : w => go(detailUrl(w)), day ? `Assign to ${day}` : 'View workout'))));
  if (!libraryWorkouts.length) container.append(emptyState('No workouts available', 'Please check back for the next release. Saved sessions remain on this device.'));
  return container;
}
export function workoutView(id, version, stage, go, startWorkout) {
  const w = findWorkout(id, version);
  if (!w) return emptyState('Workout unavailable', 'This workout version is not in the library. Use Today or Library to continue.');
  const view = el('div', {}, button('← Library', () => go('#library'), true), w.phases.length && stage === 'workout' ? null : heading(`${w.code ? w.code + " · " : ""}${typeLabel(w.type)}${w.demo ? " · DEMO" : ""} · VERSION ${w.version}`, w.name, stage === 'active' ? 'Active Workout' : stage === 'result' ? 'Save Result' : 'Workout Detail'));
  if (w.phases.length && stage === 'active') {
    view.append(emptyState('Ready when you are', 'This link does not start the timer automatically.'), button('Start Workout', () => startWorkout(w)));
    return view;
  }
  if (stage === 'result') {
    view.append(emptyState('Result saving is not configured', 'Result fields will be defined in a later phase. No session or result has been saved.'), button('Return to Today', () => go('#today'))); return view;
  }
  if (w.phases.length && stage === 'workout') {
    view.classList.add('hm-detail-view');
    view.append(workoutDetails(w), button('Start Workout', () => startWorkout(w)));
    view.append(button('View saved sessions', () => go(`#history/${w.id}`), true));
    return view;
  }
  return view;
}
