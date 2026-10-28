import { isFridayResults } from '../domain/friday-results.js';
import { isThursdayResults } from '../domain/thursday-results.js';
import { isTuesdayResults, weightedExercises } from '../domain/tuesday-results.js';
import { usesSessionWeights } from '../domain/weights-finisher-results.js';
import { canReadLocal } from '../cloud/identity.js';
import { syncStatus } from './account.js';
import { resultSchema, partialLabel } from '../domain/result-schemas.js';
import { listSessions, getSession } from '../storage/session-store.js';
import { el, button, heading, emptyState } from './components.js';
import { formatTime } from '../domain/workout-timer.js';
export function draftActions(workout, go) {
  const root = el('div', { className: 'draft-actions' });
  void listSessions(workout.id).then(records => {
    for (const record of records.filter(r => canReadLocal(r) && r.status === 'draft' && r.workoutVersion === workout.version)) {
      root.append(button(`Resume draft — ${new Date(record.startedAt).toLocaleString()}`, () => go(`#active/${workout.id}/${workout.version}?draft=${record.id}`), true));
    }
  }).catch(() => root.append(el('p', { role: 'status' }, 'Saved drafts could not be read.')));
  return root;
}
export function historyView(workoutId, go) {
  const root = el('div', {}, heading('LOCAL SESSIONS', 'Saved workouts', 'Local results and downloaded sessions for the current account.'), button('← Library', () => go('#library'), true));
  const list = el('div', { className: 'library-grid' }); root.append(list);
  void listSessions(workoutId).then(records => {
    const saved = records.filter(record => canReadLocal(record) && record.status === 'completed');
    if (!saved.length) list.append(emptyState('No saved sessions', 'Complete all workout blocks and choose Save Workout to record a session.'));
    for (const record of saved) list.append(button(`${record.workoutSnapshot.name} · Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`, () => go(`#session/${record.id}`), true));
  }).catch(() => list.append(emptyState('History unavailable', 'Local session storage could not be read. Please retry.')));
  return root;
}
export function savedSessionView(id, go) {
  const root = el('div', {}, heading('LOCAL SESSION', 'Loading saved workout', 'Reading the immutable session snapshot…'));
  void getSession(id).then(record => {
    if (!canReadLocal(record) || record.status !== 'completed') throw new Error('Not found');
    const value = n => n === null || n === undefined ? 'Not entered' : String(n);
    root.replaceChildren(heading('SAVED WORKOUT', record.workoutSnapshot.name, `Version ${record.workoutVersion} · ${new Date(record.startedAt).toLocaleString()}`),
      syncStatus(record), el('p', {}, `Active duration: ${formatTime(record.activeDurationMs)}`), el('p', {}, `Finished: ${new Date(record.completedAt).toLocaleString()}`));
    if(usesSessionWeights(record.workoutSnapshot)) {
      const weights=el('section',{'aria-label':'Recorded exercise weights'},el('h2',{},'Exercise weights'));
      for(const exercise of weightedExercises(record.workoutSnapshot))weights.append(el('p',{},`${exercise.name}: ${value(record.results.exerciseWeights[exercise.id])}${record.results.exerciseWeights[exercise.id]===null?'':' kg'}`));
      if(isFridayResults(record.workoutSnapshot)) {
        root.append(weights, el('section', {'aria-label': 'Recorded key exercise'},
          el('h2', {}, 'Alternating Floor Press — Final set'),
          el('p', {}, 'Fourth Floor Press set (06:00–07:00), not totals across all rounds.'),
          el('p', {}, `Floor Press left arm repetitions: ${value(record.results.keyExercise.leftReps)}`),
          el('p', {}, `Floor Press right arm repetitions: ${value(record.results.keyExercise.rightReps)}`)),
          el('section', {'aria-label': 'Recorded finisher'}, el('h2', {}, 'Finisher'), el('p', {}, `Complete finisher rounds: ${value(record.results.finisher.fullRounds)}`)));
      } else root.append(weights,el('p',{},isThursdayResults(record.workoutSnapshot) ? `Total finisher steps: ${value(record.results.finisher.totalSteps)}` : isTuesdayResults(record.workoutSnapshot) ? `Complete finisher rounds: ${value(record.results.finisher.fullRounds)}` : `KB Thruster completed repetitions: ${value(record.results.finisher.reps)}`));
    } else for (const phase of record.workoutSnapshot.phases) {
      const section = el('section', { className: 'exercise-list', 'aria-label': `${phase.name} saved results` }, el('h2', {}, `${phase.name} Results`));
      const schema = resultSchema(record.workoutSnapshot), block = record.results[phase.id];
      const amrap = schema.blocks[phase.id]?.kind === 'amrap';
      if (amrap) section.append(el('p', {}, `Full rounds completed: ${value(block.fullRounds)}`));
      for (const result of amrap ? block.exercises : block) {
        const exercise = record.workoutSnapshot.exercises.find(ex => ex.id === result.exerciseId);
        const unit = exercise.target?.unit.includes('per arm') ? ' · repetitions per arm' : exercise.target?.unit.includes('per side') ? ' · count per side' : exercise.target?.unit.includes('per leg') ? ' · count per leg' : '';
        const counts = result.rounds ? result.rounds.map((count, index) => `Round ${index + 1}: ${value(count)}`).join(' · ') + unit : amrap ? `${partialLabel(exercise)}: ${value(result.partialReps)}` : `Intervals completed: ${value(result.intervalsCompleted)}`;
        section.append(el('h3', {}, exercise.name), el('p', {}, `${schema.weightLabel}: ${value(result.weightKg)}`), el('p', {}, counts));
      }
      root.append(section);
    }
    if(!isFridayResults(record.workoutSnapshot) && !isTuesdayResults(record.workoutSnapshot) && !isThursdayResults(record.workoutSnapshot))root.append(el('p', {}, `Perceived effort: ${value(record.results.perceivedEffort)}`), el('p', { className: 'saved-notes' }, `Workout notes: ${record.results.notes || 'Not entered'}`), button('← Saved workouts', () => go(`#history/${record.workoutId}`), true));
    if(isFridayResults(record.workoutSnapshot) || isTuesdayResults(record.workoutSnapshot) || isThursdayResults(record.workoutSnapshot))root.append(button('← Saved workouts', () => go(`#history/${record.workoutId}`), true));
  }).catch(() => root.replaceChildren(emptyState('Session unavailable', 'This saved session could not be read.'), button('← Library', () => go('#library'), true)));
  return root;
}
