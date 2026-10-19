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
