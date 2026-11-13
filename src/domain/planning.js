// IDs only: no retired definitions or execution code. Keep unknown future IDs
// intact so an older installed client cannot erase a newer client's assignment.
const retiredWorkoutIds = new Set([
  'monday-paranoid', 'tuesday-of-spades', 'thursday-bells', 'friday-to-black',
  'oldschool-sailor', 'oldschool-tiger', 'oldschool-eagle',
  'focus-001-upper-abs', 'focus-002-lower-abs', 'hybrid-001-strength-sweat', 'hybrid-002-full-body-engine',
  'demo-hybrid-foundation', 'demo-focus-strength', 'demo-hybrid-flow',
]);
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function filterWorkouts(workouts, query = '', type = '') {
  return workouts.filter(w => !w.archived && w.name.toLowerCase().includes(query.trim().toLowerCase()) && (!type || w.type === type));
}
export function assignWorkout(plan, day, workout) {
  if (!days.includes(day)) throw new Error('Unknown day');
  return { ...plan, [day]: workout ? { workoutId: workout.id, version: workout.version } : null };
}
export function validatePlan(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid weekly plan');
  for (const [day, ref] of Object.entries(value)) {
    if (!days.includes(day) || (ref !== null && (!ref || typeof ref !== 'object' || typeof ref.workoutId !== 'string' || !Number.isInteger(ref.version) || ref.version < 1))) throw new Error('Invalid assignment');
  }
  return value;
}

// Read-only projection: retired IDs never enter Today or a cloud merge.
export function cleanWeeklyPlan(plan) {
  validatePlan(plan);
  return Object.fromEntries(Object.entries(plan).map(([day, ref]) => [day, ref && !retiredWorkoutIds.has(ref.workoutId) ? ref : null]));
}
