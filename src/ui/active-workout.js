import { WorkoutTimer, formatTime } from '../domain/workout-timer.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { el, button, heading } from './components.js';

export function createActiveWorkout(workout, onEnd, onToday) {
  const engine = new WorkoutTimer(workout);
  const audio = createWorkoutAudio();
  const phase = el('p', { className: 'eyebrow', 'aria-live': 'polite' });
  const exercise = el('h2', { className: 'active-exercise', 'aria-live': 'polite' });
  const target = el('p', { className: 'active-target' });
  const clock = el('div', { className: 'phase-clock', 'aria-label': 'Phase time remaining', role: 'timer' });
  const total = el('p', { className: 'total-time' });
  const position = el('p', {});
  const next = el('p', {});
  const progress = el('progress', { max: '1', value: '0', 'aria-label': 'Workout progress' });
  const panel = el('section', { className: 'active-panel', 'aria-label': 'Active workout' }, phase, exercise, target, clock, total, position, next, progress);
  const pause = button('Pause', () => {
    if (engine.status === 'paused') { engine.resume(); startTicker(); }
    else { engine.pause(); stopTicker(); update(); }
  });
  const sound = button('Sound: Off', async () => {
    await audio.toggle(); sound.textContent = audio.enabled ? 'Sound: On' : 'Sound: Off'; sound.setAttribute('aria-pressed', String(audio.enabled));
  }, true);
  sound.setAttribute('aria-pressed', 'false');
  const end = button('End Workout', () => onEnd(), true);
  const controls = el('div', { className: 'active-controls' }, pause, end, sound);
  const root = el('div', { className: 'active-workout' }, heading('ACTIVE WORKOUT', workout.name, 'Follow the prescribed movement, then rest. No session data is saved.'), panel, controls,
    el('p', { className: 'muted' }, 'Keep this screen open. Mobile browsers may suspend timers and audio when locked; the display catches up when the browser clock advances.'));
  let ticker = null;
  let disposed = false;
  let last = null;
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
  function update() {
    if (disposed) return;
    const s = engine.snapshot();
    if (s.stage === 'complete') {
      if (last?.stage !== 'complete') audio.cue('complete');
      stopTicker();
      root.replaceChildren(heading('FINISHED', 'Workout Complete', workout.name), el('p', { className: 'completion-duration' }, `Scheduled duration: ${formatTime(s.durationMs)}`), el('p', {}, 'No session or performance results have been saved.'), button('Return to Today', onToday));
      last = s; return;
    }
    panel.className = `active-panel ${s.stage === 'countdown' ? 'countdown' : s.kind.toLowerCase()}${s.status === 'paused' ? ' paused' : ''}`;
    pause.textContent = s.status === 'paused' ? 'Resume' : 'Pause';
    total.textContent = `Total remaining: ${formatTime(s.totalRemainingMs)}`;
    progress.value = s.progress;
    if (s.stage === 'countdown') {
      setText(phase, s.status === 'paused' ? 'PAUSED · GET READY' : 'GET READY');
      setText(exercise, 'Starting in'); clock.textContent = String(s.countdown);
      target.textContent = 'The countdown is outside your workout time.';
      position.textContent = ''; next.textContent = '';
    } else {
      setText(phase, `${s.phase.name} · ${s.kind}${s.status === 'paused' ? ' · PAUSED' : ''}`);
      setText(exercise, s.exercise.name);
      const prescription = s.exercise.target;
      target.textContent = s.kind === 'REST' ? 'Rest and prepare for the next exercise.' : prescription ? `${prescription.min === prescription.max ? prescription.min : `${prescription.min}–${prescription.max}`} ${prescription.unit}` : 'Work with correct technique.';
      clock.textContent = s.go ? 'GO' : formatTime(s.remainingMs);
      clock.setAttribute('aria-label', `Phase time remaining: ${formatTime(s.remainingMs)}`);
      position.textContent = `Round ${s.round} of ${s.phase.rounds} · ${s.kind === 'EMOM' ? 'Minute' : 'Interval'} ${s.interval + 1} of ${s.phase.timer.intervals}`;
      next.textContent = s.nextExercise ? `Next: ${s.nextExercise.name}` : 'Next: Workout Complete';
      // Delayed/background renders catch up visually without replaying obsolete cues.
      if (last?.stage === 'countdown') audio.cue('start');
      else if (last?.stage === 'exercise' && s.segmentIndex !== last.segmentIndex) audio.cue(s.phase.id !== last.phase.id ? 'block' : 'change');
      else if (s.status === 'running' && Math.ceil(s.remainingMs / 1000) <= 3 && Math.ceil(s.remainingMs / 1000) !== Math.ceil((last?.remainingMs ?? 0) / 1000)) audio.cue('tick');
    }
    last = s;
  }
  function stopTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; }
  function startTicker() { update(); if (!disposed && ticker === null && engine.status === 'running') ticker = setInterval(update, 100); }
  function onVisibility() { if (!document.hidden) update(); }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', stopTicker);
  window.addEventListener('pageshow', startTicker);
  engine.start(); startTicker();
  return {
    root,
    get inProgress() { return !disposed && !['complete', 'ended'].includes(engine.snapshot().status); },
    dispose() {
      disposed = true; engine.end(); stopTicker(); audio.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stopTicker);
      window.removeEventListener('pageshow', startTicker);
    },
  };
}
