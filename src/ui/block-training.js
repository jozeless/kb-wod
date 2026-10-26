import { usesSessionWeights } from '../domain/weights-finisher-results.js';
import { canReadLocal } from '../cloud/identity.js';
import { syncStatus } from './account.js';
import { WorkoutTimer, formatTime } from '../domain/workout-timer.js';
import { createCueTracker } from '../domain/workout-cues.js';
import { createDraft, blockResults, finalResults, blockOffset, resultSchema } from '../domain/result-schemas.js';
import { getSession, putDraft, completeSession } from '../storage/session-store.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { createWeightField } from './weight-field.js';
import { resultForm } from './block-result-form.js';
import { prescription } from './exercise-prescription.js';
import { el, button, heading } from './components.js';

export function createBlockTraining(workout, { draftId, recover = false, onExit, onHistory }) {
  const id = draftId || crypto.randomUUID();
  const root = el('div', { className: 'active-workout' }, heading(workout.code, 'Preparing session', 'Opening local session storage…'));
  const audio = createWorkoutAudio();
  const continuous = workout.execution?.mode === 'continuous-results';
  const timeOffset = () => continuous ? 0 : blockOffset(workout, record.blockIndex);
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
    record.activeDurationMs = timeOffset() + s.elapsedMs;
  }
  function stopTicker() { if (ticker !== null) clearInterval(ticker); ticker = null; }
  function stopAudio() { audio.silence(); }
  function soundButton() {
    const control = button(record.soundEnabled ? 'Sound: On' : 'Sound: Off', async () => {
      await audio.setEnabled(!record.soundEnabled); record.soundEnabled = audio.enabled;
      control.textContent = audio.enabled ? 'Sound: On' : 'Sound: Off'; control.setAttribute('aria-pressed', String(audio.enabled)); void persist();
    }, true);
    control.setAttribute('aria-pressed', String(record.soundEnabled)); return control;
  }
  function showSaved() {
    stopTicker(); if(engine?.status!=='complete')stopAudio(); formView = null;
    root.replaceChildren(heading('SAVED', 'Workout saved', 'Your results were committed to local session storage.'),
      syncStatus(record), button('View saved session', () => onHistory(record.id)), button('Return to Today', onExit, true));
  }
  function showForm() {
    stopTicker(); training = null;
    const blockId = workout.phases[record.blockIndex].id;
    formView = resultForm(record, blockId, { changed: () => { message(''); void persist(); }, continueBlock, save });
    root.replaceChildren(formView.root, draftMessage, button('Return to Today', onExit, true));
    if (lastError) message('Draft could not be saved. Keep this screen open and retry before continuing.');
  }
  async function continueBlock() {
    if (busy) return;
    try { blockResults(workout, record.form, workout.phases[record.blockIndex].id); }
    catch (error) { message(error.message); return; }
    busy = true; formView.setBusy(true);
    // Re-unlock after recovery, within this explicit user gesture. Do not replay start.
    if (record.soundEnabled) void audio.enable();
    if (await persist()) {
      if (disposed) return;
      const previous = { blockIndex: record.blockIndex, stage: record.stage, checkpointMs: record.checkpointMs };
      record.blockIndex++; record.stage = `${workout.phases[record.blockIndex].id}-active`; record.checkpointMs = 0;
      if (await persist()) { if (!disposed) beginBlock(false); }
      else Object.assign(record, previous);
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
    showForm(); void persist();
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
      if (!record.hasStarted) { record.hasStarted = true; audio.cue('start'); void persist(); }
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
    text(training.position, s.kind === 'TRANSITION' ? 'Automatic transition · Rest and prepare' : s.kind === 'AMRAP_REPS' ? 'AMRAP repetitions · Count complete reps' : amrap ? 'AMRAP · Repeat at your own pace' : s.exercise ? `Round ${s.round} of ${phase.rounds} · Interval ${s.interval + 1} of ${phase.timer.intervals}` : '');
    const resultTitle = usesSessionWeights(workout) ? 'Workout Results' : resultSchema(workout).blocks[phase.id].title;
    text(training.next, amrap ? `Next: ${continuous && s.nextPhase ? s.nextPhase.name : resultTitle}` : s.exercise ? (s.nextExercise ? `Next: ${s.nextExercise.name}` : `Next: ${continuous && s.nextPhase ? s.nextPhase.name : resultTitle}`) : '');
    training.weight.root.hidden = !s.exercise || s.exercise.equipment === 'bodyweight'; if (s.exercise && s.exercise.equipment !== 'bodyweight') training.weight.setExercise(s.exercise);
    training.progress.value = (offset + s.elapsedMs) / (workout.durationSeconds * 1000);
    training.pause.textContent = s.status === 'paused' ? 'Resume' : 'Pause';
    const checkpoint = Math.floor(engine.elapsed() / 1000);
    if (checkpoint !== lastCheckpoint) { lastCheckpoint = checkpoint; capture(); void persist(); }
  }
  function sessionWeightField(initialExercise) {
    if(!usesSessionWeights(workout))return createWeightField(workout,initialExercise);
    return createWeightField(workout,initialExercise,{
      read:exercise=>record.form.weights[exercise.id],
      changed:(exercise,raw)=>{record.form.weights[exercise.id]=raw;delete record.form.invalid[`weights.${exercise.id}`];void persist();},
    });
  }
  function beginBlock(restored) {
    if (disposed) return;
    formView = null; lastCheckpoint = -1;
    const phase = workout.phases[record.blockIndex];
    engine = new WorkoutTimer(continuous ? workout : { ...workout, durationSeconds: phase.durationSeconds, phases: [phase] });
    if (restored) engine.restorePaused(record.checkpointMs); else engine.start();
    cues = createCueTracker(); cues.next({ ...engine.snapshot(), elapsedMs: timeOffset() + engine.snapshot().elapsedMs }, false);
    const weight = sessionWeightField(); weight.root.hidden = true;
    const phaseLabel = el('p', { className: 'eyebrow', 'aria-live': 'polite' }), exercise = el('h2', { className: 'active-exercise' }), target = el('p', {});
    const clock = el('div', { className: 'phase-clock', role: 'timer' }), block = el('p', { className: 'block-time' }), total = el('p', {}), position = el('p', {}), next = el('p', {});
    const pause = button(engine.status === 'paused' ? 'Resume' : 'Pause', () => {
      if (engine.status === 'paused') { if (record.soundEnabled) void audio.enable(); engine.resume(); tick(); }
      else { engine.pause(); stopTicker(); stopAudio(); update(false); }
      capture(); void persist();
    });
    const circuit = el('ol', { className: 'prescriptions active-circuit', 'aria-label': 'AMRAP circuit', hidden: '' });
    const progress = el('progress', { max: '1', value: '0', 'aria-label': 'Workout progress' });
    const panel = el('section', { className: 'active-panel', 'aria-label': 'Active workout' }, phaseLabel, exercise, target, weight.root, clock, block, total, position, circuit, next, progress);
    training = { panel, phase: phaseLabel, exercise, target, clock, block, total, position, next, weight, pause, progress, circuit, circuitPhase: null };
    root.replaceChildren(heading(`${workout.code} · VERSION ${workout.version}`, workout.name, continuous ? usesSessionWeights(workout) ? 'Recorded weights stay with this session. Results follow the finisher.' : 'Record actual results after all 20 active minutes.' : 'Record actual results between the blocks.'), panel,
      el('div', { className: 'active-controls' }, pause, button('End Workout', () => { if (confirm('Leave this workout? A recoverable draft will remain.')) onExit(); }, true), soundButton()), draftMessage);
    if (restored && engine.status === 'complete') finishBlock(false);
    else { update(false); if (engine.status === 'running') tick(); }
  }
  function tick(audible = true) { if (disposed) return; update(audible); if (ticker === null && record.stage.endsWith('-active') && engine.status === 'running') ticker = setInterval(update, 100); }
  async function initialize() {
    try {
      if (recover) {
        record = await getSession(id);
        if (!canReadLocal(record) || record.schemaVersion !== 1 || record.workoutId !== workout.id || record.workoutVersion !== workout.version || !record.form?.invalid || !workout.phases.some(p => record.stage === `${p.id}-active` || record.stage === `${p.id}-results`) || !Number.isInteger(record.blockIndex) || !workout.phases[record.blockIndex] || record.workoutSnapshot?.id !== workout.id || record.workoutSnapshot.version !== workout.version) throw new Error('Draft unavailable');
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
