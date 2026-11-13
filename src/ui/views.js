import { supportsResults } from '../domain/result-schemas.js';
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
export function libraryView(day, go, assign, {hiddenIds = [], onVisibilityChange, visibilityState, retry, resolve} = {}) {
  const container = el('div', {className: 'hm-library-view'}, heading(day ? `PLAN ${day.toUpperCase()}` : 'HEAVY METAL KB', day ? `Choose for ${day}` : 'Library', 'Eight approved HM/KB workouts. Assignments remain your choice.'));
  if (day) container.append(button('Cancel assignment', () => go('#today'), true));
  const active = libraryWorkouts.filter(w => !hiddenIds.includes(w.id)), hidden = libraryWorkouts.filter(w => hiddenIds.includes(w.id));
  const count = el('p', {className: 'muted', 'aria-live': 'polite'}, `${active.length} workouts`);
  const grid = el('div', {className: 'library-grid'}, ...active.map(w => {
    const card = workoutCard(w, day ? w => assign(day, w) : w => go(detailUrl(w)), day ? `Assign to ${day}` : 'View workout');
    if (!onVisibilityChange) return card;
    const hide = button('Hide', () => onVisibilityChange(w, true), true); hide.setAttribute('aria-label', `Hide ${w.name}`); hide.disabled = Boolean(visibilityState?.blocked);
    return el('article', {className: 'library-entry'}, card, hide);
  }));
  container.append(count, grid);
  if (!active.length) container.append(emptyState('No visible workouts', 'Restore a workout from Hidden workouts below. Your saved workout history is still available.'));
  if (onVisibilityChange) {
    const list = el('ul', {className: 'hidden-workout-list'});
    for (const w of hidden) {
      const restore = button('Restore', () => onVisibilityChange(w, false), true); restore.setAttribute('aria-label', `Restore ${w.name}`);
      restore.disabled = Boolean(visibilityState?.blocked);
      list.append(el('li', {}, el('strong', {}, w.name), restore));
    }
    const section = el('details', {className: 'hidden-workouts'}, el('summary', {}, `Hidden workouts (${hidden.length})`),
      hidden.length ? list : el('p', {}, 'No hidden workouts.'));
    container.append(section, el('p', {className: 'library-sync-status', role: 'status'}, `Library settings: ${visibilityState?.message || 'Saved on this device'}`));
    if (visibilityState?.error) container.append(el('p', {className: 'result-message', role: 'status'}, visibilityState.error), button('Retry Library synchronization', retry, true));
    for (const [id, remote] of Object.entries(visibilityState?.conflicts || {})) {
      const name = libraryWorkouts.find(w => w.id === id)?.name || id;
      container.append(el('section', {'aria-label': `Library conflict: ${name}`}, el('h2', {}, name), el('p', {}, `Another device set this workout to ${remote.hidden ? 'hidden' : 'visible'}. Choose which setting to keep.`),
        button(`Keep my setting: ${name}`, () => resolve(id, true), true), button(`Use cloud setting: ${name}`, () => resolve(id, false), true)));
    }
  }
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
    if (supportsResults(w)) view.append(button('View saved sessions', () => go(`#history/${w.id}`), true));
    return view;
  }
  const exercises = el('section', { className: stage === 'active' ? 'exercise-list compact' : 'exercise-list' }, el('h2', {}, 'Exercises'));
  if (!w.exercises.length) exercises.append(el('p', {}, 'Exercises, weights and repetitions are not defined yet.'));
  else for (const ex of w.exercises) exercises.append(el('p', {}, [ex.name, ex.weightKg != null ? `${ex.weightKg} kg` : '', ex.reps != null ? `${ex.reps} reps` : ''].filter(Boolean).join(' · ')));
  view.append(exercises, emptyState(stage === 'active' ? 'Timer space' : 'Workout configuration', 'Phases and timers are not configured. No timer is running.'));
  view.append(button(stage === 'active' ? 'Continue to Save Result' : 'Start Workout', () => go(stage === 'active' ? `#result/${w.id}/${w.version}` : `#active/${w.id}/${w.version}`)));
  return view;
}
