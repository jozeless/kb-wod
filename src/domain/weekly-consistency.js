import { civilDate, civilKey, dateKey, monday, trainingDate } from './progress-analytics.js';

export const defaultWeeklyGoal = 4;
export const isWeeklyGoal = value => Number.isInteger(value) && value >= 1 && value <= 7;

function localMonday(date) {
  return monday(civilDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

function shiftCivilDay(date, delta) {
  return civilDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + delta);
}

function weekGoal(history, week) {
  return history.findLast(change => change.effectiveWeek <= week)?.goal ?? defaultWeeklyGoal;
}

export function changeWeeklyGoal(history, goal, currentWeek) {
  if (!isWeeklyGoal(goal)) throw new Error('Choose a weekly goal from 1 to 7 days.');
  const effectiveWeek = currentWeek.activeDays > 0 ? currentWeek.nextStart : currentWeek.start;
  // A new choice replaces this week's editable change or the change scheduled for next week.
  const updated = history.filter(change => change.effectiveWeek !== effectiveWeek && change.effectiveWeek !== currentWeek.nextStart);
  if (weekGoal(updated, effectiveWeek) !== goal) updated.push({effectiveWeek, goal});
  return updated.sort((a, b) => a.effectiveWeek.localeCompare(b.effectiveWeek));
}

export function analyzeWeeklyConsistency(sessions, history, now = new Date()) {
  const today = dateKey(now);
  const thisMonday = localMonday(now);
  const start = civilKey(thisMonday);
  const nextStart = civilKey(shiftCivilDay(thisMonday, 7));
  const weeks = new Map();
  for (const {record, date, day} of sessions) {
    const finished = trainingDate(record.completedAt);
    const rounds = record.results?.completedRounds;
    if (day > today || !finished || finished < date || !Number.isSafeInteger(rounds) || rounds < 0) continue;
    const week = civilKey(localMonday(date));
    if (!weeks.has(week)) weeks.set(week, {days: new Map(), workouts: 0, durationSessions: 0, totalDurationMs: 0});
    const activity = weeks.get(week);
    activity.days.set(day, (activity.days.get(day) ?? 0) + 1);
    activity.workouts++;
    const duration = record.activeDurationMs;
    if (Number.isFinite(duration) && duration > 0) {
      activity.durationSessions++;
      activity.totalDurationMs += duration;
    }
  }

  function weekSummary(key) {
    const activeDays = weeks.get(key)?.days.size ?? 0;
    const goal = weekGoal(history, key);
    return {start: key, activeDays, goal, successful: activeDays >= goal};
  }
  const recentWeeks = Array.from({length: 8}, (_, index) =>
    weekSummary(civilKey(shiftCivilDay(thisMonday, -7 * (index + 1)))));
  const current = weekSummary(start);
  const activity = weeks.get(start);
  const days = Array.from({length: 7}, (_, index) => {
    const day = shiftCivilDay(thisMonday, index);
    const key = civilKey(day);
    return {date: key, day: day.getUTCDate(), workouts: activity?.days.get(key) ?? 0};
  });

  let longestStreak = 0;
  let consecutive = 0;
  let lastSuccess = null;
  for (const key of [...weeks.keys()].sort()) {
    if (!weekSummary(key).successful) continue;
    const week = trainingDate(`${key}T12:00:00Z`);
    consecutive = lastSuccess && key === civilKey(shiftCivilDay(lastSuccess, 7)) ? consecutive + 1 : 1;
    longestStreak = Math.max(longestStreak, consecutive);
    lastSuccess = week;
  }
  const streakEnd = current.successful ? start : recentWeeks[0].start;
  const currentStreak = lastSuccess && civilKey(lastSuccess) === streakEnd ? consecutive : 0;
  return {
    currentWeek: {
      ...current, nextStart, days,
      completionPercent: Math.round(current.activeDays / current.goal * 100),
      workouts: activity?.workouts ?? 0,
      durationSessions: activity?.durationSessions ?? 0,
      totalDurationMs: activity?.durationSessions ? activity.totalDurationMs : null,
    },
    pendingGoal: history.find(change => change.effectiveWeek === nextStart) ?? null,
    recentWeeks, currentStreak, longestStreak,
  };
}
