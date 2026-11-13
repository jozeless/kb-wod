import { activePresentation } from './active-presentation.js';
import { formatTime } from '../domain/workout-timer.js';
import { prescription } from './exercise-prescription.js';
import { el, button } from './components.js';

export function roundAmrapPresentation(workout, {completeRound, togglePause, end}) {
  const clock = el('div', {className: 'phase-clock', role: 'timer'});
  const pause = button('Pause', togglePause);
  const progress = el('progress', {max: 1, value: 0, 'aria-label': 'Workout progress'});
  const circuit = el('ol', {className: 'prescriptions active-circuit', 'aria-label': 'Seven-exercise circuit'},
    ...workout.exercises.map(ex => el('li', {}, el('strong', {}, ex.name), el('span', {className: 'circuit-target'}, prescription(ex, workout.phases[0])), ex.note ? el('span', {className: 'circuit-target'}, ex.note) : null)));
  const presentation = activePresentation({
    initialPhase: workout.phases[0], phase: el('h1'), clock, exercise: el('h2'), side: el('span'),
    block: el('dd'), total: el('dd'), next: el('span'), circuit, progress,
    controls: el('div', {className: 'active-controls'}, pause, button('End Workout', end, true)),
  });
  presentation.root.classList.add('hm-round-amrap');
  const rounds = el('output', {'aria-label': 'Completed rounds', 'aria-live': 'polite'}, '0');
  const counter = el('p', {className: 'round-counter'}, 'Completed rounds ', rounds);
  const rest = el('p', {className: 'round-rest', role: 'timer', 'aria-label': 'Rest remaining'});
  const round = button('Ronda completa', completeRound);
  round.className = 'round-complete';
  presentation.panel.querySelector('.session-timing').replaceWith(counter, rest, round);
  const card = presentation.panel.querySelector('.current-exercise-card');
  card.setAttribute('aria-label', 'Workout circuit');
  card.replaceChildren(el('h2', {}, 'Seven-exercise circuit'), circuit);
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  return {
    root: presentation.root,
    update(s) {
      presentation.update({...s, kind: s.restRemainingMs > 0 ? 'REST' : 'TRAINING', remainingMs: s.totalRemainingMs, startMs: 0, endMs: s.durationMs});
      text(clock, s.stage === 'countdown' ? String(s.countdown) : formatTime(s.totalRemainingMs));
      clock.setAttribute('aria-label', s.stage === 'countdown' ? `Starting in ${s.countdown}` : `Workout time remaining: ${formatTime(s.totalRemainingMs)}`);
      text(rounds, String(s.completedRounds));
      rest.hidden = s.restRemainingMs === 0;
      text(rest, `Rest remaining: ${formatTime(s.restRemainingMs)}`);
      round.disabled = s.status !== 'running' || s.stage !== 'exercise' || s.restRemainingMs > 0;
      pause.setAttribute('aria-label', s.status === 'paused' ? 'Resume' : 'Pause');
      progress.value = s.progress;
    },
  };
}
