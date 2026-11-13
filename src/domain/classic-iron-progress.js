import { completedSessions } from './progress-analytics.js';
import { isClassicIron, recordedRoundTimes, fastestRound } from './classic-iron-results.js';

/** Separate, all-time Classic Iron projection; existing Progress series stay intact. */
export function fastestClassicIronRound(records, canRead) {
  let best = null;
  for (const {record} of completedSessions(records, canRead)) {
    const workout = record.workoutSnapshot;
    if (!isClassicIron(workout) || workout.id !== 'classic-iron' || record.workoutId !== workout.id ||
        workout.version !== 1 || record.workoutVersion !== workout.version || workout.durationSeconds !== 1200 || record.activeDurationMs !== 1200000) continue;
    let times;
    try { times = recordedRoundTimes(record.results, 1200000); } catch { continue; }
    const candidate = times && fastestRound(times);
    if (candidate && (!best || candidate.durationMs < best.durationMs)) best = {...candidate, sessionId: record.id, startedAt: record.startedAt};
  }
  return best;
}
