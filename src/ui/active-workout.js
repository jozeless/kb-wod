import { activePresentation } from './active-presentation.js';
import { prescription } from './exercise-prescription.js';
import { createCueTracker } from '../domain/workout-cues.js';
import { createWeightField } from './weight-field.js';
import { WorkoutTimer, formatTime } from '../domain/workout-timer.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { el, button, heading } from './components.js';

export function createActiveWorkout(workout, onEnd, onToday) {
  const engine = new WorkoutTimer(workout);
  const audio = createWorkoutAudio({profile: workout.audioProfile});
  const cues = createCueTracker();
  const weight = createWeightField(workout);
  weight.root.hidden = true;
  const phase = el('h1', { className: 'eyebrow', 'aria-live': 'polite' });
  const exercise = el('h2', { className: 'active-exercise', 'aria-live': 'polite' });
  const target = el('p', { className: 'active-target' });
  const clock = el('div', { className: 'phase-clock', 'aria-label': 'Phase time remaining', role: 'timer' });
  const block = el('dd', {className:'block-time'});
  const total = el('dd', { className: 'total-time' });
  const position = el('p', {});
  const next = el('p', {});
  const circuit = el('ol', { className: 'prescriptions active-circuit', 'aria-label': 'AMRAP circuit', hidden: '' });
  let circuitPhase = null;
  const progress = el('progress', { max: '1', value: '0', 'aria-label': 'Workout progress' });
  const pause = button('Pause', () => {
    if (engine.status === 'paused') { engine.resume(); startTicker(); }
    else { engine.pause(); audio.silence(); stopTicker(); update(); }
  });
  const end = button('End Workout', () => onEnd(), true);
  const controls = el('div', { className: 'active-controls' }, pause, end);
  const presentation = activePresentation({
    heading: heading('ACTIVE WORKOUT', workout.name, 'Follow the prescribed movement, then rest. No session data is saved.'),
    initialPhase: workout.phases[0], block, phase, exercise, target, weight, clock, total, position, next, circuit, progress, controls,
  });
  const panel = presentation.panel;
  const root = el('div', { className: 'active-workout' }, presentation.root,
    el('p', { className: 'muted' }, 'Keep this screen open. Mobile browsers may suspend timers and audio when locked; the display catches up when the browser clock advances.'));
  let ticker = null;
  let disposed = false;
  // This runs inside the Start Workout click, before its gesture is lost.
  void audio.enable();
  function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
  function update(audible = true) {
    if (disposed) return;
    const s = engine.snapshot();
    const cue = cues.next(s, audible && !document.hidden);
    if (cue) audio.cue(cue);
    if (s.stage === 'complete') {
      stopTicker();
      root.replaceChildren(heading('FINISHED', 'Workout Complete', workout.name), el('p', { className: 'completion-duration' }, `Scheduled duration: ${formatTime(s.durationMs)}`), el('p', {}, 'No session or performance results have been saved.'), button('Return to Today', onToday));
      return;
    }
    panel.className = `active-panel ${s.stage === 'countdown' ? 'countdown' : s.kind.toLowerCase()}${s.status === 'paused' ? ' paused' : ''}`;
    pause.setAttribute('aria-label', s.status === 'paused' ? 'Resume' : 'Pause');
    total.textContent = formatTime(s.totalRemainingMs);
    // Bind the existing compiled phase boundary; do not create another clock.
    block.textContent = formatTime(s.stage === 'countdown' ? workout.phases[0].durationSeconds * 1000 : engine.timeline.segments.filter(segment => segment.phase.id === s.phase.id).at(-1).endMs - s.elapsedMs);
    progress.value = s.progress;
    if (s.stage === 'countdown') {
      setText(exercise, 'Starting in'); clock.textContent = String(s.countdown);
      target.textContent = 'The countdown is outside your workout time.';
      position.textContent = ''; next.textContent = workout.exercises.find(ex => ex.id === workout.phases[0].exerciseIds[0])?.name || workout.phases[0].name;
    } else {
      const amrap = s.kind === 'AMRAP';
      weight.root.hidden = amrap; circuit.hidden = !amrap;
      if (amrap) {
        setText(exercise, s.phase.name);
        target.textContent = s.phase.instructions;
        if (circuitPhase !== s.phase.id) {
          circuitPhase = s.phase.id;
          circuit.replaceChildren(...s.circuit.map(ex => el('li', {},
            el('strong', {}, ex.name), el('span', {className:'circuit-target'}, prescription(ex, s.phase)))));
        }
      } else {
        weight.setExercise(s.exercise);
        setText(exercise, s.exercise.name);
        target.textContent = s.kind === 'REST' ? 'Rest and prepare for the next exercise.' : `${s.exercise.target ? prescription(s.exercise, s.phase, {active: true}) : 'Work with correct technique.'}${s.exercise.note ? ` · ${s.exercise.note}` : ''}`;
      }
      clock.textContent = s.go ? 'GO' : formatTime(s.remainingMs);
      clock.setAttribute('aria-label', `Phase time remaining: ${formatTime(s.remainingMs)}`);
      position.textContent = amrap ? 'AMRAP · Repeat at your own pace' : `Round ${s.round} of ${s.phase.rounds} · ${s.kind === 'EMOM' ? 'Minute' : 'Interval'} ${s.interval + 1} of ${s.phase.timer.intervals}`;
      next.textContent = s.nextExercise ? `${s.nextExercise.name}` : s.nextPhase?.format === 'amrap' ? `${s.nextPhase.name} circuit` : 'Workout Complete';

    }
    presentation.update(s);
  }
  function stopTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; }
  function startTicker(audible = true) { update(audible); if (!disposed && ticker === null && engine.status === 'running') ticker = setInterval(update, 100); }
  function onVisibility() { if (document.hidden) audio.silence(); else update(false); }
  function onPageHide() { stopTicker(); audio.silence(); }
  function onPageShow() { startTicker(false); }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  engine.start(); startTicker();
  return {
    root,
    get inProgress() { return !disposed && !['complete', 'ended'].includes(engine.snapshot().status); },
    dispose() {
      disposed = true; engine.end(); stopTicker(); audio.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    },
  };
}
