import { focus001 } from './focus-001-upper-abs.js';
// New immutable version: v1 stays available for previously assigned workouts.
const base = structuredClone(focus001);
export const focus002 = {
  ...base, version: 2,
  execution: { mode: 'two-block-results' },
  phases: base.phases.map(phase => ({
    ...phase, format: 'intervals', timer: { workSeconds: 40, restSeconds: 20, intervals: 10 },
    instructions: `Work for 40 seconds, rest for 20 seconds, then move to the next exercise. Repeat the five exercises twice. ${phase.id === 'upper' ? 'Stop for Upper Results before choosing Continue to ABS.' : 'Finish with ABS Results and explicitly save your workout.'}`,
    objectives: phase.id === 'upper' ? ['Complete up to 10 intervals with good technique.', 'Record actual weight and repetitions in each round.', 'Prioritize good technique and keep 1–3 repetitions in reserve.', 'Record unilateral differences, modifications or shoulder discomfort in the notes.'] : phase.objectives,
  })),
  resultFields: [
    { id: 'upper', type: 'exercise-records', fields: ['weightKg', 'round1', 'round2'], repetitionsPerArm: ['floor-press', 'supported-row', 'push-press'] },
    { id: 'abs', type: 'exercise-records', fields: ['weightKg', 'intervalsCompleted'], intervalsMin: 0, intervalsMax: 2 },
    { id: 'perceivedEffort', type: 'integer', min: 1, max: 10, required: false },
    { id: 'notes', type: 'text', required: false },
  ],
};
