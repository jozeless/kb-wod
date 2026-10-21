/** One cue per update. Muted/hidden updates still consume events, never queue them. */
export function createCueTracker() {
  let previous = null;
  return {
    next(current, audible = true) {
      const last = previous;
      previous = current;
      if (!last || !audible || last.status === 'paused' || current.status === 'paused') return null;
      if (current.stage === 'complete') return last.stage !== 'complete' ? 'complete' : null;
      if (current.status !== 'running' || current.stage !== 'exercise') return null;
      const delta = current.elapsedMs - last.elapsedMs;
      // Ignore stale boundaries after throttling/suspension, rather than replaying them.
      if (delta < 0 || delta > 1500) return null;
      if (last.stage === 'countdown') return current.elapsedMs < 1500 ? 'start' : null;
      if (last.stage !== 'exercise') return null;
      const minute = Math.floor(current.elapsedMs / 60000);
      if (minute > Math.floor(last.elapsedMs / 60000)) return 'minute';
      if (current.segmentIndex !== last.segmentIndex) return current.phase.id !== last.phase.id ? 'block' : 'change';
      const seconds = Math.ceil(current.remainingMs / 1000);
      if (seconds >= 1 && seconds <= 3 && seconds !== Math.ceil(last.remainingMs / 1000)) return 'tick';
      return null;
    },
  };
}
