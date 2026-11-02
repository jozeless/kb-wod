import { fridayToBlack } from './friday-to-black.js';
import { upgradeToFortyTwenty } from './workout-40-20.js';
export const fridayToBlackV2 = upgradeToFortyTwenty(fridayToBlack, 2);
const reference = 'Fourth Floor Press working set: 06:00–06:40, followed by rest until 07:00 (full slot 06:00–07:00). Count actual repetitions for each arm separately, not totals across all four sets.';
fridayToBlackV2.exercises.find(ex => ex.id === 'alternating-floor-press').note = `Use ONE kettlebell. Alternate arms with controlled technique within the 40-second work period. ${reference}`;
fridayToBlackV2.exercises.find(ex => ex.id === 'sumo-deadlift').note = 'Move with controlled technique for 40 seconds, then rest for the full 20 seconds. Repetition ranges are optional guidance.';
fridayToBlackV2.phases[0].instructions += ` ${reference}`;
fridayToBlackV2.phases[0].objectives.push(reference);
fridayToBlackV2.resultFields.find(field => field.id === 'keyExercise').description = reference;
