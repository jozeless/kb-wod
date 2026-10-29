import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeProgress, completedSessions, monthlyOverview, trainingDate, shiftMonth, dateKey } from '../src/domain/progress-analytics.js';
import { canReadLocal, setUserId } from '../src/cloud/identity.js';
import { savedRecord, progressRecords } from './helpers/progress-records.js';
const month = {year: 2026, month: 10};
const analyze = (records, selected = month) => analyzeProgress(records, selected, canReadLocal);
function inZone(zone, run) { const previous = process.env.TZ; process.env.TZ = zone; try { run(); } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; } }

test('monthly counts use startedAt, distinguish same-day workouts, days and calendar weeks, and remain read-only', () => {
  const records = progressRecords(), before = structuredClone(records), result = analyze(records);
  assert.equal(result.month.workouts, 5); assert.equal(result.month.activeDays, 4); assert.equal(result.month.activeWeeks, 2);
  assert.equal(result.month.activeDurationMs, 6210000); assert.equal(result.month.durationSessions, 5);
  assert.deepEqual(result.month.weeks.map(w => w.trainedDays), [0, 1, 3, 0, 0]);
  assert.deepEqual(records, before);
  const completedAtElsewhere = savedRecord({startedAt: '2026-09-30T12:00:00Z'}); completedAtElsewhere.completedAt = '2026-10-01T12:00:00Z';
  assert.equal(analyze([completedAtElsewhere]).month.workouts, 0);
});
test('Gregorian leap years, month boundaries and Monday–Sunday calendar grouping', () => {
  inZone('UTC', () => {
    const leap = analyze([], {year: 2024, month: 2}).month;
    assert.equal(leap.weeks.flatMap(w => w.days.filter(Boolean)).length, 29);
    assert.equal(analyze([], {year: 2100, month: 2}).month.weeks.flatMap(w => w.days.filter(Boolean)).length, 28);
    const records = ['2024-02-01T00:00:00Z', '2024-02-04T23:59:59Z', '2024-02-05T00:00:00Z', '2024-02-29T23:59:59Z', '2024-03-01T00:00:00Z'].map((startedAt, i) => savedRecord({id: String(i), startedAt}));
    const overview = analyze(records, {year: 2024, month: 2}).month;
    assert.equal(overview.workouts, 4); assert.equal(overview.activeWeeks, 3);
    assert.equal(overview.weeks[0].start, '2024-01-29'); assert.equal(overview.weeks[0].trainedDays, 2);
    assert.equal(overview.weeks[1].days[0].date, '2024-02-05');
    assert.deepEqual(shiftMonth({year: 2026, month: 1}, -1), {year: 2025, month: 12});
    assert.deepEqual(shiftMonth({year: 2026, month: 12}, 1), {year: 2027, month: 1});
  });
});
test('explicit timestamps are parsed safely without date rollover, ambiguous dates, nulls or numeric coercion', () => {
  for (const value of [null, undefined, 0, '', 'bad', '2024-02-30T12:00:00Z', '2023-02-29T12:00:00Z', '2026-13-01T12:00:00Z', '2026-10-00T12:00:00Z', '2026-10-01T24:00:00Z', '2026-10-01', '2026-10-01T12:00:00', '2026-10-01T12:00:00+24:00']) assert.equal(trainingDate(value), null, String(value));
  assert.ok(trainingDate('2024-02-29T23:59:59.123+01:00')); assert.ok(trainingDate('2026-10-29T12:00:00.123456Z')); assert.ok(trainingDate('2026-10-29T12:00:00Z'));
  assert.equal(analyze([{...savedRecord(), startedAt: 'bad'}]).month.workouts, 0);
});
test('local month grouping respects UTC offsets, daylight-saving folds and gaps, Monday starts and skipped-date zones', () => {
  inZone('Europe/Amsterdam', () => {
    const records = ['2026-09-30T22:30:00Z', '2026-10-25T02:30:00+02:00', '2026-10-25T02:30:00+01:00', '2026-10-25T23:30:00Z', '2026-10-31T23:30:00Z'].map((startedAt, i) => savedRecord({id: String(i), startedAt}));
    const result = analyze(records); assert.equal(result.month.workouts, 4); assert.equal(result.month.activeDays, 3); assert.equal(result.month.activeWeeks, 3);
    assert.equal(result.month.weeks.at(-1).start, '2026-10-26'); assert.equal(result.month.weeks.at(-1).trainedDays, 1);
    const march = analyze(['2026-03-29T01:30:00+01:00', '2026-03-29T03:30:00+02:00'].map((startedAt, i) => savedRecord({id: String(i), startedAt})), {year: 2026, month: 3});
    assert.equal(march.month.activeDays, 1); assert.equal(march.month.activeWeeks, 1);
  });
  inZone('America/New_York', () => assert.equal(analyze([savedRecord({startedAt: '2026-10-01T00:30:00Z'})]).month.workouts, 0));
  inZone('Pacific/Apia', () => { const overview = monthlyOverview([], {year: 2011, month: 12}); const keys = overview.weeks.flatMap(w => w.days.filter(Boolean).map(d => d.date)); assert.equal(new Set(keys).size, keys.length); });
});
test('duplicate IDs and drafts never inflate counts, durations, weights or recorded performance', () => {
  const record = savedRecord({weight: 12, reps: 17}), draft = {...record, id: 'draft', status: 'draft'}, rows = [record, structuredClone(record), draft, {...record, id: ''}, {...record, id: undefined}];
  const result = analyze(rows); assert.equal(result.month.workouts, 1); assert.equal(result.month.activeDurationMs, 1270000);
  assert.equal(result.strength[0].points.length, 1); assert.equal(result.performance[0].total, 17);
});
test('existing guest/account ownership policy is applied before deduplication including imported sessions and sign-out', () => {
  const rows = [savedRecord({id: 'guest'}), savedRecord({id: 'alice', ownerId: 'A', weight: 12, reps: 17}), savedRecord({id: 'bob', ownerId: 'B', weight: 24, reps: 99})];
  try {
    setUserId(null); assert.equal(analyze(rows).month.workouts, 1); assert.equal(analyze(rows).strength.length, 0);
    setUserId('A'); const result = analyze(rows); assert.equal(result.month.workouts, 2); assert.equal(result.performance[0].total, 17); assert.equal(result.strength[0].maximum, 12);
    setUserId('B'); assert.equal(analyze(rows).performance[0].total, 99);
    const conflict = [{...rows[2], id: 'guest'}, rows[0]]; setUserId(null); assert.equal(analyze(conflict).month.workouts, 1);
    assert.equal(analyzeProgress(rows, month).month.workouts, 0); // no policy defaults to no access
  } finally { setUserId(null); }
});
test('missing, non-numeric or invalid durations remain unknown rather than artificial zero measurements', () => {
  const invalid = [null, undefined, '', '1200000', -1, NaN, Infinity, false];
  const rows = invalid.map((value, i) => ({...savedRecord({id: String(i)}), activeDurationMs: value}));
  const result = analyze(rows).month; assert.equal(result.workouts, invalid.length); assert.equal(result.activeDurationMs, null); assert.equal(result.durationSessions, 0);
  const valid = analyze([...rows, {...savedRecord({id: 'zero'}), activeDurationMs: 0}, {...savedRecord({id: 'fraction'}), activeDurationMs: 1500}]).month;
  assert.equal(valid.activeDurationMs, 1500); assert.equal(valid.durationSessions, 2); assert.equal(valid.missingDurations, invalid.length);
});
test('all saved historical result schemas produce actual weights without reading preferences, form defaults or target loads', () => {
  for (const [workoutId, version] of [['focus-001-upper-abs', 2], ['hybrid-001-strength-sweat', 2], ['focus-002-lower-abs', 1], ['hybrid-002-full-body-engine', 1], ['monday-paranoid', 1], ['monday-paranoid', 2], ['monday-paranoid', 3], ['tuesday-of-spades', 1], ['thursday-bells', 1], ['friday-to-black', 1]]) {
    const record = savedRecord({workoutId, version, weight: 12.5});
    const result = analyze([record]); assert.ok(result.strength.length > 0, `${workoutId} v${version}`);
    for (const series of result.strength) { assert.equal(series.current, 12.5); assert.equal(series.points.length, 1); }
    record.results = {}; assert.equal(analyze([record]).strength.length, 0, 'raw form weights never used');
  }
});
test('weight validity preserves explicit zero, decimals, same-day measurements, latest and maximum, while rejecting malformed entries', () => {
  const rows = [savedRecord({id: 'old', weight: 16}), savedRecord({id: 'new', weight: 12.5, startedAt: '2026-10-05T16:00:00Z'}), savedRecord({id: 'zero', weight: 0, startedAt: '2026-10-12T12:00:00Z'})];
  const result = analyze(rows), series = result.strength.find(s => s.exerciseId === 'push-press');
  assert.deepEqual(series.points.map(p => p.weightKg), [16, 12.5, 0]); assert.equal(series.current, 0); assert.equal(series.maximum, 16);
  for (const invalid of [null, undefined, '', '12', false, -1, NaN, Infinity]) { const record = savedRecord(); record.results.exerciseWeights = {'push-press': invalid}; assert.equal(analyze([record]).strength.length, 0); }
});
test('equivalent same-ID historical phases align across versions; different IDs, workouts, and measurements in separate phases remain separate', () => {
  const old = savedRecord({id: 'old', version: 2, weight: 8}), current = savedRecord({id: 'new', weight: 16, startedAt: '2026-10-12T12:00:00Z'});
  let result = analyze([old, current]); assert.equal(result.strength.find(s => s.exerciseId === 'push-press').points.length, 2);
  const custom = structuredClone(old); custom.id = 'custom'; custom.workoutSnapshot.phases.push({id: 'extra', name: 'Extra', exerciseIds: ['push-press']}); custom.results.extra = [{exerciseId: 'push-press', weightKg: 24}];
  result = analyze([custom]); assert.equal(result.strength.filter(s => s.exerciseId === 'push-press').length, 2);
  const renamed = structuredClone(current); renamed.id = 'renamed'; const exercise = renamed.workoutSnapshot.exercises.find(ex => ex.id === 'push-press'); exercise.id = 'different-press';
  renamed.workoutSnapshot.phases[0].exerciseIds[0] = 'different-press'; renamed.results.exerciseWeights['different-press'] = 20;
  result = analyze([current, renamed]); assert.equal(result.strength.filter(s => ['push-press', 'different-press'].includes(s.exerciseId)).length, 2);
  const ambiguous = structuredClone(custom); ambiguous.results = {exerciseWeights: {'push-press': 20}, ...custom.results};
  assert.equal(analyze([ambiguous]).strength.filter(s => s.exerciseId === 'push-press').length, 3);
  const foreignSnapshot = {...current, workoutId: 'different-workout'}; assert.equal(analyze([foreignSnapshot]).strength.length, 0);
});
test('only explicit current-schema finisher reps, steps, final-set arm reps and circuit-specific full rounds are summed', () => {
  const rows = progressRecords(), result = analyze(rows), totals = result.performance;
  assert.equal(totals.length, 6); assert.equal(totals.find(t => t.label.includes('Thruster')).total, 37);
  assert.equal(totals.find(t => t.unit === 'steps').total, 61);
  assert.equal(totals.find(t => t.label.includes('left arm')).total, 6); assert.equal(totals.find(t => t.label.includes('right arm')).total, 5);
  assert.equal(totals.find(t => t.label.startsWith('Tuesday')).total, 3); assert.equal(totals.find(t => t.label.startsWith('Friday') && t.unit === 'rounds').total, 4);
  assert.ok(totals.find(t => t.label.startsWith('Tuesday')).label.includes('Hollow-Ups'));
  assert.ok(totals.find(t => t.label.startsWith('Friday') && t.unit === 'rounds').label.includes('Burpees'));
});
test('performance totals never infer repetitions from duration, prescribed targets, rounds or defaults; zero remains a recorded count', () => {
  const empty = progressRecords().map(r => ({...r, results: {}})); assert.equal(analyze(empty).performance.length, 0);
  const old = savedRecord({workoutId: 'hybrid-001-strength-sweat', version: 2, weight: 12, rounds: 4}); assert.equal(analyze([old]).performance.length, 0);
  const monday = savedRecord({reps: 0}); assert.equal(analyze([monday]).performance[0].total, 0);
  for (const value of [null, '', '17', -1, 1.5, Infinity, NaN, undefined, false]) { monday.results.finisher.reps = value; assert.equal(analyze([monday]).performance.length, 0); }
  const friday = savedRecord({workoutId: 'friday-to-black', left: 6});
  assert.equal(analyze([friday]).performance.length, 1); friday.results.keyExercise.referenceSet = 'all'; assert.equal(analyze([friday]).performance.length, 0);
});
test('ambiguous count definitions are excluded or kept in distinct circuit series instead of combined', () => {
  const a = savedRecord({id: 'a', workoutId: 'tuesday-of-spades', rounds: 3}), b = structuredClone(a); b.id = 'b';
  for (const ex of b.workoutSnapshot.exercises) if (ex.target) ex.target = Object.fromEntries(Object.entries(ex.target).reverse());
  assert.equal(analyze([a, b]).performance.length, 1, 'JSONB property order does not change an equivalent circuit');
  assert.equal(analyze([a, b]).performance[0].total, 6);
  b.workoutSnapshot.exercises.find(ex => ex.id === 'thrusters').target.min = 9;
  assert.equal(analyze([a, b]).performance.length, 2);
  b.results.finisher.phaseId = 'missing'; assert.equal(analyze([b]).performance.length, 0);
  const monday = savedRecord({reps: 20}); monday.results.finisher.exerciseId = 'different-thruster'; assert.equal(analyze([monday]).performance.length, 0);
});
test('malformed or mismatched snapshot identities cannot mislabel recorded measurements', () => {
  for (const change of [r => { r.workoutSnapshot.version = 99; }, r => { r.workoutSnapshot.phases[0] = null; }, r => { r.workoutSnapshot.exercises[0] = null; }, r => { r.workoutSnapshot.exercises.push(r.workoutSnapshot.exercises[0]); }]) {
    const record = savedRecord({weight: 12, reps: 17}); change(record);
    const result = analyze([record]); assert.equal(result.month.workouts, 1); assert.equal(result.strength.length, 0); assert.equal(result.performance.length, 0);
  }
});
test('Progress CSS is scoped and dependency-free; new resources are precached with the existing activation strategy', () => {
  const css = fs.readFileSync(new URL('../styles/hm-progress.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m => m[1].trim().split(/,(?![^()]*\))/));
  assert.ok(selectors.length > 25); assert.ok(selectors.every(s => s.trim().startsWith('.hm-progress')));
  assert.ok(!/@import|@font-face|url\(/.test(css));
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  for (const path of ['src/domain/progress-analytics.js', 'src/ui/progress.js', 'styles/hm-progress.css']) assert.ok(sw.includes(`'./${path}'`));
  assert.match(sw, /kb2-static-v30/); assert.ok(!/skipWaiting|clients\.claim/.test(sw));
});
