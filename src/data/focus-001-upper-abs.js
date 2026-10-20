// Immutable version 1. Prescriptions and future result fields, never session data.
const upper = [
  { id: 'floor-press', name: 'KB Floor Press', target: { min: 5, max: 6, unit: 'reps per arm' } },
  { id: 'supported-row', name: 'Supported Single-Arm KB Row', target: { min: 6, max: 6, unit: 'reps per arm' } },
  { id: 'push-press', name: 'KB Push Press', target: { min: 5, max: 5, unit: 'reps per arm' } },
  { id: 'horn-curls', name: 'KB Horn Curls', target: { min: 6, max: 8, unit: 'reps' } },
  { id: 'atw-front-rise', name: 'ATW + Front Rise', target: { min: 4, max: 6, unit: 'controlled cycles' }, attribution: 'Inspired by @frameofdavid.' },
];
const abs = [
  { id: 'dead-bug-pullover', name: 'KB Dead Bug + Pullover' },
  { id: 'bear-row-kick-through', name: 'KB Bear Plank Row + Kick Through' },
  { id: 'v-up-pulse', name: 'KB V-Up + Pulse' },
  { id: 'hollow-flutters-press', name: 'Hollow Flutters + KB Chest Press' },
  { id: 'sit-ups', name: 'KB Sit-Ups' },
];
export const focus001 = {
  id: 'focus-001-upper-abs', version: 1, code: 'KB Focus 001', name: 'Upper Body + ABS',
  type: 'focus', category: 'Strength and core', durationSeconds: 1200,
  suggestedDay: 'Tuesday', demo: false, archived: false, image: null,
  purpose: 'Build strength and proportionate musculature while maintaining coordination and abdominal endurance.',
  warmup: { included: false, note: 'Warm-up is separate from the 20-minute workout.' },
  equipment: { name: 'Kettlebell', availableMinKg: 4, availableMaxKg: 24, requiredWeightKg: null },
  exercises: [...upper, ...abs].map(ex => ({ ...ex, equipment: 'kettlebell' })),
  phases: [
    { id: 'upper', name: 'Upper', durationSeconds: 600, format: 'emom', rounds: 2,
      timer: { intervalSeconds: 60, intervals: 10 }, exerciseIds: upper.map(ex => ex.id),
      instructions: 'Begin one exercise each minute, in the listed order. Rest for the remainder of that minute. Repeat the five exercises twice.',
      objectives: ['Complete up to 10 of 10 EMOM minutes.', 'Record the load in kg for each exercise and completed repetitions for the main movements.', 'Prioritize good technique and keep 1–3 repetitions in reserve.', 'Record modifications or any shoulder discomfort.'],
    },
    { id: 'abs', name: 'ABS', durationSeconds: 600, format: 'intervals', rounds: 2,
      timer: { workSeconds: 40, restSeconds: 20, intervals: 10 }, exerciseIds: abs.map(ex => ex.id),
      instructions: 'Work for 40 seconds, then rest for 20 seconds. Follow the listed order and repeat twice. Every exercise uses a kettlebell.',
      objectives: ['Complete up to 10 work intervals of 40 seconds.', 'Record intervals completed with correct technique.', 'Record the load used where applicable.', 'Record perceived exertion from 1 to 10.'],
    },
  ],
  // Future recording schema only: values are not collected or saved in this phase.
  resultFields: [
    { id: 'upperMinutesCompleted', phaseId: 'upper', type: 'integer', min: 0, max: 10 },
    { id: 'upperExerciseResults', phaseId: 'upper', type: 'exercise-round-records', exerciseIds: upper.map(ex => ex.id), rounds: 2,
      fields: [{ id: 'loadKg', type: 'number', unit: 'kg', required: false }, { id: 'completedReps', type: 'integer', min: 0, perArmExerciseIds: ['floor-press', 'supported-row', 'push-press'] }] },
    { id: 'modifications', phaseId: 'upper', type: 'text' },
    { id: 'shoulderDiscomfort', phaseId: 'upper', type: 'text' },
    { id: 'absIntervalsCompleted', phaseId: 'abs', type: 'integer', min: 0, max: 10, criterion: 'correct technique' },
    { id: 'absExerciseResults', phaseId: 'abs', type: 'exercise-round-records', exerciseIds: abs.map(ex => ex.id), rounds: 2,
      fields: [{ id: 'loadKg', type: 'number', unit: 'kg', required: false }, { id: 'correctTechnique', type: 'boolean' }] },
    { id: 'perceivedExertion', phaseId: 'abs', type: 'integer', min: 1, max: 10 },
  ],
};
