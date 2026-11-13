import { WorkoutTimer } from './workout-timer.js';

/** Rest deadlines use the same active elapsed time as the existing monotonic timer. */
export class RoundAmrapTimer {
  constructor(workout, now) {
    this.timer = new WorkoutTimer(workout, now);
    this.restMs = workout.execution.restSeconds * 1000;
    this.completedRounds = 0;
    this.restUntilMs = 0;
  }
  start() { this.timer.start(); }
  pause() { this.timer.pause(); }
  resume() { this.timer.resume(); }
  end() { this.timer.end(); }
  completeRound() {
    const s = this.snapshot();
    if (s.status !== 'running' || s.stage !== 'exercise' || s.restRemainingMs > 0) return false;
    this.completedRounds++;
    this.restUntilMs = s.elapsedMs + this.restMs;
    return true;
  }
  snapshot() {
    const s = this.timer.snapshot();
    const restRemainingMs = s.stage === 'exercise' ? Math.max(0, this.restUntilMs - s.elapsedMs) : 0;
    return {...s, completedRounds: this.completedRounds, restUntilMs: this.restUntilMs, restRemainingMs,
      state: s.status === 'paused' ? 'PAUSED' : s.stage === 'countdown' ? 'GET READY' : s.stage === 'complete' ? 'COMPLETE' : restRemainingMs > 0 ? 'REST' : 'TRAINING'};
  }
}

/** Consume hidden, late and paused boundaries without replaying them later. */
export function createRoundAmrapCues() {
  let previous;
  return {
    next(current, audible = true) {
      const last = previous; previous = current;
      if (!last || !audible || last.status === 'paused' || current.status === 'paused') return null;
      const delta = current.elapsedMs - last.elapsedMs;
      if (delta < 0 || delta > 1500) return null;
      if (current.stage === 'complete') return last.stage !== 'complete' ? 'complete' : null;
      if (current.stage !== 'exercise' || current.status !== 'running') return null;
      if (last.stage === 'countdown') return current.elapsedMs < 1500 ? 'start' : null;
      if (current.completedRounds > last.completedRounds && current.restRemainingMs > 0) return 'rest';
      if (last.restRemainingMs > 0 && current.restRemainingMs === 0 && current.elapsedMs - last.restUntilMs <= 1500) return 'work';
      return null;
    },
  };
}
