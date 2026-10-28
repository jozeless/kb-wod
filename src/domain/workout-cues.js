/** One semantic event per update; hidden/late/paused updates consume, never queue. */
export function createCueTracker() {
  let previous = null;
  const blockStart = current => (current.kind === 'AMRAP_REPS' || current.phase?.audioCue === 'finisher') ? 'finisher' : 'work';
  return {
    next(current, audible = true) {
      const last = previous;
      previous = current;
      if (!last || !audible || last.status === 'paused' || current.status === 'paused') return null;
      const delta = current.elapsedMs - last.elapsedMs;
      if (delta < 0 || delta > 1500) return null;
      if (current.stage === 'complete') return last.stage !== 'complete' ? 'complete' : null;
      if (current.status !== 'running' || current.stage !== 'exercise') return null;
      if (last.stage === 'countdown') return current.elapsedMs < 1500 ? 'start' : blockStart(current);
      if (last.stage !== 'exercise' || current.segmentIndex === last.segmentIndex) return null;
      if (current.kind === 'TRANSITION') return null;
      if (current.kind === 'AMRAP_REPS') return 'finisher';
      if (current.kind === 'REST') return 'rest';
      if (current.kind === 'WORK') return 'work';
      if (current.phase.id !== last.phase.id) return blockStart(current);
      if (current.kind === 'SIDE_HOLD') return 'work';
      if (current.kind === 'EMOM') return 'minute';
      return null;
    },
  };
}
