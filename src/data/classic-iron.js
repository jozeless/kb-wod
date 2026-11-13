const movements = [
  ['swing', 'KB Swing'],
  ['thrusters', 'KB Thrusters'],
  ['single-arm-bent-over-row', 'Single-Arm KB Bent-Over Row', true],
  ['wood-choppers', 'KB Wood Choppers', true],
  ['hollow-ups', 'KB Hollow-Ups'],
  ['reverse-lunge-biceps-curl', 'KB Reverse Lunge + Biceps Curl', true],
  ['goblet-squat', 'KB Goblet Squat'],
];

export const classicIron = {
  id: 'classic-iron', version: 1, code: 'HM/KB Classic Iron', name: 'Classic Iron',
  type: 'hybrid', demo: false, archived: false, durationSeconds: 1200, category: 'Full Body · AMRAP',
  audioProfile: 'clear-loud-v1',
  purpose: 'Complete full seven-exercise circuits at your own pace.',
  warmup: {note: 'Warm up separately, outside the 20-minute workout.'},
  resultFields: [{id: 'completedRounds', type: 'integer', min: 0}],
  execution: {mode: 'round-amrap-results', schema: 'classic-iron-rounds-v1', restSeconds: 20},
  presentation: {showCode: true, durationFormat: 'clock', timing: 'AMRAP', weightPreferences: false},
  exercises: movements.map(([id, name, splitSides]) => ({
    id, name, equipment: 'kettlebell', target: {min: 10, max: 10, unit: splitSides ? 'repetitions total' : 'repetitions'},
    ...(splitSides ? {note: '10 repetitions total, distributed between sides.'} : {}),
  })),
  phases: [{
    id: 'circuit', name: 'Classic Iron', format: 'amrap', durationSeconds: 1200,
    timer: {durationSeconds: 1200}, exerciseIds: movements.map(([id]) => id),
    instructions: 'Complete all seven exercises in order, at your own pace. Press Ronda completa only after the whole circuit. A 20-second rest follows each completed round, within the 20-minute workout.',
    objectives: ['Count completed seven-exercise rounds only; unfinished rounds do not count.', 'Complete ten repetitions per exercise with controlled technique.'],
  }],
};
