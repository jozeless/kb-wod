import { trainingDate } from '../domain/progress-analytics.js';
import { isWeeklyGoal } from '../domain/weekly-consistency.js';

export const weeklyGoalKey = owner => `kb2.weekly-goal.v1:${owner === null ? 'guest' : `account:${encodeURIComponent(owner)}`}`;

function validate(history) {
  if (!Array.isArray(history)) throw new Error('Invalid weekly goal history.');
  let previous = '';
  for (const change of history) {
    const week = change?.effectiveWeek;
    const date = typeof week === 'string' && trainingDate(`${week}T12:00:00Z`);
    if (!date || date.getUTCDay() !== 1 || week <= previous || !isWeeklyGoal(change.goal)) {
      throw new Error('Invalid weekly goal history.');
    }
    previous = week;
  }
  return history;
}

export function loadWeeklyGoals(storage, owner) {
  const value = storage.getItem(weeklyGoalKey(owner));
  return value === null ? [] : validate(JSON.parse(value));
}

export function saveWeeklyGoals(storage, owner, history) {
  storage.setItem(weeklyGoalKey(owner), JSON.stringify(validate(history)));
}
