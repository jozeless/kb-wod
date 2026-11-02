// Append-only upgrades: clone the released snapshot and leave special phases exact.
export function upgradeToFortyTwenty(released, version) {
  const workout = structuredClone(released);
  workout.version = version;
  workout.audioProfile = 'clear-loud-v1';
  workout.weightPreferenceSource = {version: released.version, execution: structuredClone(released.execution), exerciseIds: released.exercises.filter(ex => ex.equipment !== 'bodyweight').map(ex => ex.id)};
  workout.phases = workout.phases.map(phase => {
    if (!['emom', 'intervals'].includes(phase.format)) return phase;
    return {...phase, format: 'intervals', timeBasedPrescription: true,
      timer: {workSeconds: 40, restSeconds: 20, intervals: phase.timer.intervals},
      instructions: `Follow the existing exercise order for ${phase.rounds} rounds: 40 seconds of controlled work, then 20 seconds of rest after every exercise, including the final interval. Work both sides safely within the work period where applicable. Repetition ranges are optional references, not a requirement to advance. The next phase starts automatically.`,
      objectives: [`Complete up to ${phase.timer.intervals} full 40/20 intervals with good technique. No repetitions are inferred from time.`, 'Record actual working weights and the existing final result fields only; repetition ranges are optional guidance.'],
    };
  });
  return workout;
}
