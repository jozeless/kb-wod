import { currentUserId } from '../cloud/identity.js';
import { activePresentation } from './active-presentation.js';
import { usesSessionWeights } from '../domain/weights-finisher-results.js';
import { syncStatus } from './account.js';
import { WorkoutTimer, formatTime } from '../domain/workout-timer.js';
import { createCueTracker } from '../domain/workout-cues.js';
import { createDraft, blockResults, finalResults, blockOffset, resultSchema } from '../domain/result-schemas.js';
import { completeSession } from '../storage/session-store.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { createWeightField } from './weight-field.js';
import { resultForm } from './block-result-form.js';
import { prescription } from './exercise-prescription.js';
import { el, button, heading } from './components.js';

export function createBlockTraining(workout, { onExit, onHistory }) {
  const id = crypto.randomUUID();
  const root = el('div', { className: 'active-workout' }, heading(workout.code, 'Preparing session', 'Preparing your workout…'));
  const audio = createWorkoutAudio();
  const continuous = workout.execution?.mode === 'continuous-results';
  const timeOffset = () => continuous ? 0 : blockOffset(workout, record.blockIndex);
  let record, engine, cues, ticker = null, disposed = false, busy = false;
  let formView = null, training = null;
  function message(text) { if (formView) formView.message.textContent = text; }
  function capture() {
    if (!engine || !record?.stage?.endsWith('-active')) return;
    const s = engine.snapshot();
    record.checkpointMs = Math.min(engine.elapsed(), engine.timeline.durationMs + engine.countdownMs);
    record.activeDurationMs = timeOffset() + s.elapsedMs;
  }
  function stopTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; }
  function stopAudio() { audio.silence(); }
  function showSaved() {
    stopTicker(); if(engine?.status!=='complete')stopAudio(); formView = null;
    root.replaceChildren(heading('SAVED', 'Workout saved', 'Your results were committed to local session storage.'),
      syncStatus(record), button('View saved session', () => onHistory(record.id)), button('Return to Today', onExit, true));
  }
  function showForm() {
    stopTicker(); training = null;
    const blockId = workout.phases[record.blockIndex].id;
    formView = resultForm(record, blockId, { changed: () => message(''), continueBlock, save });
    root.replaceChildren(formView.root, button('Return to Today', onExit, true));
  }
  async function continueBlock() {
    if (busy) return;
    try { blockResults(workout, record.form, workout.phases[record.blockIndex].id); }
    catch (error) { message(error.message); return; }
    busy = true; formView.setBusy(true);
    // Continue is an explicit audio-unlock gesture; never replay earlier cues.
    if (record.soundEnabled) void audio.enable();
    record.blockIndex++; record.stage = `${workout.phases[record.blockIndex].id}-active`; record.checkpointMs = 0;
    beginBlock();
    busy = false;
  }
  async function save() {
    if (busy) return;
    if (record.ownerId !== currentUserId()) { message('Account changed. Start a new workout before saving.'); return; }
    try { record.results = finalResults(record); }
    catch (error) { message(error.message); return; }
    busy = true; formView.setBusy(true); message('Saving workout…');
    try {
      record = await completeSession(record);
      if (!disposed) showSaved();
    } catch { message('Workout could not be saved. Your entries are still here. Retry Save Workout.'); }
    finally { busy = false; if (formView) formView.setBusy(false); }
  }
  function finishBlock(audible) {
    if (continuous) {
      record.blockIndex = workout.phases.length - 1;
      record.completedBlocks = workout.phases.map(p => p.id);
    }
    const phase = workout.phases[record.blockIndex];
    capture(); stopTicker();
    // Result forms are silent; only the final block produces COMPLETE.
    const s = engine.snapshot();
    const cue = cues.next({ ...s, elapsedMs: timeOffset() + s.elapsedMs }, record.blockIndex === workout.phases.length - 1 && audible && !document.hidden);
    if (cue) audio.cue(cue);
    if (!record.completedBlocks.includes(phase.id)) record.completedBlocks.push(phase.id);
    record.stage = `${phase.id}-results`;
    if (record.blockIndex === workout.phases.length - 1) record.completedAt = new Date().toISOString();
    // Session fields were prefilled at creation. Never overwrite actual entries at a transition.
    showForm();
  }
  function update(audible = true) {
    if (disposed || !engine || !record.stage.endsWith('-active')) return;
    const s = engine.snapshot();
    if (continuous && s.phase) {
      record.blockIndex = workout.phases.findIndex(p => p.id === s.phase.id);
      record.stage = `${s.phase.id}-active`;
      record.completedBlocks = workout.phases.slice(0, record.blockIndex).map(p => p.id);
    }
    const phase = workout.phases[record.blockIndex];
    if (s.stage === 'complete') { finishBlock(audible); return; }
    const offset = timeOffset();
    const cue = cues.next({ ...s, elapsedMs: offset + s.elapsedMs }, audible && !document.hidden);
    if (cue === 'start') {
      if (!record.hasStarted) { record.hasStarted = true; audio.cue('start'); }
    } else if (cue) audio.cue(cue);
    training.panel.className = `active-panel ${s.kind?.toLowerCase() || 'countdown'}${s.status === 'paused' ? ' paused' : ''}`;
    const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    text(training.phase, `${phase.name} · ${s.stage === 'countdown' ? 'GET READY' : s.kind?.replaceAll('_',' ')}${s.status === 'paused' ? ' · PAUSED' : ''}`);
    text(training.clock, s.stage === 'countdown' ? String(s.countdown) : s.go ? 'GO' : formatTime(s.remainingMs));
    text(training.block, `Block remaining: ${formatTime(continuous ? blockOffset(workout, record.blockIndex) + phase.durationSeconds * 1000 - s.elapsedMs : s.totalRemainingMs)}`);
    text(training.total, `Total active remaining: ${formatTime(workout.durationSeconds * 1000 - offset - s.elapsedMs)}`);
    const amrap = s.kind === 'AMRAP';
    training.circuit.hidden = !amrap;
    if (amrap && training.circuitPhase !== phase.id) {
      training.circuitPhase = phase.id;
      training.circuit.replaceChildren(...s.circuit.map(ex => el('li', {}, el('div', { className: 'exercise-weight-row' }, el('strong', {}, ex.name), ex.equipment === 'bodyweight' ? null : sessionWeightField(ex).root), el('p', {}, prescription(ex, phase)))));
    }
    text(training.exercise, amrap ? phase.name : s.kind === 'TRANSITION' ? phase.name : s.exercise?.name || 'Starting in');
    text(training.target, amrap || s.kind === 'TRANSITION' || s.kind === 'AMRAP_REPS' ? phase.instructions : s.exercise ? (s.kind === 'REST' ? 'Rest and prepare for the next exercise.' : prescription(s.exercise, phase)) : 'This countdown is outside your activity time.');
    training.side.hidden = !s.holdingSide;
    text(training.side, s.holdingSide ? `Holding: ${s.holdingSide.toUpperCase()} hand` : '');
    text(training.position, s.holdingSide ? 'Controlled march · One knee lift = one step · Count total steps' : s.kind === 'TRANSITION' ? 'Automatic transition · Rest and prepare' : s.kind === 'AMRAP_REPS' ? 'AMRAP repetitions · Count complete reps' : amrap ? 'AMRAP · Repeat at your own pace' : s.exercise ? `Round ${s.round} of ${phase.rounds} · Interval ${s.interval + 1} of ${phase.timer.intervals}` : '');
    const resultTitle = usesSessionWeights(workout) ? 'Workout Results' : resultSchema(workout).blocks[phase.id].title;
    text(training.next, s.holdingSide === 'right' ? 'Next: LEFT hand (automatic switch)' : amrap ? `Next: ${continuous && s.nextPhase ? s.nextPhase.name : resultTitle}` : s.exercise ? (s.nextExercise ? `Next: ${s.nextExercise.name}` : `Next: ${continuous && s.nextPhase ? s.nextPhase.name : resultTitle}`) : '');
    training.weight.root.hidden = !s.exercise || s.exercise.equipment === 'bodyweight'; if (s.exercise && s.exercise.equipment !== 'bodyweight') training.weight.setExercise(s.exercise);
    training.progress.value = (offset + s.elapsedMs) / (workout.durationSeconds * 1000);
    training.pause.textContent = s.status === 'paused' ? 'Resume' : 'Pause';
    training.presentation.update(s);
    capture();
  }
  function sessionWeightField(initialExercise) {
    if(!usesSessionWeights(workout))return createWeightField(workout,initialExercise);
    return createWeightField(workout,initialExercise,{
      read:exercise=>record.form.weights[exercise.id],
      changed:(exercise,raw)=>{record.form.weights[exercise.id]=raw;delete record.form.invalid[`weights.${exercise.id}`];},
    });
  }
  function beginBlock() {
    if (disposed) return;
    formView = null;
    const phase = workout.phases[record.blockIndex];
    engine = new WorkoutTimer(continuous ? workout : { ...workout, durationSeconds: phase.durationSeconds, phases: [phase] });
    engine.start();
    cues = createCueTracker(); cues.next({ ...engine.snapshot(), elapsedMs: timeOffset() + engine.snapshot().elapsedMs }, false);
    const weight = sessionWeightField(); weight.root.hidden = true;
    const phaseLabel = el('p', { className: 'eyebrow', 'aria-live': 'polite' }), exercise = el('h2', { className: 'active-exercise' }), target = el('p', {});
    const side = el('h2', {className: 'holding-side', 'aria-live': 'polite', hidden: ''});
    const clock = el('div', { className: 'phase-clock', role: 'timer' }), block = el('p', { className: 'block-time' }), total = el('p', {}), position = el('p', {}), next = el('p', {});
    const pause = button(engine.status === 'paused' ? 'Resume' : 'Pause', () => {
      // Resume retries audio within a user gesture without replaying missed cues.
      if (engine.status === 'paused') { record.soundEnabled = true; void audio.enable(); engine.resume(); tick(); }
      else { engine.pause(); stopTicker(); stopAudio(); update(false); }
      capture();
    });
    const circuit = el('ol', { className: 'prescriptions active-circuit', 'aria-label': 'AMRAP circuit', hidden: '' });
    const progress = el('progress', { max: '1', value: '0', 'aria-label': 'Workout progress' });
    const presentation = activePresentation({
      heading: heading(`${workout.code} · VERSION ${workout.version}`, workout.name, continuous ? usesSessionWeights(workout) ? 'Recorded weights stay with this session. Results follow the finisher.' : 'Record actual results after all 20 active minutes.' : 'Record actual results between the blocks.'),
      phase: phaseLabel, exercise, side, target, weight, clock, block, total, position, next, circuit, progress,
      controls: el('div', { className: 'active-controls' }, pause, button('End Workout', onExit, true)),
    });
    training = { panel: presentation.panel, presentation, phase: phaseLabel, exercise, side, target, clock, block, total, position, next, weight, pause, progress, circuit, circuitPhase: null };
    root.replaceChildren(presentation.root);
    update(false); if (engine.status === 'running') tick();
  }
  function tick(audible = true) { if (disposed) return; update(audible); if (ticker === null && record.stage.endsWith('-active') && engine.status === 'running') ticker = setInterval(update, 100); }
  async function initialize() {
    try {
      let storage; try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); } }; }
      // Reuse the existing result envelope/validation without persisting it.
      // Preserve the ownership previously captured by the initial draft transaction.
      record = {...createDraft(workout, storage, id), ownerId: currentUserId()};
      await unlock; if (disposed) return; record.soundEnabled = true;
      if (!disposed) beginBlock();
    } catch {
      record = null;
      root.replaceChildren(heading('WORKOUT', 'Session could not be opened', 'No workout has started. Existing data has not been replaced.'), button('Retry', initialize), button('Return to Today', onExit, true));
    }
  }
  const unlock = audio.enable();
  function onVisibility() { if (document.hidden) stopAudio(); else update(false); }
  function onPageHide() { capture(); stopTicker(); stopAudio(); }
  function onPageShow() { if (record?.stage?.endsWith('-active') && engine?.status === 'running') tick(false); }
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
  void initialize();
  return {
    id, root, exitMessage: 'End this workout? Your progress will not be saved.',
    get inProgress() { return !disposed && Boolean(record && record.status !== 'completed'); },
    dispose() { disposed = true; engine?.end(); stopTicker(); audio.dispose(); record = null; formView = null; training = null; document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); window.removeEventListener('pageshow', onPageShow); },
  };
}
