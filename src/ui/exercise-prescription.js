export function prescription(exercise, phase) {
  if (exercise.target) {
    const { min, max, unit } = exercise.target;
    return `${min === max ? min : `${min}–${max}`} ${unit}`;
  }
  return phase.format === 'intervals' ? `${phase.timer.workSeconds} seconds work / ${phase.timer.restSeconds} seconds rest` : 'Follow the prescribed movement.';
}
export function phaseSummary(phase) {
  if (phase.format === 'amrap') return `AMRAP · ${phase.durationSeconds / 60} minutes · Repeat circuit at your own pace`;
  const format = phase.format === 'emom' ? 'EMOM' : `${phase.timer.workSeconds}s work / ${phase.timer.restSeconds}s rest`;
  return `${format} · ${phase.rounds} rounds · ${phase.timer.intervals} ${phase.format === 'emom' ? 'minutes' : 'intervals'}`;
}
