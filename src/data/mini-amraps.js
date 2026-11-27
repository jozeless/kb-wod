// All released mini WODs use the same completed-only round AMRAP engine.
function miniAmrap(id, name, focus, durationSeconds, movements, {weightKg, referenceVideoUrl, historicalDurations} = {}) {
  const durationLabel = durationSeconds === 300 ? 'five-minute' : `${durationSeconds / 60}-minute`;
  const exercises = movements.map(([name, splitSides = false]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), name,
    equipment: 'kettlebell', target: {min: 10, max: 10, unit: 'repetitions total'},
    ...(splitSides ? {note: '10 repetitions total, 5 per side.'} : {}),
  }));
  return {
    id, version: 1, code: `HM/KB ${name}`, name, type: focus === 'Core' ? 'focus' : 'hybrid',
    demo: false, archived: false, durationSeconds, category: `${focus} · AMRAP`, focus,
    ...(historicalDurations ? {historicalDurations} : {}),
    ...(weightKg === undefined ? {} : {prescribedWeightKg: weightKg}),
    ...(referenceVideoUrl ? {referenceVideoUrl} : {}),
    audioProfile: 'clear-loud-v1', purpose: 'Complete full five-exercise circuits at your own pace.',
    warmup: {note: `Warm up separately, outside the ${durationLabel} workout.`},
    resultFields: [{id: 'completedRounds', type: 'integer', min: 0}],
    execution: {mode: 'round-amrap-results', schema: 'round-amrap-v1', restSeconds: 20},
    presentation: {showCode: true, durationFormat: 'clock', timing: 'AMRAP', weightPreferences: false},
    exercises,
    phases: [{id: 'circuit', name, format: 'amrap', durationSeconds,
      timer: {durationSeconds}, exerciseIds: exercises.map(ex => ex.id),
      instructions: `Complete all five exercises in order. Press Ronda completa only after the whole circuit. A 20-second rest follows each completed round, within the ${durationLabel} workout.`,
      objectives: ['Count completed five-exercise rounds only; unfinished rounds do not count.', 'Complete ten total repetitions per exercise, five per side when applicable.'],
    }],
  };
}
export const coreBlast = miniAmrap('core-blast', 'Core Blast', 'Core', 600, [
  ['North-South Plank'], ['Plank Pull-Through', true], ['Single-Arm Sit-Up', true], ['Twist-Ups', true], ['Hollow-Ups'],
], {historicalDurations: [300]});
export const ironTwist = miniAmrap('iron-twist', 'Iron Twist', 'Full Body', 300, [
  ['Rotational Thruster', true], ['Deadlift + Halo'], ['Lunge to Press-Out', true], ['Pullover to Rotation', true], ['Cross-Body Lunges', true],
], {weightKg: 8, referenceVideoUrl: 'https://youtube.com/shorts/BlKoQLB955k?si=8kQGAIttJyFuu8Q0'});
export const saturdayMorningBeef = miniAmrap('saturday-morning-beef', 'Saturday Morning Beef', 'Power & Conditioning', 600, [
  ['Snatch', true], ['Squat Halo'], ['Ballistic Row', true], ['Lunge Knee Drive', true], ['Alternating Swing', true],
], {
  weightKg: 8,
  referenceVideoUrl: 'https://youtube.com/shorts/w-ZRqmfBmrQ?si=I-FJN83Plpq2Azr0',
  historicalDurations: [300],
});
