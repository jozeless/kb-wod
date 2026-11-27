import test from 'node:test';
import assert from 'node:assert/strict';
import { classicIron } from '../src/data/classic-iron.js';
import { completedSessions } from '../src/domain/progress-analytics.js';
import { analyzeWeeklyConsistency, changeWeeklyGoal } from '../src/domain/weekly-consistency.js';
import { loadWeeklyGoals, saveWeeklyGoals, weeklyGoalKey } from '../src/storage/weekly-goal.js';

function local(day, hour = 12, minute = 0) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, hour, minute);
}
function saved(id, day, {hour, minute, duration = 1200000, ...extras} = {}) {
  const date = local(day, hour, minute);
  return {
    id, workoutId: classicIron.id, workoutVersion: 1, workoutSnapshot: classicIron,
    startedAt: date.toISOString(), completedAt: new Date(+date + 1200000).toISOString(),
    activeDurationMs: duration, results: {completedRounds: 1}, status: 'completed', ...extras,
  };
}
function analyze(records, today, history = []) {
  return analyzeWeeklyConsistency(completedSessions(records, record => !record.ownerId), history, local(today));
}

test('groups Monday through Sunday in local time, including duplicate days, missing duration and invalid sessions', () => {
  const monday = saved('first', '2027-01-04', {hour: 0, minute: 5, duration: 600000});
  const later = saved('second', '2027-01-04', {hour: 23, minute: 55, duration: 300000});
  const records = [
    monday, later, monday,
    saved('missing-time', '2027-01-05', {duration: null}),
    saved('sunday', '2027-01-03', {hour: 23, minute: 59}),
    saved('draft', '2027-01-06', {status: 'draft'}),
    saved('foreign', '2027-01-06', {ownerId: 'someone'}),
    saved('impossible', '2027-01-06', {startedAt: '2027-02-30T12:00:00Z'}),
    saved('bad-result', '2027-01-06', {results: {completedRounds: -1}}),
    saved('bad-completion', '2027-01-06', {completedAt: '2027-01-06'}),
    saved('future', '2027-01-07'),
  ];
  const history = [{effectiveWeek: '2027-01-04', goal: 1}];
  const {currentWeek, recentWeeks} = analyze(records, '2027-01-06', history);
  assert.equal(currentWeek.start, '2027-01-04');
  assert.equal(currentWeek.nextStart, '2027-01-11');
  assert.deepEqual(currentWeek.days.map(day => day.workouts), [2, 1, 0, 0, 0, 0, 0]);
  assert.equal(currentWeek.days.at(-1).date, '2027-01-10');
  assert.equal(currentWeek.activeDays, 2);
  assert.equal(currentWeek.workouts, 3);
  assert.equal(currentWeek.durationSessions, 2);
  assert.equal(currentWeek.totalDurationMs, 900000);
  assert.equal(currentWeek.completionPercent, 200);
  assert.equal(recentWeeks.length, 8);
  assert.deepEqual(recentWeeks[0], {start: '2026-12-28', activeDays: 1, goal: 4, successful: false});
  assert.equal(recentWeeks.at(-1).start, '2026-11-09');
});

test('completed misses break current streaks while unfinished weeks preserve them', () => {
  const dates = ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24',
    '2026-12-28', '2026-12-29', '2027-01-01', '2027-01-03', '2027-01-04'];
  const records = dates.map(day => saved(day, day));
  let summary = analyze(records, '2027-01-04');
  assert.equal(summary.currentStreak, 2);
  assert.equal(summary.longestStreak, 2);
  assert.equal(summary.currentWeek.successful, false);

  for (const day of ['2027-01-05', '2027-01-06', '2027-01-07']) records.push(saved(day, day));
  summary = analyze(records, '2027-01-07');
  assert.equal(summary.currentStreak, 3);
  assert.equal(summary.longestStreak, 3);
  assert.equal(summary.recentWeeks[0].start, '2026-12-28');
  assert.equal(summary.recentWeeks[0].successful, true);
  assert.equal(analyze(records, '2027-01-11').currentStreak, 3);

  summary = analyze(records, '2027-01-18');
  assert.equal(summary.currentStreak, 0);
  assert.equal(summary.longestStreak, 3);
  assert.deepEqual(summary.recentWeeks[0], {start: '2027-01-11', activeDays: 0, goal: 4, successful: false});
});

