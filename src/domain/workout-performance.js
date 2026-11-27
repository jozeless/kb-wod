import { findWorkout } from '../data/catalog.js';
import { completedSessions, dateKey, trainingDate } from './progress-analytics.js';
import { fastestRound, roundAmrapFinalResults } from './round-amrap-results.js';

const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export function workoutPerformanceSessions(records, canRead) {
  const sessions = [];
  for (const {record, date, day} of completedSessions(records, canRead)) {
    const {workoutId, workoutVersion, workoutSnapshot} = record;
    const {durationSeconds, execution} = workoutSnapshot;
    const definition = findWorkout(workoutId, workoutVersion);
    if (execution?.schema !== definition.execution?.schema) continue;
    if (durationSeconds !== definition.durationSeconds && !definition.historicalDurations?.includes(durationSeconds)) continue;
    const completedAt = trainingDate(record.completedAt);
    if (!completedAt || completedAt < date) continue;

    let result;
    try { result = roundAmrapFinalResults(record); } catch { continue; }
    const times = result.roundTimesMs ?? [];
    if (times.reduce((total, ms) => total + ms, 0) > record.activeDurationMs) continue;
    sessions.push({
      workoutId, durationSeconds, date, day, completedRounds: result.completedRounds,
      averageRoundTimeMs: times.length ? average(times) : null,
      fastestRoundMs: fastestRound(times)?.durationMs ?? null,
    });
  }
  return sessions;
}

export function summarizeWorkoutPerformance(sessions, {workoutId, durationSeconds, periodDays = null, now = new Date()}) {
  const today = dateKey(now);
  let earliest = null;
  if (periodDays !== null) {
    // Inclusive local calendar days, including today. Set noon before shifting across DST.
    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - (periodDays - 1));
    earliest = dateKey(start);
  }
  const points = sessions.filter(session => session.workoutId === workoutId &&
    session.durationSeconds === durationSeconds && session.day <= today &&
    (earliest === null || session.day >= earliest));
  const first = points[0] ?? null;
  const latest = points.at(-1) ?? null;
  let best = null;
  let fastestRoundMs = null;
  for (const point of points) {
    if (!best || point.completedRounds > best.completedRounds) best = point;
    const time = point.fastestRoundMs;
    if (time !== null && (fastestRoundMs === null || time < fastestRoundMs)) fastestRoundMs = time;
  }
  return {
    points, first, latest, best, fastestRoundMs,
    averageRounds: points.length ? average(points.map(point => point.completedRounds)) : null,
    improvementPercent: points.length > 1 && first.completedRounds > 0 ?
      (latest.completedRounds - first.completedRounds) / first.completedRounds * 100 : null,
  };
}
