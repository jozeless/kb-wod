// Stable compatibility API for Classic Iron callers and legacy saved records.
export {isClassicIron, recordedRoundTimes, fastestRound, formatRoundTime,
  roundAmrapSchema as classicIronSchema, createRoundAmrapSession as createClassicIronSession,
  roundAmrapFinalResults as classicIronFinalResults} from './round-amrap-results.js';
import { parseRoundAmrapPartialReps } from './round-amrap-results.js';
import { classicIron } from '../data/classic-iron.js';
export const parseClassicIronPartialReps = raw => parseRoundAmrapPartialReps(raw, classicIron);
