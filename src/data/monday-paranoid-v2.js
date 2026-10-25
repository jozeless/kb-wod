// Released v2: independent programming; Monday Paranoid v1 remains immutable.
const upper = [
  { id: 'push-press', name: 'KB Push Press', target: { min: 4, max: 6, unit: 'reps per side' } },
  { id: 'offset-push-up', name: 'KB Offset Push-Up', target: { min: 6, max: 8, unit: 'reps' } },
  { id: 'staggered-stance-row', name: 'KB Staggered-Stance Row', target: { min: 7, max: 8, unit: 'reps per side' } },
  { id: 'overhead-triceps-extension', name: 'KB Overhead Triceps Extension', target: { min: 7, max: 8, unit: 'reps' } },
];
const abs = [
  { id: 'dead-bug-chest-press', name: 'KB Dead Bug + Chest Press' },
  { id: 'standing-wood-chop', name: 'KB Standing Wood Chop' },
  { id: 'kick-through', name: 'KB Kick-Through' },
];
const legs = [
  { id: 'front-rack-squat', name: 'KB Front Rack Squat', target: { min: 6, max: 8, unit: 'reps' } },
  { id: 'swing', name: 'KB Swing', target: { min: 12, max: 15, unit: 'reps' } },
  { id: 'step-up', name: 'KB Step-Up', target: { min: 5, max: 5, unit: 'reps per side' } },
];
export const mondayParanoidV2 = {
  id: 'monday-paranoid', version: 2, code: 'KB Monday Paranoid', name: 'Monday Paranoid',
  type: 'hybrid', suggestedDay: 'Monday', category: 'Strength and core', durationSeconds: 1200,
  demo: false, archived: false, image: null,
  execution: { mode: 'continuous-results' },
  purpose: 'Upper strength, timed ABS and leg strength in one continuous 20-minute workout.',
  warmup: { included: false, note: 'Warm-up is separate from the 20-minute workout.' },
  equipment: { name: 'Kettlebell', availableMinKg: 4, availableMaxKg: 24, requiredWeightKg: null },
  presentation: { cardStyle: 'hm-kb', subtitle: 'Strength · Sweat · Chaos' },
  exercises: [...upper, ...abs, ...legs].map(exercise => ({ ...exercise, equipment: 'kettlebell' })),
  phases: [
    { id: 'upper', name: 'Upper', durationSeconds: 480, format: 'emom', rounds: 2,
      timer: { intervalSeconds: 60, intervals: 8 }, exerciseIds: upper.map(exercise => exercise.id),
      instructions: 'Start one exercise each minute, in order. Recover during the remaining seconds. Minutes 1–4 are Round 1; minutes 5–8 are Round 2. Continue automatically to ABS.',
      objectives: ['Complete eight EMOM minutes across two rounds.', 'Record actual weight and completed repetitions for each round after the full workout.'] },
    { id: 'abs', name: 'ABS', durationSeconds: 360, format: 'intervals', rounds: 2,
      timer: { workSeconds: 40, restSeconds: 20, intervals: 6 }, exerciseIds: abs.map(exercise => exercise.id),
      instructions: 'Follow the three timed exercises twice. Work for 40 seconds, then rest for 20 seconds, including the final interval. Continue automatically to Legs.',
      objectives: ['Complete six timed intervals across two rounds.', 'Record actual weight and 0–2 correctly completed intervals per exercise; no repetition targets.'] },
    { id: 'legs', name: 'Legs', durationSeconds: 360, format: 'emom', rounds: 2,
      timer: { intervalSeconds: 60, intervals: 6 }, exerciseIds: legs.map(exercise => exercise.id),
      instructions: 'Start one exercise each minute, in order. Recover during the remaining seconds. Minutes 1–3 are Round 1; minutes 4–6 are Round 2. Record all results after minute 20.',
      objectives: ['Complete six EMOM minutes across two rounds.', 'Record actual weight, both round counts, optional perceived effort and workout notes.'] },
  ],
  resultFields: [
    { id: 'upper', type: 'exercise-records', rounds: 2, fields: ['weightKg', 'round1', 'round2'] },
    { id: 'abs', type: 'exercise-records', fields: ['weightKg', 'intervalsCompleted'], min: 0, max: 2 },
    { id: 'legs', type: 'exercise-records', rounds: 2, fields: ['weightKg', 'round1', 'round2'] },
    { id: 'perceivedEffort', type: 'integer', min: 1, max: 10, required: false },
    { id: 'notes', type: 'text', required: false },
  ],
};
