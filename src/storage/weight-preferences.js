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
  // New session-weight schema reserves null as an explicit cleared preference.
  if (value === null && ['weights-finisher-v1', 'tuesday-weights-rounds-v1'].includes(workout.execution?.schema)) return '';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Stored weight is invalid. It has been preserved.');
  return String(value);
}
export function writeWeight(storage, workout, exercise, raw) {
  const value = parseWeight(raw);
  const key = weightKey(workout, exercise);
  if (value === null && !['weights-finisher-v1', 'tuesday-weights-rounds-v1'].includes(workout.execution?.schema)) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(value));
}

// A missing new-version preference may use a declared, read-only source. An
// explicitly cleared (JSON null) preference never reimports an older weight.
export function readWeightPreference(storage, workout, exercise) {
  const current=readWeight(storage,workout,exercise),source=workout.weightPreferenceSource;
  return source?.exerciseIds.includes(exercise.id) && storage.getItem(weightKey(workout,exercise))===null
    ? readWeight(storage,{id:workout.id,version:source.version},exercise) : current;
}
