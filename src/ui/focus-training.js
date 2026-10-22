import { WorkoutTimer, formatTime } from '../domain/workout-timer.js';
import { createCueTracker } from '../domain/workout-cues.js';
import { createDraft, blockResults, finalResults, preferredWeight } from '../domain/focus-results.js';
import { getSession, putDraft, completeSession } from '../storage/session-store.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { createWeightField } from './weight-field.js';
import { resultForm } from './focus-result-form.js';
import { prescription } from './exercise-prescription.js';
import { el, button, heading } from './components.js';

export function createFocusTraining(workout, { draftId, recover = false, onExit, onHistory }) {
  const id = draftId || crypto.randomUUID();
  const root = el('div', { className: 'active-workout' }, heading('FOCUS 001', 'Preparing session', 'Opening local session storage…'));
  const audio = createWorkoutAudio();
  let record, engine, cues, ticker = null, disposed = false, busy = false;
  let queue = Promise.resolve(), pending = 0, lastError = false, lastCheckpoint = -1;
  let formView = null, training = null;
  const draftMessage = el('p', { role: 'status', className: 'result-message' });
  function message(text) { (formView?.message || draftMessage).textContent = text; }
  function persist() {
    if (!record || record.status === 'completed') return Promise.resolve(true);
    const snapshot = structuredClone(record); pending++;
    draftMessage.textContent = 'Saving draft…';
    const operation = queue.then(() => putDraft(snapshot));
    queue = operation.catch(() => {});
    return operation.then(saved => {
      lastError = false;
      if (saved.status === 'completed' && !disposed) { record = saved; showSaved(); }
      return true;
    }, () => { lastError = true; draftMessage.textContent = 'Draft could not be saved. Keep this screen open and retry before continuing.'; return false; }).finally(() => { pending--; if (!lastError) draftMessage.textContent = pending ? 'Saving draft…' : 'Draft saved locally.'; });
  }
  function capture() {
    if (!engine || !record?.stage?.endsWith('-active')) return;
    const s = engine.snapshot();
    record.checkpointMs = Math.min(engine.elapsed(), engine.timeline.durationMs + engine.countdownMs);
    record.activeDurationMs = record.blockIndex * engine.timeline.durationMs + s.elapsedMs;
  }
  function stopTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; }
  function stopAudio() { audio.silence(); }
  function soundButton() {
    const control = button(record.soundEnabled ? 'Sound: On' : 'Sound: Off', async () => {
      await audio.toggle(); record.soundEnabled = audio.enabled;
      control.textContent = audio.enabled ? 'Sound: On' : 'Sound: Off'; control.setAttribute('aria-pressed', String(audio.enabled)); void persist();
    }, true);
    control.setAttribute('aria-pressed', String(record.soundEnabled)); return control;
  }
  function showSaved() {
    stopTicker(); stopAudio(); formView = null;
    root.replaceChildren(heading('SAVED', 'Workout saved', 'Your results were committed to local session storage.'),
      button('View saved session', () => onHistory(record.id)), button('Return to Today', onExit, true));
  }
  function showForm() {
    stopTicker(); training = null;
    const blockId = record.stage === 'upper-results' ? 'upper' : 'abs';
    formView = resultForm(record, blockId, { changed: () => { message(''); void persist(); }, continueToAbs, save });
    root.replaceChildren(formView.root, draftMessage, button('Return to Today', onExit, true));
    if (lastError) message('Draft could not be saved. Keep this screen open and retry before continuing.');
  }
  async function continueToAbs() {
    if (busy) return;
    try { blockResults(workout, record.form, 'upper'); }
    catch (error) { message(error.message); return; }
    busy = true; formView.setBusy(true);
    // Re-unlock after recovery, within this explicit user gesture. Do not replay start.
    if (record.soundEnabled) void audio.enable();
    if (await persist()) {
      if (disposed) return;
      record.blockIndex = 1; record.stage = 'abs-active'; record.checkpointMs = 0;
      if (await persist()) { if (!disposed) beginBlock(false); }
      else { record.stage = 'upper-results'; record.blockIndex = 0; }
    }
    busy = false; if (formView) formView.setBusy(false);
  }
  async function save() {
    if (busy) return;
    try { record.results = finalResults(record); }
    catch (error) { message(error.message); return; }
    busy = true; formView.setBusy(true); message('Saving workout…');
    try {
      await queue;
      record = await completeSession(record);
      if (!disposed) showSaved();
    } catch { message('Workout could not be saved. Your entries are still here. Retry Save Workout.'); }
    finally { busy = false; if (formView) formView.setBusy(false); }
  }
  function finishBlock(audible) {
    const phase = workout.phases[record.blockIndex];
    capture(); stopTicker();
    // Upper ends at minute 10, not the final workout signal. ABS ends at minute 20.
    const offset = record.blockIndex * phase.durationSeconds * 1000;
    const s = engine.snapshot();
    const completed = { ...s, elapsedMs: offset + s.elapsedMs };
    if (record.blockIndex === 0) Object.assign(completed, { stage: 'exercise', status: 'running', phase, kind: 'REST', remainingMs: 0, segmentIndex: engine.timeline.segments.length });
    const cue = cues.next(completed, audible && !document.hidden);
    if (cue) audio.cue(cue);
    if (!record.completedBlocks.includes(phase.id)) record.completedBlocks.push(phase.id);
    record.stage = record.blockIndex === 0 ? 'upper-results' : 'abs-results';
    if (record.blockIndex === 1) record.completedAt = new Date().toISOString();
    for (const exerciseId of phase.exerciseIds) {
      try { record.form[phase.id][exerciseId].weightKg = preferredWeight(window.localStorage, workout, workout.exercises.find(ex => ex.id === exerciseId)); } catch { /* Keep the initial optional preference. */ }
    }
    showForm(); void persist();
  }
  function update(audible = true) {
    if (disposed || !engine || !record.stage.endsWith('-active')) return;
    const s = engine.snapshot(), phase = workout.phases[record.blockIndex];
    if (s.stage === 'complete') { finishBlock(audible); return; }
    const offset = record.blockIndex * phase.durationSeconds * 1000;
    const cue = cues.next({ ...s, elapsedMs: offset + s.elapsedMs }, audible && !document.hidden);
    if (cue === 'start') {
      if (!record.hasStarted) { record.hasStarted = true; audio.cue('start'); void persist(); }
    } else if (cue) audio.cue(cue === 'change' && s.kind === 'REST' ? 'rest' : cue);
    training.panel.className = `active-panel ${s.kind?.toLowerCase() || 'countdown'}${s.status === 'paused' ? ' paused' : ''}`;
    const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    text(training.phase, `${phase.name} · ${s.stage === 'countdown' ? 'GET READY' : s.kind}${s.status === 'paused' ? ' · PAUSED' : ''}`);
    text(training.clock, s.stage === 'countdown' ? String(s.countdown) : s.go ? 'GO' : formatTime(s.remainingMs));
    text(training.block, `Block remaining: ${formatTime(s.totalRemainingMs)}`);
    text(training.total, `Total active remaining: ${formatTime(workout.durationSeconds * 1000 - offset - s.elapsedMs)}`);
    text(training.exercise, s.exercise?.name || 'Starting in');
    text(training.target, s.exercise ? (s.kind === 'REST' ? 'Rest and prepare for the next exercise.' : prescription(s.exercise, phase)) : 'This countdown is outside your activity time.');
    text(training.position, s.exercise ? `Round ${s.round} of ${phase.rounds} · Interval ${s.interval + 1} of ${phase.timer.intervals}` : '');
    text(training.next, s.exercise ? (s.nextExercise ? `Next: ${s.nextExercise.name}` : `Next: ${phase.name} Results`) : '');
    training.weight.root.hidden = !s.exercise; if (s.exercise) training.weight.setExercise(s.exercise);
    training.progress.value = (offset + s.elapsedMs) / (workout.durationSeconds * 1000);
    training.pause.textContent = s.status === 'paused' ? 'Resume' : 'Pause';
    const checkpoint = Math.floor(engine.elapsed() / 1000);
    if (checkpoint !== lastCheckpoint) { lastCheckpoint = checkpoint; capture(); void persist(); }
  }
  function beginBlock(restored) {
    if (disposed) return;
    formView = null; lastCheckpoint = -1;
    const phase = workout.phases[record.blockIndex];
    engine = new WorkoutTimer({ ...workout, durationSeconds: phase.durationSeconds, phases: [phase] });
    if (restored) engine.restorePaused(record.checkpointMs); else engine.start();
    cues = createCueTracker(); cues.next({ ...engine.snapshot(), elapsedMs: record.blockIndex * phase.durationSeconds * 1000 + engine.snapshot().elapsedMs }, false);
    const weight = createWeightField(workout); weight.root.hidden = true;
    const phaseLabel = el('p', { className: 'eyebrow', 'aria-live': 'polite' }), exercise = el('h2', { className: 'active-exercise' }), target = el('p', {});
    const clock = el('div', { className: 'phase-clock', role: 'timer' }), block = el('p', { className: 'block-time' }), total = el('p', {}), position = el('p', {}), next = el('p', {});
    const pause = button(engine.status === 'paused' ? 'Resume' : 'Pause', () => {
      if (engine.status === 'paused') { if (record.soundEnabled) void audio.enable(); engine.resume(); tick(); }
      else { engine.pause(); stopTicker(); stopAudio(); update(false); }
      capture(); void persist();
    });
    const progress = el('progress', { max: '1', value: '0', 'aria-label': 'Workout progress' });
    const panel = el('section', { className: 'active-panel', 'aria-label': 'Active workout' }, phaseLabel, exercise, target, weight.root, clock, block, total, position, next, progress);
    training = { panel, phase: phaseLabel, exercise, target, clock, block, total, position, next, weight, pause, progress };
    root.replaceChildren(heading('FOCUS 001 · VERSION 2', workout.name, 'Record actual results between the blocks.'), panel,
      el('div', { className: 'active-controls' }, pause, button('End Workout', () => { if (confirm('Leave this workout? A recoverable draft will remain.')) onExit(); }, true), soundButton()), draftMessage);
    if (restored && engine.status === 'complete') finishBlock(false);
    else { update(false); if (engine.status === 'running') tick(); }
  }
  function tick(audible = true) { if (disposed) return; update(audible); if (ticker === null && record.stage.endsWith('-active') && engine.status === 'running') ticker = setInterval(update, 100); }
  async function initialize() {
    try {
      if (recover) {
        record = await getSession(id);
        if (!record || record.schemaVersion !== 1 || record.workoutId !== workout.id || record.workoutVersion !== workout.version || !record.form?.invalid || !['upper-active', 'upper-results', 'abs-active', 'abs-results'].includes(record.stage) || ![0, 1].includes(record.blockIndex) || record.workoutSnapshot?.id !== workout.id || record.workoutSnapshot.version !== workout.version) throw new Error('Draft unavailable');
        workout = record.workoutSnapshot;
      } else {
        let storage; try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); } }; }
        record = createDraft(workout, storage, id);
        await putDraft(record);
        await unlock; record.soundEnabled = audio.enabled;
      }
      if (disposed) return;
      if (record.status === 'completed') showSaved();
      else if (record.stage.endsWith('-results')) showForm();
      else beginBlock(recover);
    } catch {
      record = null;
      root.replaceChildren(heading('LOCAL STORAGE', 'Session could not be opened', 'No workout has started. Existing data has not been replaced.'), button('Retry', initialize), button('Return to Today', onExit, true));
    }
  }
  const unlock = !recover ? audio.enable() : Promise.resolve();
  function onVisibility() { if (document.hidden) stopAudio(); else update(false); }
  function onPageHide() { capture(); void persist(); stopTicker(); stopAudio(); }
  function onPageShow() { if (record?.stage?.endsWith('-active') && engine?.status === 'running') tick(false); }
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
  void initialize();
  return {
    id, root, exitMessage: 'Leave this workout? A draft is retained; unsaved changes may be lost.',
    get inProgress() { if (record?.status === 'completed') return false; return busy || pending > 0 || lastError || Boolean(record?.stage?.endsWith('-active') && record.status !== 'completed'); },
    checkpoint() { if (record?.stage?.endsWith('-active')) { capture(); void persist(); } },
    dispose() { capture(); if (record?.status !== 'completed') void persist(); disposed = true; stopTicker(); audio.dispose(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); window.removeEventListener('pageshow', onPageShow); },
  };
}
