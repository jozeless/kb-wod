const movements = [
  ['swing', 'KB Swing', 'Upper', 10],
  ['clean-press', 'KB Clean & Press', 'Upper', 10, '5 per arm.', 'repetitions total'],
  ['single-arm-bent-over-row', 'Single-Arm KB Bent-Over Row', 'Upper', 10, '5 per arm.', 'repetitions total'],
  ['around-the-world', 'Around the World', 'Core', 10, '5 rotations each direction.', 'repetitions total'],
  ['dead-bug-pullover', 'Dead Bug + Pullover', 'Core', 10],
  ['squat-biceps-curl', 'KB Squat + Biceps Curl', 'Legs', 10],
  ['standing-calf-raise', 'KB Standing Calf Raise', 'Legs', 15, 'Use slow reps with a 1-second pause at the top.'],
];

export const ironArms = {
  id: 'iron-arms', version: 1, code: 'HM/KB Iron Arms', name: 'Iron Arms',
  type: 'hybrid', demo: false, archived: false, durationSeconds: 1200,
  category: 'Upper Body / Full Body · AMRAP', focus: 'Upper Body / Full Body',
  audioProfile: 'clear-loud-v1',
  purpose: 'Complete full seven-exercise circuits with an upper-body emphasis and moderate leg work.',
  warmup: {note: 'Warm up separately, outside the 20-minute workout.'},
  resultFields: [{id: 'completedRounds', type: 'integer', min: 0}],
  execution: {mode: 'round-amrap-results', schema: 'round-amrap-v1', restSeconds: 20},
  presentation: {showCode: true, durationFormat: 'clock', timing: 'AMRAP', weightPreferences: false},
  exercises: movements.map(([id, name, group, reps, note, unit = 'repetitions']) => ({
    id, name, group, equipment: 'kettlebell',
    target: {min: reps, max: reps, unit},
    ...(note ? {note} : {}),
  })),
  phases: [{
    id: 'circuit', name: 'Iron Arms', format: 'amrap', durationSeconds: 1200,
    timer: {durationSeconds: 1200}, exerciseIds: movements.map(([id]) => id),
    instructions: 'Complete all seven exercises in order. Press Ronda completa only after the whole circuit. A 20-second rest follows each completed round, within the 20-minute workout.',
    objectives: ['Count completed seven-exercise rounds only.'],
  }],
};
