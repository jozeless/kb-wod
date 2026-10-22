import { listSessions, getSession } from '../storage/session-store.js';
import { el, button, heading, emptyState } from './components.js';
import { formatTime } from '../domain/workout-timer.js';
export function draftActions(workout, go) {
  const root = el('div', { className: 'draft-actions' });
  void listSessions(workout.id).then(records => {
    for (const record of records.filter(r => r.status === 'draft' && r.workoutVersion === workout.version)) {
      root.append(button(`Resume draft — ${new Date(record.startedAt).toLocaleString()}`, () => go(`#active/${workout.id}/${workout.version}?draft=${record.id}`), true));
    }
  }).catch(() => root.append(el('p', { role: 'status' }, 'Saved drafts could not be read.')));
  return root;
}
export function historyView(workoutId, go) {
  const root = el('div', {}, heading('LOCAL SESSIONS', 'Saved workouts', 'Results are stored only in this browser.'), button('← Library', () => go('#library'), true));
  const list = el('div', { className: 'library-grid' }); root.append(list);
  void listSessions(workoutId).then(records => {
    const saved = records.filter(record => record.status === 'completed');
    if (!saved.length) list.append(emptyState('No saved sessions', 'Complete both blocks and choose Save Workout to record a session.'));
    for (const record of saved) list.append(button(`${record.workoutSnapshot.name} · Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`, () => go(`#session/${record.id}`), true));
  }).catch(() => list.append(emptyState('History unavailable', 'Local session storage could not be read. Please retry.')));
  return root;
}
export function savedSessionView(id, go) {
  const root = el('div', {}, heading('LOCAL SESSION', 'Loading saved workout', 'Reading the immutable session snapshot…'));
  void getSession(id).then(record => {
    if (!record || record.status !== 'completed') throw new Error('Not found');
    const value = n => n === null || n === undefined ? 'Not entered' : String(n);
    root.replaceChildren(heading('SAVED WORKOUT', record.workoutSnapshot.name, `Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`),
      el('p', {}, `Active duration: ${formatTime(record.activeDurationMs)}`), el('p', {}, `Finished: ${new Date(record.completedAt).toLocaleString()}`));
    for (const phase of record.workoutSnapshot.phases) {
      const section = el('section', { className: 'exercise-list', 'aria-label': `${phase.name} saved results` }, el('h2', {}, `${phase.name} Results`));
      for (const result of record.results[phase.id]) {
        const exercise = record.workoutSnapshot.exercises.find(ex => ex.id === result.exerciseId);
        section.append(el('h3', {}, exercise.name), el('p', {}, `Weight (kg): ${value(result.weightKg)}`),
          el('p', {}, result.rounds ? `Round 1: ${value(result.rounds[0])} · Round 2: ${value(result.rounds[1])}${exercise.target?.unit.includes('per arm') ? ' · repetitions per arm' : ''}` : `Intervals completed: ${value(result.intervalsCompleted)}`));
      }
      root.append(section);
    }
    root.append(el('p', {}, `Perceived effort: ${value(record.results.perceivedEffort)}`), el('p', { className: 'saved-notes' }, `Workout notes: ${record.results.notes || 'Not entered'}`), button('← Saved workouts', () => go(`#history/${record.workoutId}`), true));
  }).catch(() => root.replaceChildren(emptyState('Session unavailable', 'This saved session could not be read.'), button('← Library', () => go('#library'), true)));
  return root;
}
