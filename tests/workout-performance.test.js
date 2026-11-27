import test from 'node:test';
import assert from 'node:assert/strict';
import { findWorkout, libraryWorkouts } from '../src/data/catalog.js';
import { dateKey } from '../src/domain/progress-analytics.js';
import { createRoundAmrapSession } from '../src/domain/round-amrap-results.js';
import { summarizeWorkoutPerformance, workoutPerformanceSessions } from '../src/domain/workout-performance.js';

const now = new Date(2026, 10, 27, 12);
function daysAgo(days) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function saved(id, workoutId, days, completedRounds, roundTimesMs, durationSeconds) {
  const definition = findWorkout(workoutId, 1);
  const duration = durationSeconds ?? definition.durationSeconds;
  const startedAt = daysAgo(days);
  return {
    ...createRoundAmrapSession({...definition, durationSeconds: duration}, null, id, startedAt),
    completedAt: new Date(Date.parse(startedAt) + duration * 1000).toISOString(),
    activeDurationMs: duration * 1000,
    status: 'completed',
    results: {completedRounds, ...(roundTimesMs === undefined ? {} : {roundTimesMs})},
  };
}

function summarize(records, filters = {}) {
  return summarizeWorkoutPerformance(workoutPerformanceSessions(records, record => !record.ownerId), {
    workoutId: 'core-blast', durationSeconds: 600, periodDays: null, now, ...filters,
  });
}

test('selects the workout and duration, then derives chronologically comparable metrics', () => {
  const early = saved('early', 'core-blast', 100, 2, [50000, 70000]);
  const top = saved('best', 'core-blast', 60, 6, [30000, 60000, 60000, 60000, 60000, 60000]);
  const recent = saved('recent', 'core-blast', 2, 4, [50000, 55000, 65000, 70000]);
  const oldDuration = saved('legacy', 'core-blast', 3, 9, undefined, 300);
  const otherWorkout = saved('iron', 'iron-arms', 3, 10);
  const records = [recent, oldDuration, top, early, otherWorkout];
  const original = structuredClone(records);
  const summary = summarize(records);

  assert.deepEqual(summary.points.map(point => point.completedRounds), [2, 6, 4]);
  assert.deepEqual(summary.points.map(point => point.averageRoundTimeMs), [60000, 55000, 60000]);
  assert.deepEqual([summary.first, summary.latest, summary.best].map(point => point.completedRounds), [2, 4, 6]);
  assert.equal(summary.averageRounds, 4);
  assert.equal(summary.fastestRoundMs, 30000);
  assert.equal(summary.improvementPercent, 100);
  assert.deepEqual(summarize(records, {durationSeconds: 300}).points.map(point => point.completedRounds), [9]);
  assert.deepEqual(summarize(records, {workoutId: 'iron-arms', durationSeconds: 1200}).points.map(point => point.completedRounds), [10]);
  assert.deepEqual(records, original);
});

test('30- and 90-day filters include their first local calendar day and exclude older and future dates', () => {
  const records = [-1, 0, 29, 30, 89, 90].map((days, index) => saved(String(index), 'core-blast', days, index));
  const points = periodDays => summarize(records, {periodDays}).points;
  assert.deepEqual(points(30).map(point => point.completedRounds), [2, 1]);
  assert.deepEqual(points(90).map(point => point.completedRounds), [4, 3, 2, 1]);
  assert.deepEqual(points(null).map(point => point.completedRounds), [5, 4, 3, 2, 1]);
  assert.equal(points(30)[0].day, dateKey(new Date(daysAgo(29))));
});

test('handles empty periods, one session, zero baselines, and missing round times without inventing data', () => {
  const early = saved('zero', 'core-blast', 4, 0, []);
  const recent = saved('untimed', 'core-blast', 3, 3);
  const timed = saved('timed', 'core-blast', 5, 3, [20000, 60000, 70000]);
  for (const records of [[early], [early, recent], []]) {
    const summary = summarize(records);
    assert.equal(summary.improvementPercent, null);
    assert.equal(summary.fastestRoundMs, null);
    assert.equal(summary.latest?.averageRoundTimeMs ?? null, null);
  }
  const empty = summarize([saved('outside', 'core-blast', 31, 2)], {periodDays: 30});
  assert.equal(empty.points.length, 0);
  assert.equal(empty.averageRounds, null);
  assert.equal(empty.latest, null);
  assert.equal(summarize([timed, recent]).improvementPercent, 0);
  assert.equal(summarize([timed, recent]).fastestRoundMs, 20000);
  assert.equal(summarize([timed, recent]).latest.averageRoundTimeMs, null);
  assert.equal(summarize([timed, {...early, startedAt: daysAgo(0), completedAt: daysAgo(0)}]).improvementPercent, -100);
});

test('supports the five released schemas and excludes drafts, invalid data, incompatible snapshots, and foreign owners', () => {
  const valid = libraryWorkouts.map(workout => saved(workout.id, workout.id, 3, 3));
  const [classic] = valid;
  const invalid = [
    {...classic, id: 'draft', status: 'draft'},
    {...classic, id: 'other-owner', ownerId: 'another-user'},
    {...classic, id: 'bad-start', startedAt: '2026-11-24'},
    {...classic, id: 'bad-finish', completedAt: '2026-02-30T12:00:00Z'},
    {...classic, id: 'not-finished', activeDurationMs: 1199999},
    {...classic, id: 'bad-count', results: {completedRounds: -1}},
    {...classic, id: 'bad-reps', results: {completedRounds: 3, partialReps: 70}},
    {...classic, id: 'bad-times', results: {completedRounds: 3, roundTimesMs: [1000, 1000, null]}},
    {...classic, id: 'wrong-length', results: {completedRounds: 3, roundTimesMs: [1000]}},
    {...classic, id: 'impossible-times', results: {completedRounds: 3, roundTimesMs: [500000, 500000, 500000]}},
    {...classic, id: 'schema', workoutSnapshot: {...classic.workoutSnapshot, execution: {schema: 'round-amrap-v1'}}},
    saved('unsupported-duration', 'iron-twist', 3, 1, undefined, 600),
  ];
  const actual = workoutPerformanceSessions([...invalid, ...valid, classic], record => !record.ownerId);
  assert.deepEqual(actual.map(session => session.workoutId), valid.map(record => record.workoutId).sort());
  assert.ok(actual.every(session => session.completedRounds === 3));
});
