import { isAvailableSession } from '../data/catalog.js';
// Read-only projections. Dates and numbers are accepted only from final saved records.
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const pad = value => String(value).padStart(2, '0');
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
    if (!record || record.status !== 'completed' || !isAvailableSession(record) || !canRead(record) || typeof record.id !== 'string' || !record.id.trim()) continue;
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
export function analyzeProgress(records, month, canRead) {
  return {month: monthlyOverview(completedSessions(records, canRead), month)};
}
