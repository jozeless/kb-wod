// Shared programming for the approved Oldschool releases: no extra transitions or finisher time.
export function oldschoolWorkout({id, code, name, category, exercises, blocks}) {
  const names = ['Upper', 'ABS', 'Legs', 'Muscle Finisher'];
  return {
    id, version: 1, code, name, category, type: 'hybrid', demo: false, archived: false, image: null,
    purpose: 'Four consecutive blocks of controlled full-body strength work, with one pass per block and no prescribed repetition counts.',
    durationSeconds: 1200, audioProfile: 'clear-loud-v1',
    execution: {mode: 'continuous-results', schema: 'oldschool-weights-v1'},
    presentation: {subtitle: category, timing: '45/15', showCode: true, durationFormat: 'clock', sharedWeightPreferences: true},
    warmup: {included: false, note: 'Warm-up, cooldown and the initial 3-second countdown are outside the 20:00 workout.'},
    equipment: {name: 'Kettlebell', availableMinKg: 4, availableMaxKg: 24, requiredWeightKg: null},
    exercises,
    phases: blocks.map((exerciseIds, i) => ({
      id: ['upper', 'abs', 'legs', 'muscle-finisher'][i], name: names[i], durationSeconds: 300,
      format: 'intervals', rounds: 1, timeBasedPrescription: true,
      timer: {workSeconds: 45, restSeconds: 15, intervals: 5}, exerciseIds,
      instructions: 'Follow the five movements once in order: 45 seconds of controlled work, then 15 seconds of rest, including the final rest. Distribute work between both sides where applicable, switching manually within the work period. The next block begins automatically.',
      objectives: ['Five complete 45/15 slots with controlled technique. No repetitions are prescribed or inferred from time.'],
    })),
    resultFields: [{id: 'exerciseWeights', type: 'exercise-weight-map', label: 'Exercise weights (kg)', required: false, unit: 'kg',
      exerciseIds: exercises.filter(ex => ex.equipment === 'kettlebell').map(ex => ex.id)}],
  };
}
