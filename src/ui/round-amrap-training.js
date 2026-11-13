import { RoundAmrapTimer, createRoundAmrapCues } from '../domain/round-amrap-timer.js';
import { createClassicIronSession, classicIronFinalResults } from '../domain/classic-iron-results.js';
import { currentUserId } from '../cloud/identity.js';
import { completeSession } from '../storage/session-store.js';
import { createWorkoutAudio } from '../platform/workout-audio.js';
import { syncStatus } from './account.js';
import { roundAmrapPresentation } from './round-amrap-presentation.js';
import { el, button, heading } from './components.js';

/** Completed-only lifecycle: the round counter and rest deadline never leave memory. */
export function createRoundAmrapTraining(workout, {onExit, onHistory}) {
  const id = crypto.randomUUID();
  let record = {...createClassicIronSession(workout, null, id), ownerId: currentUserId()};
  const root = el('div', {className: 'active-workout'});
  const engine = new RoundAmrapTimer(workout);
  const cues = createRoundAmrapCues();
  const audio = createWorkoutAudio({profile: workout.audioProfile});
  let ticker = null, disposed = false, busy = false, finished = false, form;
  const stopTicker = () => { if (ticker !== null) clearInterval(ticker); ticker = null; };
  function showResults(s) {
    finished = true; stopTicker();
    record.completedAt = new Date().toISOString();
    record.activeDurationMs = s.elapsedMs;
    record.results = {completedRounds: s.completedRounds};
    const message = el('p', {className: 'result-message', role: 'status'});
    const saveButton = button('Save Workout', save);
    form = {message, saveButton};
    root.replaceChildren(heading('CLASSIC IRON', 'Workout Results', 'All 20 minutes are complete. Only complete seven-exercise rounds count.'),
      el('p', {}, `Completed rounds: ${s.completedRounds}`), saveButton, message, button('Return to Today', onExit, true));
  }
  async function save() {
    if (disposed || busy || record.status === 'completed') return;
    if (record.ownerId !== currentUserId()) { form.message.textContent = 'Account changed. Start a new workout before saving.'; return; }
    try { record.results = classicIronFinalResults(record); }
    catch (error) { form.message.textContent = error.message; return; }
    busy = true; form.saveButton.disabled = true; form.message.textContent = 'Saving workout…';
    try {
      const saved = await completeSession(record);
      if (disposed) return;
      record = saved;
      root.replaceChildren(heading('SAVED', 'Workout saved', 'Your completed rounds were saved locally.'), syncStatus(record),
        button('View saved session', () => onHistory(record.id)), button('Return to Today', onExit, true));
    } catch { if (!disposed) form.message.textContent = 'Workout could not be saved. Your rounds are still here. Retry Save Workout.'; }
    finally { busy = false; if (!disposed) form.saveButton.disabled = false; }
  }
  function update(audible = true) {
    if (disposed || finished) return;
    const s = engine.snapshot();
    const cue = cues.next(s, audible && !document.hidden);
    if (cue) audio.cue(cue);
    if (s.stage === 'complete') { showResults(s); return; }
    presentation.update(s);
  }
  function tick(audible = true) {
    update(audible);
    if (!disposed && !finished && engine.snapshot().status === 'running' && ticker === null) ticker = setInterval(update, 100);
  }
  const presentation = roundAmrapPresentation(workout, {
    completeRound() {
      // Consume any elapsed boundary before handling this fresh user action.
      update();
      if (!disposed && !finished && engine.completeRound()) update();
    },
    togglePause() {
      if (engine.snapshot().status === 'paused') { void audio.enable(); engine.resume(); tick(false); }
      else { engine.pause(); stopTicker(); audio.silence(); update(false); }
    },
    end: onExit,
  });
  root.append(presentation.root);
  // Unlock directly in the Start gesture; failure must never hold up the clock.
  void audio.enable(); engine.start(); tick(false);
  function visibility() { if (document.hidden) audio.silence(); update(false); }
  function pageHide() { stopTicker(); audio.silence(); }
  function pageShow() { if (!disposed && !finished) tick(false); }
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pageHide); window.addEventListener('pageshow', pageShow);
  return {id, root, exitMessage: 'End this workout? Your progress will not be saved.',
    get inProgress() { return !disposed && record.status !== 'completed'; },
    dispose() { disposed = true; engine.end(); stopTicker(); audio.dispose(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', pageShow); },
  };
}
