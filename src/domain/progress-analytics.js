// Read-only projections. Dates and numbers are accepted only from final saved records.
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = value => number(value) && Number.isSafeInteger(value);
const pad = value => String(value).padStart(2, '0');
// JSONB downloads may reorder object keys; equivalent definitions must still align.
const definitionKey = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
function civilDate(year, month, day) {
  const date = new Date(0); date.setUTCFullYear(year, month - 1, day); date.setUTCHours(12, 0, 0, 0); return date;
}
export function trainingDate(value) {
  // Saved sessions use explicit ISO instants; reject ambiguous date-only/local strings
  // and impossible dates that Date.parse would otherwise silently roll into March.
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min, sec, zone] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > civilDate(year, month + 1, 0).getUTCDate() || +h > 23 || +min > 59 || +sec > 59) return null;
  if (zone !== 'Z' && (+zone.slice(1, 3) > 23 || +zone.slice(4) > 59)) return null;
  const date = new Date(value); return Number.isFinite(date.getTime()) ? date : null;
}
export function shiftMonth({year, month}, delta) {
  const date = civilDate(year, month + delta, 1); return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1};
}
const civilKey = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
function monday(date) {
  const result = new Date(date); result.setUTCDate(result.getUTCDate() - (result.getUTCDay() + 6) % 7); return result;
}
export function completedSessions(records, canRead = () => false) {
  const seen = new Set(), result = [];
  for (const record of records) {
    if (!record || record.status !== 'completed' || !canRead(record) || typeof record.id !== 'string' || !record.id.trim()) continue;
    if (seen.has(record.id)) continue;
    const date = trainingDate(record.startedAt); if (!date) continue;
    seen.add(record.id); result.push({record, date, day: dateKey(date)});
  }
  return result.sort((a, b) => a.date - b.date || a.record.id.localeCompare(b.record.id));
}
export function monthlyOverview(sessions, {year, month}) {
  const selected = sessions.filter(s => s.date.getFullYear() === year && s.date.getMonth() + 1 === month);
  const days = new Map();
  for (const session of selected) days.set(session.day, (days.get(session.day) || 0) + 1);
  const durations = selected.map(s => s.record.activeDurationMs).filter(number);
  // Local training dates are grouped above. Calendar labels use civil arithmetic,
  // never elapsed 24-hour steps, including zones that have skipped an entire day.
  const start = monday(civilDate(year, month, 1)), last = civilDate(year, month + 1, 0), weeks = [];
  for (const cursor = new Date(start); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const cells = Array.from({length: 7}, (_, i) => {
      const day = civilDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate() + i);
      return day.getUTCFullYear() === year && day.getUTCMonth() + 1 === month ? {date: civilKey(day), day: day.getUTCDate(), workouts: days.get(civilKey(day)) || 0} : null;
    });
    weeks.push({start: civilKey(cursor), days: cells, trainedDays: cells.filter(day => day?.workouts > 0).length});
  }
  return {workouts: selected.length, activeDays: days.size, activeWeeks: weeks.filter(w => w.trainedDays > 0).length,
    activeDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) : null, durationSessions: durations.length,
    missingDurations: selected.length - durations.length, weeks};
}
function snapshot(record) {
  const workout = record.workoutSnapshot;
  if (!workout || workout.id !== record.workoutId || workout.version !== record.workoutVersion || typeof workout.name !== 'string' ||
      !Array.isArray(workout.exercises) || !Array.isArray(workout.phases)) return null;
  if (!workout.exercises.every(ex => ex && typeof ex.id === 'string' && ex.id && typeof ex.name === 'string') ||
      !workout.phases.every(p => p && typeof p.id === 'string' && Array.isArray(p.exerciseIds)) ||
      new Set(workout.exercises.map(ex => ex.id)).size !== workout.exercises.length ||
      new Set(workout.phases.map(p => p.id)).size !== workout.phases.length) return null;
  return workout;
}
export function strengthSeries(sessions) {
  const groups = new Map();
  for (const {record, date, day} of sessions) {
    const workout = snapshot(record); if (!workout) continue;
    const exercises = new Map(workout.exercises.filter(ex => typeof ex?.id === 'string' && typeof ex.name === 'string').map(ex => [ex.id, ex]));
    const add = (exerciseId, weightKg, phase) => {
      const exercise = exercises.get(exerciseId);
      if (!exercise || exercise.equipment === 'bodyweight' || !number(weightKg)) return;
      const phases = workout.phases.filter(p => p.exerciseIds?.includes(exerciseId));
      if (!phases.length || (phase && !phases.includes(phase))) return;
      // Single-phase maps align with equivalent older per-phase records. A whole-
      // workout map spanning several phases stays separate from individual phases.
      const resolved = phase || (phases.length === 1 ? phases[0] : null);
      const key = JSON.stringify([workout.id, exerciseId, resolved?.id || null, exercise.equipment || null, exercise.target?.unit || null]);
      if (!groups.has(key)) groups.set(key, {key, exerciseId, workoutId: workout.id, phaseId: resolved?.id || null,
        label: `${exercise.name} · ${workout.name} · ${resolved?.name || 'Whole workout'}`, points: []});
      groups.get(key).points.push({sessionId: record.id, workoutVersion: record.workoutVersion, startedAt: record.startedAt,
        timestamp: date.getTime(), day, weightKg});
    };
    if (record.results?.exerciseWeights && typeof record.results.exerciseWeights === 'object' && !Array.isArray(record.results.exerciseWeights)) {
      for (const [id, value] of Object.entries(record.results.exerciseWeights)) add(id, value);
    }
    for (const phase of workout.phases) {
      const block = record.results?.[phase.id];
      const rows = Array.isArray(block) ? block : Array.isArray(block?.exercises) ? block.exercises : [];
      // A duplicate row with the same identity is ambiguous: keep the first actual
      // measurement, rather than counting it twice. Distinct phases remain distinct.
      const seen = new Set();
      for (const row of rows) {
        if (!row || seen.has(row.exerciseId) || !number(row.weightKg)) continue;
        seen.add(row.exerciseId); add(row.exerciseId, row.weightKg, phase);
      }
    }
  }
  return [...groups.values()].map(series => {
    const seen = new Set();
    const points = series.points.filter(point => { if (seen.has(point.sessionId)) return false; seen.add(point.sessionId); return true; });
    return {...series, points, current: points.at(-1).weightKg, maximum: points.reduce((maximum, p) => Math.max(maximum, p.weightKg), 0)};
  }).sort((a, b) => a.label.localeCompare(b.label));
}
export function performanceTotals(sessions) {
  const totals = new Map();
  for (const {record} of sessions) {
    const workout = snapshot(record), results = record.results;
    if (!workout || !results) continue;
    const schema = workout.execution?.schema, phase = workout.phases.at(-1);
    const exercise = id => workout.exercises.find(ex => ex.id === id);
    const add = (field, value, unit, label, definition) => {
      if (!count(value)) return;
      const key = definitionKey([workout.id, schema, field, definition]);
      if (!totals.has(key)) totals.set(key, {key, label, unit, total: 0, measurements: 0});
      const metric = totals.get(key); metric.total += value; metric.measurements++;
    };
    if (schema === 'weights-finisher-v1' && workout.id === 'monday-paranoid' && phase?.format === 'amrap-reps' &&
        results.finisher?.exerciseId === 'thruster' && phase.exerciseIds?.includes('thruster') && exercise('thruster')) {
      add('finisher.reps', results.finisher.reps, 'reps', `${workout.name} · ${exercise('thruster').name} finisher`, ['thruster', phase.durationSeconds, exercise('thruster').equipment, exercise('thruster').target]);
    }
    if (schema === 'thursday-weights-steps-v1' && workout.id === 'thursday-bells' && phase?.format === 'timed-sides' &&
        results.finisher?.exerciseId === 'suitcase-high-knee-march' && phase.exerciseIds?.includes('suitcase-high-knee-march') && exercise('suitcase-high-knee-march')) {
      add('finisher.totalSteps', results.finisher.totalSteps, 'steps', `${workout.name} · ${exercise('suitcase-high-knee-march').name} finisher`, ['suitcase-high-knee-march', phase.durationSeconds, exercise('suitcase-high-knee-march').equipment]);
    }
    const friday = schema === 'friday-weights-floorpress-rounds-v1' && workout.id === 'friday-to-black';
    if (friday && results.keyExercise?.exerciseId === 'alternating-floor-press' && results.keyExercise.referenceSet === 'final' && exercise('alternating-floor-press')) {
      for (const side of ['left', 'right']) add(`keyExercise.${side}Reps`, results.keyExercise[`${side}Reps`], 'reps',
        `${workout.name} · Floor Press final set · ${side} arm`, ['alternating-floor-press', 'final', side, exercise('alternating-floor-press').equipment, exercise('alternating-floor-press').target]);
    }
    if ((friday || (schema === 'tuesday-weights-rounds-v1' && workout.id === 'tuesday-of-spades')) &&
        phase?.format === 'amrap' && results.finisher?.phaseId === phase.id && phase.exerciseIds?.length && phase.exerciseIds.every(id => exercise(id))) {
      const circuit = phase.exerciseIds.map(id => {
        const ex = exercise(id); return {id, target: ex.target || null, equipment: ex.equipment || null};
      });
      const circuitLabel = phase.exerciseIds.map(id => {
        const ex = exercise(id), target = ex.target;
        const range = count(target?.min) && count(target?.max) ? (target.min === target.max ? target.min : `${target.min}–${target.max}`) : null;
        return `${range === null ? '' : `${range} × `}${ex.name}`;
      }).join(' / ');
      const label = `${workout.name} · ${phase.name} · ${circuitLabel} · complete rounds`;
      add('finisher.fullRounds', results.finisher.fullRounds, 'rounds', label, [phase.id, phase.durationSeconds, circuit]);
    }
  }
  return [...totals.values()];
}
export function analyzeProgress(records, month, canRead) {
  const sessions = completedSessions(records, canRead);
  return {month: monthlyOverview(sessions, month), strength: strengthSeries(sessions), performance: performanceTotals(sessions)};
}
