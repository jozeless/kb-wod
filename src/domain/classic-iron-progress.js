// Compatibility API: Classic Iron records never include other WODs.
import { fastestWorkoutRound } from './round-amrap-progress.js';
export const fastestClassicIronRound = (records, canRead) => fastestWorkoutRound(records, canRead, 'classic-iron');