test('goal changes apply next Monday after activity and retain the goals of completed weeks', () => {
  const dates = ['2026-12-28', '2026-12-29', '2026-12-30', '2027-01-01', '2027-01-04', '2027-01-05'];
  const records = dates.map(day => saved(day, day));
  const before = structuredClone(records);
  const {currentWeek} = analyze(records, '2027-01-01');
  const scheduled = changeWeeklyGoal([], 2, currentWeek);
  assert.deepEqual(scheduled, [{effectiveWeek: '2027-01-04', goal: 2}]);
  assert.equal(analyze(records, '2027-01-01', scheduled).currentWeek.goal, 4);
  assert.equal(analyze(records, '2027-01-01', scheduled).pendingGoal.goal, 2);
  assert.deepEqual(changeWeeklyGoal(scheduled, 7, currentWeek), [{effectiveWeek: '2027-01-04', goal: 7}]);
  assert.deepEqual(changeWeeklyGoal(scheduled, 4, currentWeek), []);

  const next = analyze(records, '2027-01-05', scheduled);
  assert.equal(next.currentWeek.goal, 2);
  assert.equal(next.pendingGoal, null);
  assert.equal(next.recentWeeks[0].goal, 4);
  assert.equal(next.currentStreak, 2);
  assert.deepEqual(records, before);

  const empty = analyze([], '2027-01-01');
  const immediate = changeWeeklyGoal([], 1, empty.currentWeek);
  assert.deepEqual(immediate, [{effectiveWeek: '2026-12-28', goal: 1}]);
  assert.equal(analyze([], '2027-01-01', immediate).recentWeeks[0].goal, 4);
  assert.equal(empty.currentWeek.goal, 4);
  assert.equal(empty.currentWeek.workouts, 0);
  assert.equal(empty.currentWeek.totalDurationMs, null);
  assert.equal(empty.currentWeek.completionPercent, 0);
  assert.equal(empty.currentStreak, 0);
  assert.equal(empty.longestStreak, 0);
  assert.ok(empty.recentWeeks.every(week => !week.successful));
  for (const goal of [0, 8, 4.5, '3']) assert.throws(() => changeWeeklyGoal([], goal, empty.currentWeek));
});

test('goal history round-trips per device and account and rejects invalid updates without writing', () => {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  const history = [{effectiveWeek: '2026-12-28', goal: 2}, {effectiveWeek: '2027-01-04', goal: 7}];
  saveWeeklyGoals(storage, 'alice', history);
  saveWeeklyGoals(storage, null, [{effectiveWeek: '2026-12-28', goal: 1}]);
  assert.deepEqual(loadWeeklyGoals(storage, 'alice'), history);
  assert.equal(loadWeeklyGoals(storage, null)[0].goal, 1);
  assert.deepEqual(loadWeeklyGoals(storage, 'bob'), []);
  assert.notEqual(weeklyGoalKey('guest'), weeklyGoalKey(null));
  for (const invalid of [[...history].reverse(), [...history, history[1]], [{effectiveWeek: '2026-12-27', goal: 1}], [{effectiveWeek: '2027-02-30', goal: 2}]]) {
    assert.throws(() => saveWeeklyGoals(storage, 'alice', invalid));
  }
  assert.deepEqual(loadWeeklyGoals(storage, 'alice'), history);
  const key = weeklyGoalKey('broken');
  values.set(key, '{');
  assert.throws(() => loadWeeklyGoals(storage, 'broken'));
  assert.equal(values.get(key), '{');
});
