/** Compile data into a timeline. New formats can add a compiler without changing UI. */
export function compileWorkout(workout) {
  const segments = [];
  let cursor = 0;
  const add = (phase, interval, exercise, kind, seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid interval duration');
    segments.push({ startMs: cursor, endMs: cursor + seconds * 1000, phase, interval,
      round: interval === null ? null : Math.floor(interval / phase.exerciseIds.length) + 1, exercise, kind });
    cursor += seconds * 1000;
  };
  if (!workout.phases.length) throw new Error('Workout has no phases');
  for (const phase of workout.phases) {
    const start = cursor;
    if (phase.format === 'transition') {
      if (phase.exerciseIds.length || phase.timer.durationSeconds !== phase.durationSeconds) throw new Error('Invalid transition');
      add(phase, null, null, 'TRANSITION', phase.durationSeconds); continue;
    }
    if (!phase.exerciseIds.length) throw new Error('Phase has no exercises');
    const circuit = phase.exerciseIds.map(id => {
      const exercise = workout.exercises.find(ex => ex.id === id);
      if (!exercise) throw new Error('Unknown exercise');
      return exercise;
    });
    if (phase.format === 'amrap-reps') {
      if (circuit.length !== 1 || phase.timer.durationSeconds !== phase.durationSeconds) throw new Error('Invalid repetition finisher');
      add(phase, null, circuit[0], 'AMRAP_REPS', phase.durationSeconds); continue;
    }
    if (phase.format === 'amrap') {
      if (phase.timer.durationSeconds !== phase.durationSeconds) throw new Error('AMRAP duration mismatch');
      add(phase, null, null, 'AMRAP', phase.timer.durationSeconds);
      segments.at(-1).circuit = circuit;
      continue;
    }
    if (!Number.isInteger(phase.timer.intervals) || phase.timer.intervals < 1) throw new Error('Invalid phase');
    for (let i = 0; i < phase.timer.intervals; i++) {
      const exercise = workout.exercises.find(ex => ex.id === phase.exerciseIds[i % phase.exerciseIds.length]);
      if (!exercise) throw new Error('Unknown exercise');
      if (phase.format === 'emom') add(phase, i, exercise, 'EMOM', phase.timer.intervalSeconds);
      else if (phase.format === 'intervals') {
        add(phase, i, exercise, 'WORK', phase.timer.workSeconds);
        add(phase, i, exercise, 'REST', phase.timer.restSeconds);
      } else throw new Error(`Unsupported workout format: ${phase.format}`);
    }
    if (cursor - start !== phase.durationSeconds * 1000) throw new Error('Phase duration mismatch');
  }
  if (cursor !== workout.durationSeconds * 1000) throw new Error('Workout duration mismatch');
  return { segments, durationMs: cursor };
}

/** No intervals here: snapshots derive from an injected monotonic clock, not ticks. */
export class WorkoutTimer {
  constructor(workout, now = () => performance.now()) {
    this.timeline = compileWorkout(workout);
    this.now = now;
    this.status = 'idle';
    this.accumulatedMs = 0;
    this.anchor = 0;
    this.countdownMs = 3000;
  }
  start() {
    if (this.status !== 'idle') return;
    this.status = 'running'; this.anchor = this.now();
  }
  elapsed() {
    return this.accumulatedMs + (this.status === 'running' ? Math.max(0, this.now() - this.anchor) : 0);
  }
  pause() {
    this.snapshot();
    if (this.status !== 'running') return;
    this.accumulatedMs = this.elapsed(); this.status = 'paused';
  }
  resume() {
    if (this.status !== 'paused') return;
    this.anchor = this.now(); this.status = 'running';
  }
  restorePaused(rawElapsedMs) {
    if (!Number.isFinite(rawElapsedMs) || rawElapsedMs < 0 || rawElapsedMs > this.timeline.durationMs + this.countdownMs) throw new Error('Invalid timer checkpoint');
    this.accumulatedMs = rawElapsedMs; this.status = rawElapsedMs === this.timeline.durationMs + this.countdownMs ? 'complete' : 'paused';
  }
  end() { this.accumulatedMs = this.elapsed(); this.status = 'ended'; }
  snapshot() {
    const raw = this.elapsed();
    const { durationMs, segments } = this.timeline;
    const elapsedMs = Math.min(durationMs, Math.max(0, raw - this.countdownMs));
    if (raw >= durationMs + this.countdownMs && this.status === 'running') {
      this.accumulatedMs = durationMs + this.countdownMs; this.status = 'complete';
    }
    const base = { status: this.status, elapsedMs, durationMs, totalRemainingMs: durationMs - elapsedMs, progress: elapsedMs / durationMs };
    if (raw < this.countdownMs) return { ...base, stage: 'countdown', countdown: Math.ceil((this.countdownMs - raw) / 1000) };
    if (elapsedMs === durationMs) return { ...base, stage: 'complete' };
    const index = segments.findIndex(s => elapsedMs < s.endMs);
    const current = segments[index];
    const next = segments.slice(index + 1).find(s => s.kind !== 'REST');
    return { ...base, stage: 'exercise', ...current, segmentIndex: index,
      remainingMs: current.endMs - elapsedMs, nextExercise: next?.exercise ?? null, nextPhase: next?.phase ?? null,
      go: elapsedMs < 500 };
  }
}
export function formatTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
