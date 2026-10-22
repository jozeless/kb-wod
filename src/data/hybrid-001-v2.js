import { hybrid001 } from './hybrid-001-strength-sweat.js';
// Timings, movements and targets are copied unchanged into a new immutable version.
export const hybrid002 = {
  ...structuredClone(hybrid001), version: 2,
  execution: { mode: 'block-results', schema: 'hybrid-001-v2' },
  resultFields: [
    { id: 'strength', type: 'exercise-records', rounds: 4, fields: ['weightKg', 'round1', 'round2', 'round3', 'round4'] },
    { id: 'conditioning', type: 'exercise-records', fields: ['weightKg', 'intervalsCompleted'], min: 0, max: 2 },
    { id: 'combo-finisher', type: 'amrap-result', fields: ['fullRounds', 'weightKg', 'partialReps'], partialLimits: 'exercise target' },
    { id: 'perceivedEffort', type: 'integer', min: 1, max: 10, required: false },
    { id: 'notes', type: 'text', required: false },
  ],
};
