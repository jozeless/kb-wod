// All released mini WODs use the same completed-only round AMRAP engine.
function miniAmrap(id, name, focus, movements, weightKg = null) {
  const exercises = movements.map(([name, splitSides = false]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), name,
    equipment: 'kettlebell', target: {min: 10, max: 10, unit: 'repetitions total'},
    ...(splitSides ? {note: '10 repetitions total, 5 per side.'} : {}),
  }));
  return {
    id, version: 1, code: `HM/KB ${name}`, name, type: focus === 'Core' ? 'focus' : 'hybrid',
    demo: false, archived: false, durationSeconds: 300, category: `${focus} · AMRAP`, focus,
    ...(weightKg === null ? {} : {prescribedWeightKg: weightKg}),
    audioProfile: 'clear-loud-v1', purpose: 'Complete full five-exercise circuits at your own pace.',
    warmup: {note: 'Warm up separately, outside the five-minute workout.'},
    resultFields: [{id: 'completedRounds', type: 'integer', min: 0}],
    execution: {mode: 'round-amrap-results', schema: 'round-amrap-v1', restSeconds: 20},
    presentation: {showCode: true, durationFormat: 'clock', timing: 'AMRAP', weightPreferences: false},
    exercises,
    phases: [{id: 'circuit', name, format: 'amrap', durationSeconds: 300,
      timer: {durationSeconds: 300}, exerciseIds: exercises.map(ex => ex.id),
      instructions: 'Complete all five exercises in order. Press Ronda completa only after the whole circuit. A 20-second rest follows each completed round, within the five-minute workout.',
      objectives: ['Count completed five-exercise rounds only; unfinished rounds do not count.', 'Complete ten total repetitions per exercise, five per side when applicable.'],
    }],
  };
}
export const coreBlast = miniAmrap('core-blast', 'Core Blast', 'Core', [
  ['North-South Plank'], ['Plank Pull-Through', true], ['Single-Arm Sit-Up', true], ['Twist-Ups', true], ['Hollow-Ups'],
]);
export const ironTwist = miniAmrap('iron-twist', 'Iron Twist', 'Full Body', [
  ['Rotational Thruster', true], ['Deadlift + Halo'], ['Lunge to Press-Out', true], ['Pullover to Rotation', true], ['Cross-Body Lunges', true],
], 8);
export const saturdayMorningBeef = miniAmrap('saturday-morning-beef', 'Saturday Morning Beef', 'Power & Conditioning', [
  ['Snatch', true], ['Squat Halo'], ['Ballistic Row', true], ['Lunge Knee Drive', true], ['Alternating Swing', true],
], 8);
