import { mondayParanoidV2 } from './monday-paranoid-v2.js';
const base = structuredClone(mondayParanoidV2);
const transition = (id, name) => ({
  id, name, durationSeconds: 5, format: 'transition', timer: { durationSeconds: 5 }, exerciseIds: [],
  instructions: 'Rest and prepare. The next block begins automatically after five seconds.', objectives: [],
});
export const mondayParanoidV3 = {
  ...base, version: 3, durationSeconds: 1270,
  execution: { mode: 'continuous-results', schema: 'weights-finisher-v1' },
  weightPreferenceSource: { version: 2, exerciseIds: base.exercises.map(ex => ex.id) },
  purpose: 'Upper, ABS and Legs with two short transitions, then one minute of technically correct KB Thruster repetitions.',
  warmup: { included: false, note: 'Warm-up and the initial countdown are separate from the 21-minute 10-second workout.' },
  exercises: [...base.exercises, { id: 'thruster', name: 'KB Thruster', equipment: 'kettlebell', note: 'Count each technically correct, complete Thruster as one repetition.' }],
  phases: [
    { ...base.phases[0], instructions: 'Start each exercise on its minute and recover during the remaining seconds. Repeat the four exercises twice, then take the automatic five-second transition.' },
    transition('transition-to-abs', 'Transition to ABS'),
    { ...base.phases[1], instructions: 'Repeat the three timed exercises twice: 40 seconds work, 20 seconds rest, including the final interval. Then take the automatic five-second transition.' },
    transition('transition-to-legs', 'Transition to Legs'),
    { ...base.phases[2], instructions: 'Start each exercise on its minute and recover during the remaining seconds. Repeat the three exercises twice, then begin the Thruster finisher immediately.' },
    { id: 'finisher', name: 'Final Finisher', durationSeconds: 60, format: 'amrap-reps', timer: { durationSeconds: 60 }, exerciseIds: ['thruster'],
      instructions: 'Perform as many technically correct full KB Thruster repetitions as possible in 60 seconds. Count each complete Thruster as one repetition. No automatic exercise changes or extra rest.',
      objectives: ['Record the working weight and actual complete repetitions after the timer finishes.'] },
  ],
  resultFields: [
    { id: 'exerciseWeights', type: 'exercise-weight-map', exerciseIds: [...base.exercises.map(ex => ex.id), 'thruster'], unit: 'kg', required: false },
    { id: 'finisherReps', type: 'integer', min: 0, required: false },
    { id: 'perceivedEffort', type: 'integer', min: 1, max: 10, required: false },
    { id: 'notes', type: 'text', required: false },
  ],
};
