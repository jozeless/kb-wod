// Preferences only: separate keys avoid rewriting plans, definitions or session results.
export function weightKey(workout, exercise) {
  return `kb2.weight-preference.v1:${encodeURIComponent(workout.id)}:${workout.version}:${encodeURIComponent(exercise.id)}`;
}
export function parseWeight(raw) {
  if (typeof raw !== 'string') throw new Error('Enter a valid weight.');
  if (raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error('Enter zero or a positive weight in kg.');
  return value;
}
export function readWeight(storage, workout, exercise) {
  const raw = storage.getItem(weightKey(workout, exercise));
  if (raw === null) return '';
  const value = JSON.parse(raw);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Stored weight is invalid. It has been preserved.');
  return String(value);
}
export function writeWeight(storage, workout, exercise, raw) {
  const value = parseWeight(raw);
  const key = weightKey(workout, exercise);
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(value));
}
