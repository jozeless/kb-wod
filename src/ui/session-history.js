import { isAvailableSession } from '../data/catalog.js';
import { roundTimesView } from './round-times.js';
import { canReadLocal } from '../cloud/identity.js';
import { syncStatus } from './account.js';
import { listSessions, getSession } from '../storage/session-store.js';
import { el, button, heading, emptyState } from './components.js';
import { formatTime } from '../domain/workout-timer.js';
export function historyView(workoutId, go) {
  const root = el('div', {}, heading('LOCAL SESSIONS', 'Saved workouts', 'Local results and downloaded sessions for the current account.'), button('← Library', () => go('#library'), true));
  const list = el('div', { className: 'library-grid' }); root.append(list);
  void listSessions(workoutId).then(records => {
    const saved = records.filter(record => canReadLocal(record) && record.status === 'completed' && isAvailableSession(record));
    if (!saved.length) list.append(emptyState('No saved sessions', 'Complete all workout blocks and choose Save Workout to record a session.'));
    for (const record of saved) list.append(button(`${record.workoutSnapshot.name} · Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`, () => go(`#session/${record.id}`), true));
  }).catch(() => list.append(emptyState('History unavailable', 'Local session storage could not be read. Please retry.')));
  return root;
}
export function savedSessionView(id, go) {
  const root = el('div', {}, heading('LOCAL SESSION', 'Loading saved workout', 'Reading the immutable session snapshot…'));
  void getSession(id).then(record => {
    if (!canReadLocal(record) || record.status !== 'completed' || !isAvailableSession(record)) throw new Error('Not found');
    const value = n => n === null || n === undefined ? 'Not entered' : String(n);
    root.replaceChildren(heading('SAVED WORKOUT', record.workoutSnapshot.name, `Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`),
      syncStatus(record), el('p', {}, `Active duration: ${formatTime(record.activeDurationMs)}`), el('p', {}, `Finished: ${new Date(record.completedAt).toLocaleString()}`));
    root.append(el('p', {}, `Completed rounds: ${value(record.results.completedRounds)}`), el('p', {}, `Additional repetitions: ${value(record.results.partialReps === undefined ? 0 : record.results.partialReps)}`),
      roundTimesView(record.results, record.workoutSnapshot.durationSeconds * 1000), button('← Saved workouts', () => go(`#history/${record.workoutId}`), true));
  }).catch(() => root.replaceChildren(emptyState('Session unavailable', 'This saved session could not be read.'), button('← Library', () => go('#library'), true)));
  return root;
}
