import { findWorkout } from '../data/catalog.js';
import { completedSessions } from './progress-analytics.js';
import { isRoundAmrap, roundAmrapFinalResults, recordedRoundTimes, fastestRound } from './round-amrap-results.js';

/** All-time records remain isolated by released workout identity and duration. */
export function fastestWorkoutRound(records, canRead, workoutId = 'classic-iron') {
  let best = null;
  for (const {record} of completedSessions(records, canRead)) {
    const workout = record.workoutSnapshot;
    const definition = findWorkout(workoutId, record.workoutVersion);
    if (!definition || !isRoundAmrap(workout) || workout.id !== workoutId || record.workoutId !== workoutId ||
        workout.version !== record.workoutVersion || workout.durationSeconds !== definition.durationSeconds) continue;
    let times;
    try { roundAmrapFinalResults(record); times = recordedRoundTimes(record.results, definition.durationSeconds * 1000); } catch { continue; }
    const candidate = times && fastestRound(times);
    if (candidate && (!best || candidate.durationMs < best.durationMs)) best = {...candidate, sessionId: record.id, startedAt: record.startedAt};
  }
  return best;
}
